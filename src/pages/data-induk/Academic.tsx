import { useState } from 'react';
import { Building2, CalendarRange, Library, Pencil, Plus, Star } from 'lucide-react';
import { invalidate, useSWR } from '../../lib/swr';
import { useActiveYear } from '../../lib/hooks';
import { getClasses, getSubjects, getUsers, getYears, saveClass, saveSubject, saveYear } from '../../services/data';
import type { AcademicYear, SchoolClass, Subject } from '../../lib/types';
import { Badge, Button, Card, CardHeader, EmptyState, Field, IconButton, Input, Modal, Note, PageHeader, Select, Spinner, Tabs, Td, Th } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

type T = 'tahun' | 'kelas' | 'mapel';

export default function Academic() {
  const [tab, setTab] = useState<T>('tahun');
  return (
    <>
      <PageHeader eyebrow="Data Induk" title="Kelas, Mapel & Tahun Pelajaran" subtitle="Struktur akademik dasar. Data lama diarsipkan, tidak dihapus." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'tahun', label: 'Tahun Pelajaran' }, { key: 'kelas', label: 'Rombongan Belajar' }, { key: 'mapel', label: 'Mata Pelajaran' }]} />
      <div className="mt-5">{tab === 'tahun' ? <Years /> : tab === 'kelas' ? <Classes /> : <Subjects />}</div>
    </>
  );
}

