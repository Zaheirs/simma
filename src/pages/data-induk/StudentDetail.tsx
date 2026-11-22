import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Camera, CircleCheck, FileText, Hourglass, Pencil, RotateCcw, UserX } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { can } from '../../lib/rbac';
import { invalidate, useSWR } from '../../lib/swr';
import { archiveStudent, getEnrollments, getLinksOfStudent, getStudent, restoreStudent, setStudentPhoto } from '../../services/data';
import { filesOf, openDriveFile, uploadFile, useDriveFile, validateFile } from '../../services/files';
import { fmtTanggal, fmtWaktu } from '../../lib/format';
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, Note, Select, Skeleton, Spinner, Tabs, Td, Textarea, Th } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { cap } from './Students';
import type { Student } from '../../lib/types';

type TabKey = 'biodata' | 'wali' | 'kelas' | 'dokumen' | 'lain';

export default function StudentDetail() {
  const { nis = '' } = useParams();
  const { role, school } = useAuth();
  const toast = useToast();
  const s = useSWR(`student:${nis}`, () => getStudent(nis), { ttl: 60_000 });
  const [tab, setTab] = useState<TabKey>('biodata');
  const [arch, setArch] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const foto = useDriveFile(s.data?.fotoFileId);
  const canEdit = can(role, 'siswa.kelola');
  const admin = can(role, 'wali.lihat');

  if (s.loading) return <div className="grid gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-60" /></div>;
  if (!s.data) return <EmptyState icon={<UserX className="h-7 w-7" />} title="Siswa tidak ditemukan" text={s.error ? 'Anda tidak memiliki izin melihat siswa ini.' : `Tidak ada siswa dengan NIS ${nis}.`} action={<Link to="/siswa"><Button variant="secondary">Kembali</Button></Link>} />;
  const st = s.data;

  async function gantiFoto(f?: File) {
    if (!f) return;
    const e = validateFile(f, school?.maxUploadMb || 2);
    if (e || !f.type.startsWith('image/')) { toast.bad(e || 'Foto harus berupa JPG atau PNG.'); return; }
    setUploading(true);
    try {
      const m = await uploadFile(f, { folder: `01_Siswa/${st.nis}`, kategori: 'foto_siswa', koleksi: 'students', docId: st.nis });
      await setStudentPhoto(st.nis, m.driveFileId);
      invalidate(`student:${st.nis}`); invalidate('students');
      toast.ok('Foto siswa diperbarui.');
    } catch (x) { toast.bad((x as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <>
      <Link to="/siswa" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Data Siswa</Link>
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit p-5 text-center">
          <div className="relative mx-auto w-fit">
            {foto.data ? <img src={foto.data} alt={`Foto ${st.nama}`} className="h-32 w-32 rounded-full border border-line object-cover" /> : foto.loading ? <Skeleton className="h-32 w-32 rounded-full" /> : <Avatar nama={st.nama} size={128} />}
            {canEdit && !st.archived && (
              <>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Ganti foto"
                  className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-brand-600 text-white shadow-pop hover:bg-brand-700 disabled:opacity-60">
                  {uploading ? <Hourglass className="h-4 w-4 animate-pulse" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => gantiFoto(e.target.files?.[0])} />
              </>
            )}
          </div>
          <h1 className="mt-4 text-xl font-bold">{st.nama}</h1>
          <p className="caption mt-1">NIS {st.nis}{st.nisn ? ` · NISN ${st.nisn}` : ''}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <Badge tone={st.archived ? 'neutral' : 'ok'}>{cap(st.status)}</Badge>
            {st.className && <Badge tone="brand">Kelas {st.className}</Badge>}
          </div>
          {st.archived && st.archiveReason && <p className="caption mt-3 rounded bg-surface-recessed p-2 text-left">Alasan arsip: {st.archiveReason}</p>}
          {canEdit && (
            <div className="mt-5 grid gap-2">
              {!st.archived ? (<>
                <Link to={`/siswa/${st.nis}/ubah`}><Button block icon={<Pencil className="h-4 w-4" />}>Ubah Biodata</Button></Link>
                <Button variant="secondary" block icon={<Archive className="h-4 w-4" />} onClick={() => setArch(true)}>Arsipkan</Button>
              </>) : <Button variant="secondary" block icon={<RotateCcw className="h-4 w-4" />} onClick={() => setArch(true)}>Pulihkan ke Aktif</Button>}
            </div>
          )}
        </Card>

        <Card>
          <div className="px-4 pt-2 sm:px-5">
            <Tabs value={tab} onChange={setTab} tabs={[
              { key: 'biodata', label: 'Biodata' }, ...(admin ? [{ key: 'wali' as const, label: 'Orang Tua/Wali' }] : []),
              { key: 'kelas', label: 'Riwayat Kelas' }, ...(admin ? [{ key: 'dokumen' as const, label: 'Dokumen' }] : []), { key: 'lain', label: 'Kehadiran · Nilai · Keuangan' },
            ]} />
          </div>
          <div className="p-4 sm:p-5">
            {tab === 'biodata' && <Biodata s={st} />}
            {tab === 'wali' && <WaliTab nis={st.nis} />}
            {tab === 'kelas' && <KelasTab nis={st.nis} />}
            {tab === 'dokumen' && <DokumenTab s={st} canEdit={canEdit} />}
            {tab === 'lain' && <EmptyState icon={<Hourglass className="h-7 w-7" />} title="Tersedia di tahap berikutnya" text="Rekap kehadiran (Tahap 1.5), nilai & rapor (1.6), dan tagihan (1.7) akan tampil di profil ini." />}
          </div>
        </Card>
      </div>
      <ArchiveModal open={arch} onClose={() => setArch(false)} s={st} onDone={() => { setArch(false); invalidate(`student:${st.nis}`); invalidate('students'); invalidate('dash'); }} />
    </>
  );
}

function Biodata({ s }: { s: Student }) {
  const rows: [string, string | undefined][] = [
    ['Nama lengkap', s.nama], ['Jenis kelamin', s.jk === 'L' ? 'Laki-laki' : 'Perempuan'], ['NIS', s.nis], ['NISN', s.nisn], ['NISM', s.nism],
    ['Tempat, tanggal lahir', [s.tempatLahir, s.tanggalLahir ? fmtTanggal(s.tanggalLahir) : ''].filter(Boolean).join(', ')],
    ['Alamat', [s.alamat, s.kelurahan, s.kecamatan].filter(Boolean).join(', ')], ['Kelas saat ini', s.className ? `Kelas ${s.className}` : undefined],
    ['Terakhir diperbarui', s.updatedAt ? fmtWaktu(s.updatedAt) : undefined],
  ];
  return (
    <dl className="grid gap-x-6 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="border-b border-line py-3"><dt className="caption">{k}</dt><dd className="mt-0.5 text-sm font-medium">{v || <span className="text-ink-muted">–</span>}</dd></div>
      ))}
    </dl>
  );
}

