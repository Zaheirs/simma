/* Lapisan akses data Tahap 1. Semua query dibatasi (limit/filter) agar hemat kuota Firestore Spark (PRD §6.2–6.3). */
import {
  addDoc, collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp,
  setDoc, updateDoc, where, writeBatch, type DocumentData, type QueryConstraint,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { AcademicYear, AuditLog, Guardian, GuardianLink, LinkStatus, SchoolClass, SchoolSettings, Staff, Student, Subject, UserProfile } from '../lib/types';
import type { RoleKey } from '../lib/rbac';

const withId = <T,>(d: { id: string; data: () => DocumentData }) => ({ id: d.id, ...d.data() }) as T;
async function list<T>(path: string, ...q: QueryConstraint[]): Promise<T[]> {
  const s = await getDocs(query(collection(db, path), ...q));
  return s.docs.map((d) => withId<T>(d));
}

/* ---------- Jejak audit (PRD §6.1) ---------- */
let actorNama = '';
export function setActorNama(n: string) { actorNama = n; }
export async function audit(aksi: string, koleksi: string, docId: string, extra: { sebelum?: unknown; sesudah?: unknown; alasan?: string } = {}) {
  const u = auth.currentUser;
  if (!u) return;
  try {
    await addDoc(collection(db, 'audit_logs'), { actorUid: u.uid, actorNama: actorNama || u.email, aksi, koleksi, docId, ...clean(extra), waktu: serverTimestamp() });
  } catch (e) { console.warn('Audit gagal dicatat', e); }
}
function clean<T extends object>(o: T): T { return JSON.parse(JSON.stringify(o)); }

/* ---------- Tahun pelajaran, kelas, mapel ---------- */
export const getYears = () => list<AcademicYear>('academic_years', orderBy('nama', 'desc'), limit(20));
export async function getActiveYear(): Promise<AcademicYear | null> {
  const r = await list<AcademicYear>('academic_years', where('isActive', '==', true), limit(1));
  return r[0] || null;
}
export const getClasses = (yearId: string) => list<SchoolClass>('classes', where('academicYearId', '==', yearId), orderBy('nama'), limit(60));
export const getSubjects = () => list<Subject>('subjects', orderBy('kode'), limit(100));

export async function saveYear(y: AcademicYear, isNew: boolean) {
  const { id, ...data } = y;
  if (data.isActive) {
    // Hanya satu tahun pelajaran yang aktif.
    const b = writeBatch(db);
    (await getYears()).filter((x) => x.isActive && x.id !== id).forEach((x) => b.update(doc(db, 'academic_years', x.id), { isActive: false }));
    b.set(doc(db, 'academic_years', id), data, { merge: true });
    await b.commit();
  } else await setDoc(doc(db, 'academic_years', id), data, { merge: true });
  await audit(isNew ? 'tambah_tahun_pelajaran' : 'ubah_tahun_pelajaran', 'academic_years', id, { sesudah: data });
}
export async function saveClass(c: SchoolClass, isNew: boolean) {
  const { id, ...data } = c;
  if (isNew && (await getDoc(doc(db, 'classes', id))).exists()) throw new Error(`Kelas ${c.nama} sudah ada di tahun pelajaran ini.`);
  await setDoc(doc(db, 'classes', id), data, { merge: true });
  await audit(isNew ? 'tambah_kelas' : 'ubah_kelas', 'classes', id, { sesudah: data });
}
export async function saveSubject(s: Subject, isNew: boolean) {
  const { id, ...data } = s;
  if (isNew && (await getDoc(doc(db, 'subjects', id))).exists()) throw new Error(`Kode mapel ${s.kode} sudah dipakai.`);
  await setDoc(doc(db, 'subjects', id), data, { merge: true });
  await audit(isNew ? 'tambah_mapel' : 'ubah_mapel', 'subjects', id, { sesudah: data });
}

/* ---------- Siswa ---------- */
export const getStudents = (archived: boolean) => list<Student>('students', where('archived', '==', archived), orderBy('nama'), limit(500));
export const getStudentsByClass = (classId: string) => list<Student>('students', where('classId', '==', classId), orderBy('nama'), limit(60));
export async function getStudent(nis: string): Promise<Student | null> {
  const s = await getDoc(doc(db, 'students', nis));
  return s.exists() ? withId<Student>(s) : null;
}
export async function getEnrollments(studentId: string) {
  return list<{ id: string; classId: string; academicYearId: string; status: string; className?: string }>('enrollments', where('studentId', '==', studentId), limit(20));
}
/** Kelas yang boleh dilihat guru (dari class_access) atau wali kelas (dari classes.waliKelasUid). */
export async function myClassIds(role: RoleKey, uid: string, yearId: string): Promise<string[]> {
  if (role === 'wali_kelas') return (await list<SchoolClass>('classes', where('waliKelasUid', '==', uid), where('academicYearId', '==', yearId), limit(10))).map((c) => c.id);
  if (role === 'guru') return (await list<{ id: string; classId: string }>('class_access', where('uid', '==', uid), limit(40))).map((c) => c.classId).filter((c) => c.startsWith(yearId));
  return [];
}

type StudentInput = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'archived' | 'status'> & { status?: Student['status'] };

/** Simpan siswa dalam satu transaksi: NIS = ID dokumen (unik), NISN/NISM dijaga lewat koleksi uniques. */
export async function saveStudent(input: StudentInput, existing: Student | null) {
  const nis = input.nis.trim();
  const ref = doc(db, 'students', nis);
  await runTransaction(db, async (tx) => {
    const cur = await tx.get(ref);
    if (!existing && cur.exists()) throw new Error(`NIS ${nis} sudah digunakan oleh siswa "${cur.data().nama}".`);
    // Transaksi Firestore: semua pembacaan wajib selesai sebelum penulisan pertama.
    const changes = (['nisn', 'nism'] as const)
      .map((k) => ({ k, baru: (input[k] || '').trim(), lama: (existing?.[k] || '').trim() }))
      .filter((c) => c.baru !== c.lama);
    for (const c of changes) {
      if (!c.baru) continue;
      const u = await tx.get(doc(db, 'uniques', `${c.k}_${c.baru}`));
      if (u.exists() && u.data().studentId !== nis) throw new Error(`${c.k.toUpperCase()} ${c.baru} sudah dipakai siswa lain.`);
    }
    for (const c of changes) {
      if (c.baru) tx.set(doc(db, 'uniques', `${c.k}_${c.baru}`), { studentId: nis });
      if (c.lama) tx.delete(doc(db, 'uniques', `${c.k}_${c.lama}`));
    }
    const data = clean({ ...input, nis, updatedAt: null }) as DocumentData;
    data.updatedAt = serverTimestamp();
    if (existing) tx.update(ref, data);
    else tx.set(ref, { ...data, status: 'aktif', archived: false, createdAt: serverTimestamp() });
    if (input.classId && input.academicYearId && (!existing || existing.classId !== input.classId)) {
      tx.set(doc(db, 'enrollments', `${input.academicYearId}_${nis}`), { studentId: nis, classId: input.classId, className: input.className || '', academicYearId: input.academicYearId, status: 'aktif' }, { merge: true });
    }
  });
  await audit(existing ? 'ubah_siswa' : 'tambah_siswa', 'students', nis, { sebelum: existing ? pick(existing) : undefined, sesudah: pick(input) });
}
const pick = (s: Partial<Student>) => ({ nama: s.nama, nisn: s.nisn, nism: s.nism, classId: s.classId, alamat: s.alamat, jk: s.jk });

export async function archiveStudent(s: Student, status: 'lulus' | 'keluar' | 'pindah', alasan: string) {
  await updateDoc(doc(db, 'students', s.id), { archived: true, status, archiveReason: alasan, updatedAt: serverTimestamp() });
  await audit('arsip_siswa', 'students', s.id, { sebelum: { status: s.status }, sesudah: { status }, alasan });
}
export async function restoreStudent(s: Student, alasan: string) {
  await updateDoc(doc(db, 'students', s.id), { archived: false, status: 'aktif', archiveReason: '', updatedAt: serverTimestamp() });
  await audit('pulihkan_siswa', 'students', s.id, { sebelum: { status: s.status }, sesudah: { status: 'aktif' }, alasan });
}
export async function setStudentPhoto(nis: string, fileId: string) {
  await updateDoc(doc(db, 'students', nis), { fotoFileId: fileId, updatedAt: serverTimestamp() });
  await audit('ganti_foto_siswa', 'students', nis, { sesudah: { fotoFileId: fileId } });
}

/* ---------- Guru & tendik ---------- */
export const getStaff = () => list<Staff>('staff', orderBy('nama'), limit(200));
export async function saveStaff(s: Omit<Staff, 'id'> & { id?: string }) {
  const { id, ...data } = s;
  if (id) { await updateDoc(doc(db, 'staff', id), clean(data)); await audit('ubah_guru', 'staff', id, { sesudah: data }); return id; }
  const r = await addDoc(collection(db, 'staff'), { ...clean(data), createdAt: serverTimestamp() });
  await audit('tambah_guru', 'staff', r.id, { sesudah: data });
  return r.id;
}

/* ---------- Orang tua / wali & relasi ---------- */
export const getGuardians = () => list<Guardian>('guardians', orderBy('nama'), limit(400));
export async function saveGuardian(g: Omit<Guardian, 'id'> & { id?: string }) {
  const { id, ...data } = g;
  if (id) { await updateDoc(doc(db, 'guardians', id), clean(data)); await audit('ubah_wali', 'guardians', id, { sesudah: data }); return id; }
  const r = await addDoc(collection(db, 'guardians'), { ...clean(data), userUid: data.userUid || null, createdAt: serverTimestamp() });
  await audit('tambah_wali', 'guardians', r.id, { sesudah: data });
  return r.id;
}
export const getLinks = (status: LinkStatus) => list<GuardianLink>('guardian_links', where('status', '==', status), orderBy('createdAt', 'desc'), limit(200));
export const getLinksOfStudent = (studentId: string) => list<GuardianLink>('guardian_links', where('studentId', '==', studentId), limit(10));
export async function createLink(s: { id: string; nama: string }, g: { id: string; nama: string }, hubungan: string) {
  const id = `${s.id}_${g.id}`;
  if ((await getDoc(doc(db, 'guardian_links', id))).exists()) throw new Error('Relasi ini sudah pernah dibuat.');
  await setDoc(doc(db, 'guardian_links', id), {
    studentId: s.id, studentName: s.nama, guardianId: g.id, guardianName: g.nama, hubungan, status: 'menunggu',
    createdBy: auth.currentUser!.uid, verifiedBy: null, verifiedAt: null, createdAt: serverTimestamp(),
  });
  await audit('buat_relasi_wali', 'guardian_links', id, { sesudah: { hubungan } });
}
export async function decideLink(l: GuardianLink, status: 'terverifikasi' | 'ditolak', catatan: string) {
  await updateDoc(doc(db, 'guardian_links', l.id), { status, catatan, verifiedBy: auth.currentUser!.uid, verifiedAt: serverTimestamp() });
  await audit(status === 'terverifikasi' ? 'verifikasi_relasi' : 'tolak_relasi', 'guardian_links', l.id, { sebelum: { status: l.status }, sesudah: { status }, alasan: catatan });
}
export async function countPendingLinks() {
  return (await getCountFromServer(query(collection(db, 'guardian_links'), where('status', '==', 'menunggu')))).data().count;
}

/* ---------- Akun ---------- */
export const getUsers = () => list<UserProfile>('users', orderBy('nama'), limit(400)).then((r) => r.map((u) => ({ ...u, uid: (u as unknown as { id: string }).id })));
export async function saveUserProfile(uid: string, data: Partial<UserProfile>, isNew: boolean, before?: Partial<UserProfile>) {
  const payload = clean({ ...data, uid: undefined }) as DocumentData;
  payload.updatedAt = serverTimestamp();
  if (isNew) payload.createdAt = serverTimestamp();
  await setDoc(doc(db, 'users', uid), payload, { merge: true });
  await audit(isNew ? 'buat_akun' : 'ubah_akun', 'users', uid, { sebelum: before ? { roles: before.roles, status: before.status } : undefined, sesudah: { roles: data.roles, status: data.status } });
}

/* ---------- Pengaturan ---------- */
export async function getSettings(): Promise<SchoolSettings | null> {
  const s = await getDoc(doc(db, 'settings', 'school'));
  return s.exists() ? (s.data() as SchoolSettings) : null;
}
export async function saveSettings(s: SchoolSettings, before: SchoolSettings | null) {
  await setDoc(doc(db, 'settings', 'school'), clean(s), { merge: true });
  await audit('ubah_identitas_madrasah', 'settings', 'school', { sebelum: before, sesudah: s });
}

/* ---------- Audit & statistik ---------- */
export const getAudit = (koleksi?: string) =>
  list<AuditLog>('audit_logs', ...(koleksi ? [where('koleksi', '==', koleksi)] : []), orderBy('waktu', 'desc'), limit(100));

/** Hitungan untuk dashboard memakai agregasi count (1 baca per 1.000 dokumen) — tanpa memuat seluruh data. */
export async function countOf(path: string, ...q: QueryConstraint[]) {
  return (await getCountFromServer(query(collection(db, path), ...q))).data().count;
}

export async function logImport(jenis: string, ok: number, gagal: number) {
  await addDoc(collection(db, 'import_export_logs'), { actorUid: auth.currentUser!.uid, jenis, berhasil: ok, gagal, waktu: serverTimestamp() });
}

export { where };