function Years() {
  const y = useSWR('years', getYears, { ttl: 5 * 60_000 });
  const [edit, setEdit] = useState<Partial<AcademicYear> | null>(null);
  return (
    <Card>
      <CardHeader icon={<CalendarRange className="h-4 w-4" />} title="Tahun Pelajaran" subtitle="Hanya satu tahun pelajaran yang aktif" action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ semesterAktif: 'Ganjil', isActive: !y.data?.length })}>Tahun Pelajaran</Button>} />
      {y.loading ? <Spinner /> : !y.data?.length ? <EmptyState icon={<CalendarRange className="h-7 w-7" />} title="Belum ada tahun pelajaran" text="Buat tahun pelajaran pertama, misalnya 2026/2027." /> : (
        <ul className="divide-y divide-line">
          {y.data.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-5 py-3">
              {x.isActive ? <Star className="h-5 w-5 fill-gold text-gold" aria-label="Aktif" /> : <span className="h-5 w-5" />}
              <span className="flex-1"><span className="font-semibold">{x.nama}</span> <span className="caption">· Semester {x.semesterAktif}</span></span>
              <Badge tone={x.isActive ? 'ok' : 'neutral'}>{x.isActive ? 'Aktif' : 'Arsip'}</Badge>
              <IconButton label={`Ubah ${x.nama}`} onClick={() => setEdit(x)}><Pencil className="h-4 w-4" /></IconButton>
            </li>
          ))}
        </ul>
      )}
      {edit && <YearModal init={edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function YearModal({ init, onClose }: { init: Partial<AcademicYear>; onClose: () => void }) {
  const toast = useToast();
  const now = new Date().getFullYear();
  const [awal, setAwal] = useState(init.nama ? Number(init.nama.slice(0, 4)) : now);
  const [sem, setSem] = useState(init.semesterAktif || 'Ganjil');
  const [aktif, setAktif] = useState(!!init.isActive);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (awal < 2000 || awal > 2100) { toast.warn('Tahun tidak valid.'); return; }
    setBusy(true);
    try { await saveYear({ id: init.id || `${awal}-${awal + 1}`, nama: `${awal}/${awal + 1}`, semesterAktif: sem, isActive: aktif }, !init.id); invalidate('years'); invalidate('year:active'); invalidate('dash'); toast.ok('Tahun pelajaran tersimpan.'); onClose(); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={init.id ? `Ubah ${init.nama}` : 'Tahun Pelajaran Baru'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4">
        <Field label="Tahun awal" hint={`Akan tersimpan sebagai ${awal}/${awal + 1}`}>{(id) => <Input id={id} type="number" value={awal} disabled={!!init.id} onChange={(e) => setAwal(Number(e.target.value))} />}</Field>
        <Field label="Semester aktif">{(id) => <Select id={id} value={sem} onChange={(e) => setSem(e.target.value as 'Ganjil' | 'Genap')}><option>Ganjil</option><option>Genap</option></Select>}</Field>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-[18px] w-[18px] accent-brand-600" /> Jadikan tahun pelajaran aktif</label>
        {aktif && !init.isActive && <Note tone="warn">Tahun pelajaran aktif lain akan otomatis menjadi arsip.</Note>}
      </div>
    </Modal>
  );
}

function Classes() {
  const year = useActiveYear();
  const c = useSWR(year.data ? `classes:${year.data.id}` : null, () => getClasses(year.data!.id), { ttl: 5 * 60_000 });
  const [edit, setEdit] = useState<Partial<SchoolClass> | null>(null);
  if (year.loading) return <Spinner />;
  if (!year.data) return <Note tone="warn">Buat dan aktifkan tahun pelajaran terlebih dahulu di tab Tahun Pelajaran.</Note>;
  return (
    <Card>
      <CardHeader icon={<Building2 className="h-4 w-4" />} title={`Rombongan Belajar ${year.data.nama}`} subtitle="Wali kelas menentukan siapa yang boleh melihat data siswa kelas tersebut" action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ tingkat: 1 })}>Rombel</Button>} />
      {c.loading ? <Spinner /> : !c.data?.length ? <EmptyState icon={<Building2 className="h-7 w-7" />} title="Belum ada rombel" text="Tambahkan rombel, misalnya 1A sampai 6A." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px]">
            <thead><tr><Th>Tingkat</Th><Th>Rombel</Th><Th>Wali Kelas</Th><Th className="text-right">Aksi</Th></tr></thead>
            <tbody>{c.data.map((x) => (
              <tr key={x.id} className="hover:bg-canvas"><Td>{x.tingkat}</Td><Td className="font-semibold">Kelas {x.nama}</Td>
                <Td>{x.waliKelasNama || <Badge tone="warn">Belum ditetapkan</Badge>}</Td>
                <Td className="text-right"><IconButton label={`Ubah kelas ${x.nama}`} onClick={() => setEdit(x)}><Pencil className="h-4 w-4" /></IconButton></Td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {edit && <ClassModal init={edit} yearId={year.data.id} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function ClassModal({ init, yearId, onClose }: { init: Partial<SchoolClass>; yearId: string; onClose: () => void }) {
  const toast = useToast();
  const users = useSWR('users', getUsers, { ttl: 2 * 60_000 });
  const walis = (users.data || []).filter((u) => u.roles.includes('wali_kelas') && u.status === 'aktif');
  const [tingkat, setTingkat] = useState(init.tingkat || 1);
  const [nama, setNama] = useState(init.nama || '');
  const [wk, setWk] = useState(init.waliKelasUid || '');
  const [busy, setBusy] = useState(false);
  async function save() {
    const n = nama.trim().toUpperCase();
    if (!/^[1-6][A-Z]?$/.test(n)) { toast.warn('Nama rombel seperti 1A, 2B, atau 6.'); return; }
    const w = walis.find((u) => u.uid === wk);
    setBusy(true);
    try { await saveClass({ id: init.id || `${yearId}_${n}`, academicYearId: yearId, tingkat, nama: n, waliKelasUid: w?.uid || null, waliKelasNama: w?.nama || null, archived: false }, !init.id); invalidate('classes'); invalidate('dash'); toast.ok('Rombel tersimpan.'); onClose(); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={init.id ? `Ubah Kelas ${init.nama}` : 'Rombel Baru'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tingkat">{(id) => <Select id={id} value={tingkat} onChange={(e) => setTingkat(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((t) => <option key={t} value={t}>{t}</option>)}</Select>}</Field>
          <Field label="Nama rombel" required>{(id) => <Input id={id} value={nama} disabled={!!init.id} onChange={(e) => setNama(e.target.value)} placeholder="mis. 4A" />}</Field>
        </div>
        <Field label="Wali kelas" hint="Hanya akun yang memiliki peran Wali Kelas. Atur peran di menu Akun & Peran.">
          {(id) => <Select id={id} value={wk} onChange={(e) => setWk(e.target.value)}><option value="">— Belum ditetapkan —</option>{walis.map((u) => <option key={u.uid} value={u.uid}>{u.nama}</option>)}</Select>}
        </Field>
      </div>
    </Modal>
  );
}

function Subjects() {
  const s = useSWR('subjects', getSubjects, { ttl: 5 * 60_000 });
  const [edit, setEdit] = useState<Partial<Subject> | null>(null);
  return (
    <Card>
      <CardHeader icon={<Library className="h-4 w-4" />} title="Mata Pelajaran" action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ kelompok: 'Agama' })}>Mapel</Button>} />
      {s.loading ? <Spinner /> : !s.data?.length ? <EmptyState icon={<Library className="h-7 w-7" />} title="Belum ada mata pelajaran" /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead><tr><Th>Kode</Th><Th>Mata Pelajaran</Th><Th>Kelompok</Th><Th>Status</Th><Th className="text-right">Aksi</Th></tr></thead>
            <tbody>{s.data.map((x) => (
              <tr key={x.id} className="hover:bg-canvas"><Td className="font-medium">{x.kode}</Td><Td className="font-semibold">{x.nama}</Td><Td>{x.kelompok || '–'}</Td>
                <Td><Badge tone={x.archived ? 'neutral' : 'ok'}>{x.archived ? 'Arsip' : 'Aktif'}</Badge></Td>
                <Td className="text-right"><IconButton label={`Ubah ${x.nama}`} onClick={() => setEdit(x)}><Pencil className="h-4 w-4" /></IconButton></Td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {edit && <SubjectModal init={edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function SubjectModal({ init, onClose }: { init: Partial<Subject>; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ kode: init.kode || '', nama: init.nama || '', kelompok: init.kelompok || 'Agama', archived: !!init.archived });
  const [busy, setBusy] = useState(false);
  async function save() {
    const kode = f.kode.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(kode) || f.nama.trim().length < 2) { toast.warn('Kode 2–8 huruf/angka dan nama mapel wajib diisi.'); return; }
    setBusy(true);
    try { await saveSubject({ id: init.id || kode, kode, nama: f.nama.trim(), kelompok: f.kelompok, archived: f.archived }, !init.id); invalidate('subjects'); toast.ok('Mapel tersimpan.'); onClose(); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={init.id ? `Ubah ${init.nama}` : 'Mapel Baru'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4">
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <Field label="Kode" required>{(id) => <Input id={id} value={f.kode} disabled={!!init.id} onChange={(e) => setF({ ...f, kode: e.target.value })} placeholder="QH" />}</Field>
          <Field label="Nama mapel" required>{(id) => <Input id={id} value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="Al-Qur'an Hadis" />}</Field>
        </div>
        <Field label="Kelompok">{(id) => <Select id={id} value={f.kelompok} onChange={(e) => setF({ ...f, kelompok: e.target.value })}><option>Agama</option><option>Umum</option><option>Muatan Lokal</option></Select>}</Field>
        {init.id && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={f.archived} onChange={(e) => setF({ ...f, archived: e.target.checked })} className="h-[18px] w-[18px] accent-brand-600" /> Arsipkan mapel ini</label>}
      </div>
    </Modal>
  );
}
