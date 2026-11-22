/* Uji Security Rules dengan Firebase Emulator memakai akun simulasi setiap peran (PRD §3.7 & §8.3).
 * Jalankan: npm run test:rules   (perlu Java 11+ terpasang untuk emulator)
 * Syarat lulus: SEMUA tes hijau, termasuk kasus yang harus DITOLAK. Data di sini fiktif. */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, addDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const C4A = '2026-2027_4A';
const C4B = '2026-2027_4B';

const USERS: Record<string, Record<string, unknown>> = {
  u_super: { nama: 'Simulasi Super Admin', roles: ['super_admin'], status: 'aktif' },
  u_kepala: { nama: 'Simulasi Kepala', roles: ['kepala'], status: 'aktif' },
  u_operator: { nama: 'Simulasi Operator', roles: ['operator'], status: 'aktif' },
  u_tu: { nama: 'Simulasi TU', roles: ['tu'], status: 'aktif' },
  u_bendahara: { nama: 'Simulasi Bendahara', roles: ['bendahara'], status: 'aktif' },
  u_guru: { nama: 'Simulasi Guru', roles: ['guru'], status: 'aktif' },
  u_walikelas: { nama: 'Simulasi Wali Kelas', roles: ['guru', 'wali_kelas'], status: 'aktif' },
  u_siswa: { nama: 'Simulasi Siswa', roles: ['siswa'], status: 'aktif', studentId: '1001' },
  u_walimurid: { nama: 'Simulasi Wali Terverifikasi', roles: ['wali_murid'], status: 'aktif', guardianId: 'g1' },
  u_walimurid2: { nama: 'Simulasi Wali Menunggu', roles: ['wali_murid'], status: 'aktif', guardianId: 'g2' },
  u_nonaktif: { nama: 'Simulasi Nonaktif', roles: ['super_admin'], status: 'nonaktif' },
};

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-simma',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, data] of Object.entries(USERS)) await setDoc(doc(db, 'users', uid), data);
    await setDoc(doc(db, 'classes', C4A), { academicYearId: '2026-2027', tingkat: 4, nama: '4A', waliKelasUid: 'u_lain' });
    await setDoc(doc(db, 'classes', C4B), { academicYearId: '2026-2027', tingkat: 4, nama: '4B', waliKelasUid: 'u_walikelas' });
    await setDoc(doc(db, 'class_access', `${C4A}_u_guru`), { classId: C4A, uid: 'u_guru' });
    await setDoc(doc(db, 'students', '1001'), { nis: '1001', nama: 'Siswa Fiktif Satu', jk: 'L', classId: C4A, status: 'aktif', archived: false });
    await setDoc(doc(db, 'students', '1002'), { nis: '1002', nama: 'Siswa Fiktif Dua', jk: 'P', classId: C4B, status: 'aktif', archived: false });
    await setDoc(doc(db, 'guardian_links', '1001_g1'), { studentId: '1001', guardianId: 'g1', status: 'terverifikasi' });
    await setDoc(doc(db, 'guardian_links', '1002_g2'), { studentId: '1002', guardianId: 'g2', status: 'menunggu', createdBy: 'u_operator' });
    await setDoc(doc(db, 'audit_logs', 'a1'), { actorUid: 'u_operator', aksi: 'contoh' });
  });
});

describe('Data siswa — lingkup baca', () => {
  it('tanpa login ditolak', async () => { await assertFails(getDoc(doc(anon(), 'students', '1001'))); });
  it.each(['u_super', 'u_kepala', 'u_operator', 'u_tu'])('%s boleh membaca', async (u) => {
    await assertSucceeds(getDoc(doc(as(u), 'students', '1001')));
  });
  it('bendahara ditolak (data siswa lengkap bukan kewenangannya)', async () => { await assertFails(getDoc(doc(as('u_bendahara'), 'students', '1001'))); });
  it('guru hanya kelas yang ditugaskan', async () => {
    await assertSucceeds(getDoc(doc(as('u_guru'), 'students', '1001')));
    await assertFails(getDoc(doc(as('u_guru'), 'students', '1002')));
  });
  it('wali kelas hanya kelas binaannya', async () => {
    await assertSucceeds(getDoc(doc(as('u_walikelas'), 'students', '1002')));
    await assertFails(getDoc(doc(as('u_walikelas'), 'students', '1001')));
  });
  it('wali kelas boleh daftar siswa kelasnya bila query difilter classId', async () => {
    await assertSucceeds(getDocs(query(collection(as('u_walikelas'), 'students'), where('classId', '==', C4B))));
  });
  it('wali kelas TIDAK boleh daftar semua siswa', async () => {
    await assertFails(getDocs(collection(as('u_walikelas'), 'students')));
  });
  it('siswa hanya data dirinya', async () => {
    await assertSucceeds(getDoc(doc(as('u_siswa'), 'students', '1001')));
    await assertFails(getDoc(doc(as('u_siswa'), 'students', '1002')));
  });
  it('wali murid terverifikasi hanya anaknya', async () => {
    await assertSucceeds(getDoc(doc(as('u_walimurid'), 'students', '1001')));
    await assertFails(getDoc(doc(as('u_walimurid'), 'students', '1002')));
  });
  it('wali murid yang relasinya belum diverifikasi ditolak', async () => {
    await assertFails(getDoc(doc(as('u_walimurid2'), 'students', '1002')));
  });
  it('akun nonaktif ditolak walau ber-peran super admin', async () => {
    await assertFails(getDoc(doc(as('u_nonaktif'), 'students', '1001')));
  });
});

