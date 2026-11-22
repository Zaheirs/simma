import { useMemo, useState } from 'react';
import { Pencil, Plus, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { can } from '../../lib/rbac';
import { invalidate, useSWR } from '../../lib/swr';
import { useDebounced } from '../../lib/hooks';
import { getStaff, saveStaff } from '../../services/data';
import { norm } from '../../lib/format';
import type { Staff } from '../../lib/types';
import { Avatar, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, SearchInput, Select, TableSkeleton, Td, Th } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

export default function StaffPage() {
  const { role } = useAuth();
  const s = useSWR('staff', getStaff, { ttl: 2 * 60_000 });
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [edit, setEdit] = useState<Partial<Staff> | null>(null);
  const canEdit = can(role, 'guru.kelola');
  const rows = useMemo(() => (s.data || []).filter((x) => !dq || norm(x.nama).includes(norm(dq)) || (x.nip || '').includes(dq)), [s.data, dq]);

  return (
    <>
      <PageHeader eyebrow="Data Induk" title="Guru & Tenaga Kependidikan" subtitle="Daftar pendidik dan tenaga kependidikan. Akun login dibuat di menu Akun & Peran."
        actions={canEdit && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ status: 'aktif' })}>Tambah Guru/Tendik</Button>} />
      <Card>
        <div className="p-4 sm:px-5"><SearchInput value={q} onChange={setQ} placeholder="Cari nama atau NIP" className="max-w-md" /></div>
        {s.loading ? <TableSkeleton cols={4} /> : !rows.length ? (
          <EmptyState icon={<Users className="h-7 w-7" />} title={s.data?.length ? 'Tidak ada yang cocok' : 'Belum ada data guru'} action={canEdit && !s.data?.length ? <Button onClick={() => setEdit({ status: 'aktif' })}>Tambah Guru/Tendik</Button> : undefined} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead><tr><Th>Nama</Th><Th>NIP / NIY</Th><Th>Jabatan</Th><Th>No. HP</Th><Th>Akun SIMMA</Th><Th>Status</Th>{canEdit && <Th className="text-right">Aksi</Th>}</tr></thead>
                <tbody>{rows.map((x) => (
                  <tr key={x.id} className="hover:bg-canvas">
                    <Td><span className="flex items-center gap-3"><Avatar nama={x.nama} size={34} /><span className="font-semibold">{x.nama}</span></span></Td>
                    <Td className="text-ink-2">{x.nip || '–'}</Td><Td>{x.jabatan || '–'}</Td><Td className="text-ink-2">{x.hp || '–'}</Td>
                    <Td>{x.userUid ? <Badge tone="ok">Terhubung</Badge> : <Badge>Belum dibuat</Badge>}</Td>
                    <Td><Badge tone={x.status === 'aktif' ? 'ok' : 'neutral'}>{x.status === 'aktif' ? 'Aktif' : 'Nonaktif'}</Badge></Td>
                    {canEdit && <Td className="text-right"><IconButton label={`Ubah ${x.nama}`} onClick={() => setEdit(x)}><Pencil className="h-4 w-4" /></IconButton></Td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">{rows.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar nama={x.nama} size={42} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{x.nama}</span><span className="caption">{x.jabatan || 'Guru'} · {x.userUid ? 'Akun terhubung' : 'Belum ada akun'}</span></span>
                {canEdit && <IconButton label={`Ubah ${x.nama}`} onClick={() => setEdit(x)}><Pencil className="h-4 w-4" /></IconButton>}
              </li>
            ))}</ul>
          </>
        )}
      </Card>
      {edit && <StaffModal init={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function StaffModal({ init, onClose }: { init: Partial<Staff>; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ nama: init.nama || '', nip: init.nip || '', jabatan: init.jabatan || '', hp: init.hp || '', email: init.email || '', status: init.status || 'aktif' });
  const [busy, setBusy] = useState(false);
  const [e, setE] = useState<string | null>(null);
  async function save() {
    if (f.nama.trim().length < 3) { setE('Nama minimal 3 huruf.'); return; }
    if (f.hp && !/^(\+62|0)8\d{7,12}$/.test(f.hp.replace(/[\s-]/g, ''))) { setE('Nomor HP tidak valid (contoh 081234567890).'); return; }
    setBusy(true);
    try { await saveStaff({ ...init, ...f, nama: f.nama.trim(), userUid: init.userUid || null } as Staff); invalidate('staff'); invalidate('dash'); toast.ok('Data guru/tendik tersimpan.'); onClose(); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={init.id ? 'Ubah Guru/Tendik' : 'Tambah Guru/Tendik'}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4">
        <Field label="Nama lengkap & gelar" required error={e}>{(id) => <Input id={id} value={f.nama} onChange={(x) => setF({ ...f, nama: x.target.value })} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIP / NIY">{(id) => <Input id={id} inputMode="numeric" value={f.nip} onChange={(x) => setF({ ...f, nip: x.target.value })} />}</Field>
          <Field label="Jabatan">{(id) => <Input id={id} value={f.jabatan} onChange={(x) => setF({ ...f, jabatan: x.target.value })} placeholder="mis. Guru Kelas" />}</Field>
          <Field label="No. HP">{(id) => <Input id={id} inputMode="tel" value={f.hp} onChange={(x) => setF({ ...f, hp: x.target.value })} placeholder="08…" />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} />}</Field>
        </div>
        <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={(x) => setF({ ...f, status: x.target.value as 'aktif' | 'nonaktif' })}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></Select>}</Field>
      </div>
    </Modal>
  );
}