function WaliTab({ nis }: { nis: string }) {
  const l = useSWR(`links:student:${nis}`, () => getLinksOfStudent(nis), { ttl: 60_000 });
  if (l.loading) return <Spinner />;
  if (!l.data?.length) return <EmptyState icon={<UserX className="h-7 w-7" />} title="Belum ada orang tua/wali terhubung" text="Hubungkan di menu Orang Tua / Wali." action={<Link to="/wali"><Button variant="secondary">Buka Orang Tua / Wali</Button></Link>} />;
  return (
    <ul className="grid gap-2">
      {l.data.map((x) => (
        <li key={x.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
          <Avatar nama={x.guardianName} size={40} />
          <span className="min-w-0 flex-1"><span className="block font-semibold">{x.guardianName}</span><span className="caption">{x.hubungan || 'Wali'}</span></span>
          <Badge tone={x.status === 'terverifikasi' ? 'ok' : x.status === 'ditolak' ? 'bad' : 'warn'} icon={x.status === 'terverifikasi' ? <CircleCheck className="h-3 w-3" /> : undefined}>{cap(x.status)}</Badge>
        </li>
      ))}
    </ul>
  );
}

function KelasTab({ nis }: { nis: string }) {
  const e = useSWR(`enroll:${nis}`, () => getEnrollments(nis), { ttl: 60_000 });
  if (e.loading) return <Spinner />;
  const rows = [...(e.data || [])].sort((a, b) => b.academicYearId.localeCompare(a.academicYearId));
  if (!rows.length) return <EmptyState icon={<FileText className="h-7 w-7" />} title="Belum ada riwayat kelas" text="Riwayat tercatat otomatis saat siswa ditempatkan di kelas." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px]">
        <thead><tr><Th>Tahun Pelajaran</Th><Th>Kelas</Th><Th>Status</Th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id}><Td className="font-semibold">{r.academicYearId.replace('-', '/')}</Td><Td>{r.className ? `Kelas ${r.className}` : r.classId.split('_').pop()}</Td><Td><Badge tone={i === 0 ? 'brand' : 'neutral'}>{i === 0 ? 'Sedang berjalan' : cap(r.status)}</Badge></Td></tr>
        ))}</tbody>
      </table>
      <Note className="mt-4">Riwayat tidak pernah ditimpa. Pergantian tahun pelajaran membuat catatan baru (PRD §4.3).</Note>
    </div>
  );
}