describe('Data siswa — tulis', () => {
  const baru = { nis: '1003', nama: 'Siswa Fiktif Tiga', jk: 'L', status: 'aktif', archived: false };
  it('operator boleh menambah', async () => { await assertSucceeds(setDoc(doc(as('u_operator'), 'students', '1003'), baru)); });
  it('kepala, TU, guru, wali kelas tidak boleh menambah', async () => {
    for (const u of ['u_kepala', 'u_tu', 'u_guru', 'u_walikelas']) await assertFails(setDoc(doc(as(u), 'students', '1003'), baru));
  });
  it('ID dokumen wajib sama dengan NIS', async () => { await assertFails(setDoc(doc(as('u_operator'), 'students', '9999'), baru)); });
  it('NIS tidak bisa diubah', async () => { await assertFails(updateDoc(doc(as('u_operator'), 'students', '1001'), { nis: '5555' })); });
  it('tidak ada yang boleh menghapus siswa (arsip saja), termasuk super admin', async () => {
    await assertFails(deleteDoc(doc(as('u_super'), 'students', '1001')));
    await assertFails(deleteDoc(doc(as('u_operator'), 'students', '1001')));
  });
  it('wali murid tidak bisa mengubah data anaknya', async () => {
    await assertFails(updateDoc(doc(as('u_walimurid'), 'students', '1001'), { nama: 'Ubah' }));
  });
});

describe('Akun & peran', () => {
  it('pengguna tidak bisa menambah peran sendiri', async () => {
    await assertFails(updateDoc(doc(as('u_guru'), 'users', 'u_guru'), { roles: ['guru', 'super_admin'] }));
  });
  it('pengguna boleh menandai sandi sudah diganti', async () => {
    await assertSucceeds(updateDoc(doc(as('u_guru'), 'users', 'u_guru'), { mustChangePassword: false }));
  });
  it('operator boleh membuat akun guru', async () => {
    await assertSucceeds(setDoc(doc(as('u_operator'), 'users', 'baru1'), { nama: 'Guru Baru', roles: ['guru'], status: 'aktif' }));
  });
  it('operator TIDAK boleh membuat akun super admin / bendahara / kepala', async () => {
    for (const r of ['super_admin', 'bendahara', 'kepala', 'operator'])
      await assertFails(setDoc(doc(as('u_operator'), 'users', 'baru_' + r), { nama: 'X', roles: [r], status: 'aktif' }));
  });
  it('operator TIDAK boleh mengubah akun kepala', async () => {
    await assertFails(updateDoc(doc(as('u_operator'), 'users', 'u_kepala'), { status: 'nonaktif', roles: ['kepala'] }));
  });
  it('super admin boleh menonaktifkan akun', async () => {
    await assertSucceeds(updateDoc(doc(as('u_super'), 'users', 'u_tu'), { status: 'nonaktif', roles: ['tu'] }));
  });
  it('akun tidak bisa dihapus', async () => { await assertFails(deleteDoc(doc(as('u_super'), 'users', 'u_tu'))); });
  it('guru tidak boleh membaca akun orang lain', async () => { await assertFails(getDoc(doc(as('u_guru'), 'users', 'u_kepala'))); });
});

describe('Relasi wali–siswa', () => {
  it('wali murid tidak bisa memverifikasi relasinya sendiri', async () => {
    await assertFails(updateDoc(doc(as('u_walimurid2'), 'guardian_links', '1002_g2'), { status: 'terverifikasi', verifiedBy: 'u_walimurid2' }));
  });
  it('operator memverifikasi wajib mencatat dirinya sebagai pemverifikasi', async () => {
    await assertFails(updateDoc(doc(as('u_operator'), 'guardian_links', '1002_g2'), { status: 'terverifikasi', verifiedBy: 'orang_lain' }));
    await assertSucceeds(updateDoc(doc(as('u_operator'), 'guardian_links', '1002_g2'), { status: 'terverifikasi', verifiedBy: 'u_operator' }));
  });
  it('relasi baru wajib berstatus menunggu', async () => {
    await assertFails(setDoc(doc(as('u_operator'), 'guardian_links', '1001_g9'), { studentId: '1001', guardianId: 'g9', status: 'terverifikasi', createdBy: 'u_operator' }));
    await assertSucceeds(setDoc(doc(as('u_operator'), 'guardian_links', '1001_g9'), { studentId: '1001', guardianId: 'g9', status: 'menunggu', createdBy: 'u_operator' }));
  });
});

describe('Jejak audit', () => {
  it('boleh mencatat atas nama sendiri dengan waktu server', async () => {
    await assertSucceeds(addDoc(collection(as('u_operator'), 'audit_logs'), { actorUid: 'u_operator', aksi: 'uji', waktu: serverTimestamp() }));
  });
  it('tidak boleh mencatat atas nama orang lain', async () => {
    await assertFails(addDoc(collection(as('u_operator'), 'audit_logs'), { actorUid: 'u_super', aksi: 'palsu', waktu: serverTimestamp() }));
  });
  it('tidak bisa diubah atau dihapus, termasuk super admin', async () => {
    await assertFails(updateDoc(doc(as('u_super'), 'audit_logs', 'a1'), { aksi: 'ubah' }));
    await assertFails(deleteDoc(doc(as('u_super'), 'audit_logs', 'a1')));
  });
  it('operator tidak boleh membaca audit log', async () => { await assertFails(getDoc(doc(as('u_operator'), 'audit_logs', 'a1'))); });
});

describe('Default deny', () => {
  it('koleksi yang tidak didefinisikan ditolak', async () => {
    await assertFails(setDoc(doc(as('u_super'), 'koleksi_asing', 'x'), { a: 1 }));
  });
});
