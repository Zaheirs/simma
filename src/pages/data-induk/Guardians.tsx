import { useMemo, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { HeartHandshake, Link2, Pencil, Plus } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { can } from '../../lib/rbac';
import { db } from '../../lib/firebase';
import { invalidate, useSWR } from '../../lib/swr';
import { useDebounced } from '../../lib/hooks';
import { createLink, getGuardians, getStudents, saveGuardian } from '../../services/data';
import { norm } from '../../lib/format';
import type { Guardian, GuardianLink } from '../../lib/types';
import { Avatar, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, Note, PageHeader, SearchInput, Select, TableSkeleton } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

const HUBUNGAN = ['Ayah', 'Ibu', 'Wali', 'Kakek', 'Nenek', 'Paman', 'Bibi', 'Kakak'];

export default function Guardians() {
  const { role } = useAuth();
  const g = useSWR('guardians', getGuardians, { ttl: 2 * 60_000 });
  const links = useSWR('links:all', async () => (await getDocs(query(collection(db, 'guardian_links'), limit(800)))).docs.map((d) => ({ id: d.id, ...d.data() }) as GuardianLink), { ttl: 60_000 });
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [edit, setEdit] = useState<Partial<Guardian> | null>(null);
  const [linkFor, setLinkFor] = useState<Guardian | null>(null);
  const canEdit = can(role, 'wali.kelola');

  const byG = useMemo(() => {
    const m: Record<string, GuardianLink[]> = {};
    (links.data || []).forEach((l) => { (m[l.guardianId] ||= []).push(l); });
    return m;
  }, [links.data]);
  const rows = useMemo(() => (g.data || []).filter((x) => !dq || norm(x.nama).includes(norm(dq)) || (x.hp || '').includes(dq)
    || (byG[x.id] || []).some((l) => norm(l.studentName).includes(norm(dq)) || l.studentId.includes(dq))), [g.data, dq, byG]);

  return (
    <>
      <PageHeader eyebrow="Data Induk" title="Orang Tua / Wali" subtitle="Satu wali boleh terhubung ke beberapa anak, satu siswa boleh memiliki beberapa wali. Setiap hubungan wajib diverifikasi."
        actions={canEdit && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({})}>Tambah Orang Tua/Wali</Button>} />
      <Card>
        <div className="p-4 sm:px-5"><SearchInput value={q} onChange={setQ} placeholder="Cari nama wali, HP, atau nama/NIS anak" className="max-w-md" /></div>
        {g.loading ? <TableSkeleton cols={4} /> : !rows.length ? (
          <EmptyState icon={<HeartHandshake className="h-7 w-7" />} title={g.data?.length ? 'Tidak ada yang cocok' : 'Belum ada data orang tua/wali'} text={!g.data?.length ? 'Tambahkan manual atau impor dari Excel (kolom nis_anak otomatis membuat relasi).' : undefined} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((x) => {
              const ls = byG[x.id] || [];
              return (
                <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <Avatar nama={x.nama} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{x.nama} <span className="caption font-normal">· {x.hubungan || 'Wali'}{x.hp ? ` · ${x.hp}` : ''}</span></p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ls.length ? ls.map((l) => (
                        <Badge key={l.id} tone={l.status === 'terverifikasi' ? 'ok' : l.status === 'ditolak' ? 'bad' : 'warn'}>{l.studentName} · {l.status}</Badge>
                      )) : <span className="caption">Belum terhubung ke siswa</span>}
                      {x.userUid ? <Badge tone="brand">Akun aktif</Badge> : <Badge>Belum ada akun</Badge>}
                    </div>
                  </div>
                  {canEdit && <div className="flex gap-1">
                    <Button size="sm" variant="secondary" icon={<Link2 className="h-4 w-4" />} onClick={() => setLinkFor(x)}>Hubungkan anak</Button>
                    <IconButton label={`Ubah ${x.nama}`} onClick={() => setEdit(x)}><Pencil className="h-4 w-4" /></IconButton>
                  </div>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {edit && <GuardianModal init={edit} onClose={() => setEdit(null)} />}
      {linkFor && <LinkModal g={linkFor} onClose={() => setLinkFor(null)} />}
    </>
  );
}

function GuardianModal({ init, onClose }: { init: Partial<Guardian>; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ nama: init.nama || '', hubungan: init.hubungan || 'Ayah', hp: init.hp || '', pekerjaan: init.pekerjaan || '' });
  const [busy, setBusy] = useState(false);
  const [e, setE] = useState<string | null>(null);
  async function save() {
    if (f.nama.trim().length < 3) return setE('Nama minimal 3 huruf.');
    if (f.hp && !/^(\+62|0)8\d{7,12}$/.test(f.hp.replace(/[\s-]/g, ''))) return setE('Nomor HP tidak valid.');
    setBusy(true);
    try { await saveGuardian({ ...init, ...f, nama: f.nama.trim() } as Guardian); invalidate('guardians'); invalidate('dash'); toast.ok('Data orang tua/wali tersimpan.'); onClose(); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={init.id ? 'Ubah Orang Tua/Wali' : 'Tambah Orang Tua/Wali'}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4">
        <Field label="Nama lengkap" required error={e}>{(id) => <Input id={id} value={f.nama} onChange={(x) => setF({ ...f, nama: x.target.value })} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hubungan">{(id) => <Select id={id} value={f.hubungan} onChange={(x) => setF({ ...f, hubungan: x.target.value })}>{HUBUNGAN.map((h) => <option key={h}>{h}</option>)}</Select>}</Field>
          <Field label="No. HP">{(id) => <Input id={id} inputMode="tel" value={f.hp} onChange={(x) => setF({ ...f, hp: x.target.value })} placeholder="08…" />}</Field>
        </div>
        <Field label="Pekerjaan">{(id) => <Input id={id} value={f.pekerjaan} onChange={(x) => setF({ ...f, pekerjaan: x.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

function LinkModal({ g, onClose }: { g: Guardian; onClose: () => void }) {
  const toast = useToast();
  const st = useSWR('students:aktif', () => getStudents(false), { ttl: 60_000 });
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string>('');
  const [hub, setHub] = useState(g.hubungan || 'Ayah');
  const [busy, setBusy] = useState(false);
  const list = (st.data || []).filter((s) => !q || norm(s.nama).includes(norm(q)) || s.nis.includes(q)).slice(0, 30);
  async function save() {
    const s = st.data?.find((x) => x.id === sel);
    if (!s) { toast.warn('Pilih siswa terlebih dahulu.'); return; }
    setBusy(true);
    try { await createLink({ id: s.id, nama: s.nama }, { id: g.id, nama: g.nama }, hub); invalidate('links'); invalidate('count:relasi'); toast.ok('Relasi dibuat dengan status menunggu verifikasi.'); onClose(); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Hubungkan ${g.nama} ke siswa`}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={save} loading={busy} disabled={!sel}>Buat Relasi</Button></>}>
      <div className="grid gap-4">
        <Note>Relasi baru berstatus <b>menunggu</b>. Wali baru dapat melihat data anak setelah diverifikasi di menu Verifikasi Relasi.</Note>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau NIS siswa" />
        <div className="max-h-64 overflow-y-auto rounded-lg border border-line" role="radiogroup" aria-label="Pilih siswa">
          {st.loading ? <p className="p-4 caption">Memuat siswa…</p> : !list.length ? <p className="p-4 caption">Tidak ada siswa cocok.</p> : list.map((s) => (
            <label key={s.id} className={`flex min-h-12 cursor-pointer items-center gap-3 border-b border-line px-3 last:border-0 ${sel === s.id ? 'bg-brand-tint' : 'hover:bg-canvas'}`}>
              <input type="radio" name="siswa" checked={sel === s.id} onChange={() => setSel(s.id)} className="accent-brand-600" />
              <span className="min-w-0 flex-1 text-sm"><b>{s.nama}</b> <span className="caption">· NIS {s.nis}{s.className ? ` · Kelas ${s.className}` : ''}</span></span>
            </label>
          ))}
        </div>
        <Field label="Hubungan dengan siswa">{(id) => <Select id={id} value={hub} onChange={(e) => setHub(e.target.value)}>{HUBUNGAN.map((h) => <option key={h}>{h}</option>)}</Select>}</Field>
      </div>
    </Modal>
  );
}