function DokumenTab({ s, canEdit }: { s: Student; canEdit: boolean }) {
  const { school } = useAuth();
  const toast = useToast();
  const f = useSWR(`files:students:${s.nis}`, () => filesOf('students', s.nis), { ttl: 60_000 });
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  async function up(file?: File) {
    if (!file) return;
    const e = validateFile(file, school?.maxUploadMb || 2);
    if (e) { toast.bad(e); return; }
    setBusy(true);
    try { await uploadFile(file, { folder: `01_Siswa/${s.nis}`, kategori: 'dokumen_siswa', koleksi: 'students', docId: s.nis }); invalidate(`files:students:${s.nis}`); toast.ok('Dokumen tersimpan di Google Drive madrasah.'); }
    catch (x) { toast.bad((x as Error).message); }
    finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }
  return (
    <>
      {canEdit && !s.archived && (
        <div className="mb-4">
          <Button variant="secondary" loading={busy} onClick={() => ref.current?.click()} icon={<FileText className="h-4 w-4" />}>Unggah Dokumen (KK, Akta, Ijazah)</Button>
          <input ref={ref} type="file" className="sr-only" accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx" onChange={(e) => up(e.target.files?.[0])} />
          <p className="caption mt-1.5">JPG, PNG, PDF, DOCX, XLSX · maks {school?.maxUploadMb || 2} MB · tersimpan privat di Google Drive</p>
        </div>
      )}
      {f.loading ? <Spinner /> : !f.data?.length ? <EmptyState icon={<FileText className="h-7 w-7" />} title="Belum ada dokumen" /> : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {f.data.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="h-5 w-5 shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{x.nama}</span><span className="caption">{x.kategori.replace('_', ' ')} · {Math.round(x.ukuran / 1024)} KB</span></span>
              <Button size="sm" variant="ghost" loading={opening === x.id} onClick={async () => { setOpening(x.id); try { await openDriveFile(x.driveFileId); } catch (e) { toast.bad((e as Error).message); } finally { setOpening(null); } }}>Buka</Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ArchiveModal({ open, onClose, s, onDone }: { open: boolean; onClose: () => void; s: Student; onDone: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<'lulus' | 'keluar' | 'pindah'>('lulus');
  const [alasan, setAlasan] = useState('');
  const [busy, setBusy] = useState(false);
  const restore = s.archived;
  async function go() {
    if (alasan.trim().length < 5) { toast.warn('Tulis alasan minimal 5 karakter.'); return; }
    setBusy(true);
    try { if (restore) await restoreStudent(s, alasan.trim()); else await archiveStudent(s, status, alasan.trim()); toast.ok(restore ? 'Siswa dipulihkan ke status aktif.' : 'Siswa diarsipkan. Riwayatnya tetap tersimpan.'); setAlasan(''); onDone(); }
    catch (x) { toast.bad((x as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title={restore ? 'Pulihkan siswa' : 'Arsipkan siswa'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={go} loading={busy}>{restore ? 'Pulihkan' : 'Arsipkan'}</Button></>}>
      <div className="grid gap-4">
        <p className="text-sm text-ink-2"><b className="text-ink">{s.nama}</b> (NIS {s.nis}). {restore ? 'Siswa akan kembali muncul di daftar aktif.' : 'Data tidak dihapus — riwayat kelas, nilai, kehadiran, dan keuangan tetap bisa dilihat.'}</p>
        {!restore && <Field label="Status" required>{(id) => <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="lulus">Lulus</option><option value="pindah">Pindah sekolah</option><option value="keluar">Keluar</option></Select>}</Field>}
        <Field label="Alasan" required hint="Tercatat permanen di jejak audit.">{(id) => <Textarea id={id} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="mis. Lulus tahun pelajaran 2025/2026" />}</Field>
      </div>
    </Modal>
  );
}
