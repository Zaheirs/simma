import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Eye, FileUp, GraduationCap, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { can } from '../../lib/rbac';
import { useSWR } from '../../lib/swr';
import { useActiveYear, useClasses, useDebounced } from '../../lib/hooks';
import { getStudents, getStudentsByClass, myClassIds } from '../../services/data';
import { norm } from '../../lib/format';
import type { Student } from '../../lib/types';
import { Avatar, Badge, Button, Card, EmptyState, IconButton, PageHeader, Pagination, SearchInput, Select, TableSkeleton, Tabs, Td, Th } from '../../components/ui';
import { exportXlsx } from './xlsx';

const PER = 20;
const STATUS_TONE = { aktif: 'ok', lulus: 'brand', keluar: 'neutral', pindah: 'info' } as const;

export default function Students() {
  const { role, user } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const year = useActiveYear();
  const classes = useClasses(year.data?.id);
  const scoped = role === 'guru' || role === 'wali_kelas';
  const [tab, setTab] = useState<'aktif' | 'arsip'>('aktif');
  const [q, setQ] = useState('');
  const [jk, setJk] = useState('');
  const [page, setPage] = useState(1);
  const kelas = sp.get('kelas') || '';
  const dq = useDebounced(q);

  // Guru/Wali Kelas: hanya kelasnya (dibaca per kelas, sesuai Security Rules). Peran lain: semua siswa.
  const mine = useSWR(scoped && year.data ? `myclasses:${role}:${year.data.id}` : null, () => myClassIds(role!, user!.uid, year.data!.id), { ttl: 5 * 60_000 });
  const all = useSWR(!scoped ? `students:${tab}` : null, () => getStudents(tab === 'arsip'), { ttl: 60_000 });
  const scopedData = useSWR(scoped && mine.data ? `students:scoped:${mine.data.join(',')}` : null,
    async () => (await Promise.all(mine.data!.map(getStudentsByClass))).flat(), { ttl: 60_000 });
  const src = scoped ? scopedData : all;

  const classOptions = (classes.data || []).filter((c) => !scoped || mine.data?.includes(c.id));
  const rows = useMemo(() => {
    const n = norm(dq);
    return (src.data || []).filter((s) =>
      (!kelas || s.classId === kelas) && (!jk || s.jk === jk) &&
      (!n || norm(s.nama).includes(n) || s.nis.includes(n) || (s.nisn || '').includes(n)));
  }, [src.data, dq, kelas, jk]);
  const shown = rows.slice((page - 1) * PER, page * PER);
  const canEdit = can(role, 'siswa.kelola');

  const setKelas = (v: string) => { setPage(1); const p = new URLSearchParams(sp); if (v) p.set('kelas', v); else p.delete('kelas'); setSp(p, { replace: true }); };

  return (
    <>
      <PageHeader eyebrow="Data Induk" title="Data Siswa" subtitle={scoped ? 'Siswa pada kelas yang menjadi tugas Anda.' : 'Kelola biodata, penempatan kelas, dan arsip siswa.'}
        actions={<>
          {can(role, 'siswa.ekspor') && <Button variant="secondary" icon={<Download className="h-4 w-4" />} disabled={!rows.length}
            onClick={() => exportXlsx(`siswa-${tab}`, rows.map((s) => ({ NIS: s.nis, NISN: s.nisn || '', NISM: s.nism || '', Nama: s.nama, 'L/P': s.jk, Kelas: s.className || '', 'Tempat Lahir': s.tempatLahir || '', 'Tanggal Lahir': s.tanggalLahir || '', Alamat: s.alamat || '', Status: s.status })))}>Ekspor</Button>}
          {can(role, 'impor') && <Link to="/impor"><Button variant="secondary" icon={<FileUp className="h-4 w-4" />}>Impor Excel</Button></Link>}
          {canEdit && <Link to="/siswa/baru"><Button icon={<Plus className="h-4 w-4" />}>Tambah Siswa</Button></Link>}
        </>} />

      <Card>
        {!scoped && (
          <div className="px-4 pt-2 sm:px-5">
            <Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ key: 'aktif', label: 'Aktif' }, { key: 'arsip', label: 'Arsip (Lulus / Keluar / Pindah)' }]} />
          </div>
        )}
        <div className="grid gap-2 p-4 sm:grid-cols-[1fr_200px_160px_auto] sm:px-5">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Cari nama, NIS, atau NISN" />
          <Select value={kelas} onChange={(e) => setKelas(e.target.value)} aria-label="Filter kelas">
            <option value="">{scoped ? 'Semua kelas saya' : 'Semua kelas'}</option>
            {classOptions.map((c) => <option key={c.id} value={c.id}>Kelas {c.nama}</option>)}
          </Select>
          <Select value={jk} onChange={(e) => { setJk(e.target.value); setPage(1); }} aria-label="Filter jenis kelamin">
            <option value="">L & P</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
          </Select>
          <IconButton label="Muat ulang" onClick={() => src.refresh()} className="max-sm:hidden"><RefreshCw className={src.refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></IconButton>
        </div>

        {src.loading || (scoped && mine.loading) ? <TableSkeleton /> : src.error ? (
          <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="Data tidak dapat dimuat" text={src.error.message.includes('permission') ? 'Akun Anda tidak memiliki izin untuk data ini.' : 'Periksa koneksi internet lalu coba lagi.'} action={<Button variant="secondary" onClick={() => src.refresh()}>Coba Lagi</Button>} />
        ) : !rows.length ? (
          <EmptyState icon={<GraduationCap className="h-7 w-7" />} title={src.data?.length ? 'Tidak ada yang cocok' : tab === 'arsip' ? 'Arsip masih kosong' : 'Belum ada data siswa'}
            text={src.data?.length ? 'Ubah kata kunci atau filter.' : canEdit && tab === 'aktif' ? 'Tambahkan satu per satu atau impor dari Excel.' : undefined}
            action={!src.data?.length && canEdit && tab === 'aktif' ? <Link to="/impor"><Button icon={<FileUp className="h-4 w-4" />}>Impor dari Excel</Button></Link> : undefined} />
        ) : (
          <>
            {/* Desktop: tabel */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead><tr><Th>Siswa</Th><Th>NIS</Th><Th>NISN</Th><Th>Kelas</Th><Th>L/P</Th><Th>Status</Th><Th className="text-right">Aksi</Th></tr></thead>
                <tbody>
                  {shown.map((s, i) => (
                    <tr key={s.id} className={(i % 2 ? 'bg-[#FAFBFA] ' : '') + 'cursor-pointer hover:bg-brand-tint/50'} onClick={() => nav(`/siswa/${s.id}`)}>
                      <Td><span className="flex items-center gap-3"><Avatar nama={s.nama} size={34} /><span className="font-semibold">{s.nama}</span></span></Td>
                      <Td className="font-medium">{s.nis}</Td>
                      <Td className="text-ink-2">{s.nisn || '–'}</Td>
                      <Td>{s.className ? `Kelas ${s.className}` : <Badge tone="warn">Belum ada</Badge>}</Td>
                      <Td>{s.jk}</Td>
                      <Td><Badge tone={STATUS_TONE[s.status]}>{cap(s.status)}</Badge></Td>
                      <Td className="text-right" >
                        <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/siswa/${s.id}`} aria-label={`Lihat ${s.nama}`} className="grid h-9 w-9 place-items-center rounded text-ink-2 hover:bg-surface-recessed"><Eye className="h-4 w-4" /></Link>
                          {canEdit && !s.archived && <Link to={`/siswa/${s.id}/ubah`} aria-label={`Ubah ${s.nama}`} className="grid h-9 w-9 place-items-center rounded text-ink-2 hover:bg-surface-recessed"><Pencil className="h-4 w-4" /></Link>}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* HP: kartu bertumpuk */}
            <ul className="divide-y divide-line md:hidden">
              {shown.map((s) => <StudentRow key={s.id} s={s} />)}
            </ul>
            <Pagination page={page} total={rows.length} perPage={PER} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

function StudentRow({ s }: { s: Student }) {
  return (
    <li>
      <Link to={`/siswa/${s.id}`} className="flex min-h-[68px] items-center gap-3 px-4 py-3 active:bg-brand-tint/50">
        <Avatar nama={s.nama} size={42} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{s.nama}</span>
          <span className="caption">NIS {s.nis} · {s.className ? `Kelas ${s.className}` : 'Belum ada kelas'} · {s.jk}</span>
        </span>
        <Badge tone={STATUS_TONE[s.status]}>{cap(s.status)}</Badge>
      </Link>
    </li>
  );
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
