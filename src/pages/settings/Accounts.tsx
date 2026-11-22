/* Akun & Peran. Akun Firebase dibuat/dinonaktifkan/di-reset lewat GAS (Accounts.gs) yang memeriksa peran pemanggil.
 * Tidak ada pendaftaran mandiri (PRD §3.2). Operator tidak bisa memberi peran pimpinan/keuangan/sistem. */
import { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Copy, KeyRound, Pencil, Plus, Power, UserCog } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { db } from '../../lib/firebase';
import { callGas } from '../../lib/gas';
import { CONFIG, toLoginEmail } from '../../lib/config';
import { can, ROLE_KEYS, ROLES, type RoleKey } from '../../lib/rbac';
import { invalidate, useSWR } from '../../lib/swr';
import { useDebounced } from '../../lib/hooks';
import { audit, getGuardians, getStaff, getStudents, getUsers, saveUserProfile } from '../../services/data';
import { norm } from '../../lib/format';
import type { UserProfile } from '../../lib/types';
import { Avatar, Badge, Button, Card, ConfirmModal, cx, EmptyState, Field, IconButton, Input, Modal, Note, PageHeader, SearchInput, Select, TableSkeleton, Tabs } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

const OPERATOR_OK: RoleKey[] = ['guru', 'wali_kelas', 'tu', 'pustakawan', 'panitia_spmb', 'siswa', 'wali_murid'];

export function genPassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const a = new Uint32Array(10); crypto.getRandomValues(a);
  return 'Sm' + Array.from(a, (x) => c[x % c.length]).join('') + '#7';
}

export default function Accounts() {
  const { role, user } = useAuth();
  const u = useSWR('users', getUsers, { ttl: 60_000 });
  const [tab, setTab] = useState<'staf' | 'siswa' | 'wali'>('staf');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [form, setForm] = useState<UserProfile | 'new' | null>(null);
  const [toggle, setToggle] = useState<UserProfile | null>(null);
  const [reset, setReset] = useState<UserProfile | null>(null);
  const [secret, setSecret] = useState<{ login: string; pw: string } | null>(null);
  const canEdit = can(role, 'akun.kelola');
  const allowed = role === 'super_admin' ? ROLE_KEYS : OPERATOR_OK;
  const editable = (x: UserProfile) => canEdit && x.uid !== user?.uid && x.roles.every((r) => allowed.includes(r));

  const rows = useMemo(() => (u.data || []).filter((x) => {
    const grp = x.roles.includes('wali_murid') ? 'wali' : x.roles.includes('siswa') ? 'siswa' : 'staf';
    return grp === tab && (!dq || norm(x.nama).includes(norm(dq)) || norm(x.email).includes(norm(dq)));
  }), [u.data, tab, dq]);

  return (
    <>
      <PageHeader eyebrow="Pengaturan" title="Akun & Peran" subtitle="Setiap orang memiliki akun sendiri. Satu akun boleh memiliki lebih dari satu peran."
        actions={canEdit && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm('new')} disabled={!CONFIG.gasUrl}>Buat Akun</Button>} />
      {!CONFIG.gasUrl && <Note tone="warn" className="mb-4">Server Apps Script belum tersambung (<code>VITE_GAS_URL</code>). Pembuatan akun, penonaktifan, dan reset sandi memerlukannya.</Note>}
      <Card>
        <div className="px-4 pt-2 sm:px-5"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'staf', label: 'Pendidik & Tendik' }, { key: 'siswa', label: 'Siswa' }, { key: 'wali', label: 'Wali Murid' }]} /></div>
        <div className="p-4 sm:px-5"><SearchInput value={q} onChange={setQ} placeholder="Cari nama atau email/NIS" className="max-w-md" /></div>
        {u.loading ? <TableSkeleton /> : !rows.length ? <EmptyState icon={<UserCog className="h-7 w-7" />} title="Belum ada akun di kelompok ini" /> : (
          <ul className="divide-y divide-line">
            {rows.map((x) => (
              <li key={x.uid} className={cx('flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5', x.status !== 'aktif' && 'opacity-60')}>
                <Avatar nama={x.nama} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{x.nama} {x.uid === user?.uid && <span className="caption font-normal">(Anda)</span>}</p>
                  <p className="caption truncate">{x.email.endsWith('@' + CONFIG.loginDomain) ? `Masuk dengan: ${x.email.split('@')[0]}` : x.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {x.roles.map((r) => <Badge key={r} tone={r === 'super_admin' || r === 'kepala' ? 'gold' : 'brand'}>{ROLES[r]?.label || r}</Badge>)}
                    <Badge tone={x.status === 'aktif' ? 'ok' : 'neutral'}>{x.status === 'aktif' ? 'Aktif' : 'Nonaktif'}</Badge>
                    {x.mustChangePassword && <Badge tone="warn">Belum ganti sandi</Badge>}
                  </div>
                </div>
                {editable(x) && (
                  <div className="flex gap-1">
                    <IconButton label="Atur peran" onClick={() => setForm(x)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label="Atur ulang kata sandi" onClick={() => setReset(x)} disabled={!CONFIG.gasUrl}><KeyRound className="h-4 w-4" /></IconButton>
                    <IconButton label={x.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => setToggle(x)} disabled={!CONFIG.gasUrl} className={x.status === 'aktif' ? 'hover:text-bad' : 'hover:text-ok'}><Power className="h-4 w-4" /></IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {form && <AccountModal init={form === 'new' ? null : form} allowed={allowed} defaultGroup={tab} onClose={() => setForm(null)} onSecret={setSecret} />}
      {toggle && <ToggleModal u={toggle} onClose={() => setToggle(null)} />}
      {reset && <ResetModal u={reset} onClose={() => setReset(null)} onSecret={setSecret} />}
      {secret && <SecretModal {...secret} onClose={() => setSecret(null)} />}
    </>
  );
}

function AccountModal({ init, allowed, defaultGroup, onClose, onSecret }: { init: UserProfile | null; allowed: RoleKey[]; defaultGroup: string; onClose: () => void; onSecret: (s: { login: string; pw: string }) => void }) {
  const toast = useToast();
  const isNew = !init;
  const [nama, setNama] = useState(init?.nama || '');
  const [login, setLogin] = useState('');
  const [roles, setRoles] = useState<RoleKey[]>(init?.roles || (defaultGroup === 'siswa' ? ['siswa'] : defaultGroup === 'wali' ? ['wali_murid'] : ['guru']));
  const [staffId, setStaffId] = useState(init?.staffId || '');
  const [studentId, setStudentId] = useState(init?.studentId || '');
  const [guardianId, setGuardianId] = useState(init?.guardianId || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const staff = useSWR(roles.some((r) => !['siswa', 'wali_murid'].includes(r)) ? 'staff' : null, getStaff, { ttl: 2 * 60_000 });
  const students = useSWR(roles.includes('siswa') ? 'students:aktif' : null, () => getStudents(false), { ttl: 60_000 });
  const guardians = useSWR(roles.includes('wali_murid') ? 'guardians' : null, getGuardians, { ttl: 2 * 60_000 });

  const flip = (r: RoleKey) => setRoles((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));
  const pickPerson = (kind: 'staff' | 'student' | 'guardian', id: string) => {
    if (kind === 'staff') { setStaffId(id); const s = staff.data?.find((x) => x.id === id); if (s && !nama) setNama(s.nama); }
    if (kind === 'student') { setStudentId(id); const s = students.data?.find((x) => x.id === id); if (s) { if (!nama) setNama(s.nama); if (!login) setLogin(s.nis); } }
    if (kind === 'guardian') { setGuardianId(id); const g = guardians.data?.find((x) => x.id === id); if (g && !nama) setNama(g.nama); }
  };

  async function save() {
    setErr(null);
    if (nama.trim().length < 3) return setErr('Nama minimal 3 huruf.');
    if (!roles.length) return setErr('Pilih minimal satu peran.');
    if (roles.some((r) => !allowed.includes(r))) return setErr('Anda tidak berwenang memberi salah satu peran tersebut.');
    if (roles.includes('siswa') && !studentId) return setErr('Akun siswa wajib dihubungkan ke data siswa.');
    if (roles.includes('wali_murid') && !guardianId) return setErr('Akun wali murid wajib dihubungkan ke data orang tua/wali.');
    const profile: Partial<UserProfile> = { nama: nama.trim(), roles, status: init?.status || 'aktif', staffId: staffId || null, studentId: studentId || null, guardianId: guardianId || null };
    setBusy(true);
    try {
      if (isNew) {
        if (!/^[\w.@+-]{3,}$/.test(login.trim())) { setBusy(false); return setErr('Isi email atau nama pengguna (minimal 3 karakter, tanpa spasi).'); }
        const email = toLoginEmail(login), pw = genPassword();
        const r = await callGas<{ uid: string }>('createUser', { email, password: pw, nama: nama.trim(), roles }, { write: true });
        await saveUserProfile(r.uid, { ...profile, email, mustChangePassword: true }, true);
        if (staffId) await updateDoc(doc(db, 'staff', staffId), { userUid: r.uid }).catch(() => {});
        if (guardianId) await updateDoc(doc(db, 'guardians', guardianId), { userUid: r.uid }).catch(() => {});
        onSecret({ login: login.trim().includes('@') ? email : login.trim(), pw });
        toast.ok('Akun dibuat. Bagikan kata sandi awal secara langsung.');
        invalidate('staff'); invalidate('guardians');
      } else {
        await saveUserProfile(init.uid, profile, false, init);
        toast.ok('Peran akun diperbarui.');
      }
      invalidate('users'); invalidate('dash');
      onClose();
    } catch (x) {
      const m = (x as Error).message;
      setErr(m.includes('EMAIL_EXISTS') ? 'Email/nama pengguna ini sudah memiliki akun.' : m.includes('permission') ? 'Izin ditolak oleh aturan keamanan.' : m);
    } finally { setBusy(false); }
  }

  const needStaff = roles.some((r) => !['siswa', 'wali_murid'].includes(r));
  return (
    <Modal open onClose={onClose} title={isNew ? 'Buat Akun Baru' : `Atur Peran · ${init.nama}`} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button onClick={save} loading={busy}>{isNew ? 'Buat Akun' : 'Simpan'}</Button></>}>
      <div className="grid gap-5">
        <fieldset>
          <legend className="label mb-2 text-ink">Peran <span className="text-bad">*</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_KEYS.map((r) => {
              const ok = allowed.includes(r);
              return (
                <label key={r} className={cx('flex min-h-12 items-start gap-2.5 rounded-lg border px-3 py-2', roles.includes(r) ? 'border-brand-600 bg-brand-tint' : 'border-line', ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-45')}>
                  <input type="checkbox" checked={roles.includes(r)} onChange={() => ok && flip(r)} disabled={!ok} className="mt-0.5 h-[18px] w-[18px] accent-brand-600" />
                  <span><span className="block text-sm font-semibold">{ROLES[r].label}</span><span className="caption">{ROLES[r].scope}</span></span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {needStaff && <Field label="Hubungkan ke data guru/tendik" hint="Opsional, agar nama & jabatan konsisten">{(id) => (
          <Select id={id} value={staffId} onChange={(e) => pickPerson('staff', e.target.value)}><option value="">— Tidak dihubungkan —</option>{(staff.data || []).map((s) => <option key={s.id} value={s.id}>{s.nama}{s.userUid && s.userUid !== init?.uid ? ' (sudah punya akun)' : ''}</option>)}</Select>
        )}</Field>}
        {roles.includes('siswa') && <Field label="Data siswa" required>{(id) => (
          <Select id={id} value={studentId} onChange={(e) => pickPerson('student', e.target.value)}><option value="">— Pilih siswa —</option>{(students.data || []).map((s) => <option key={s.id} value={s.id}>{s.nama} · NIS {s.nis}</option>)}</Select>
        )}</Field>}
        {roles.includes('wali_murid') && <Field label="Data orang tua/wali" required hint="Akses ke data anak tetap menunggu verifikasi relasi.">{(id) => (
          <Select id={id} value={guardianId} onChange={(e) => pickPerson('guardian', e.target.value)}><option value="">— Pilih orang tua/wali —</option>{(guardians.data || []).map((g) => <option key={g.id} value={g.id}>{g.nama}{g.hp ? ` · ${g.hp}` : ''}</option>)}</Select>
        )}</Field>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama lengkap" required>{(id) => <Input id={id} value={nama} onChange={(e) => setNama(e.target.value)} />}</Field>
          {isNew && <Field label="Email atau nama pengguna" required hint={`Tanpa "@" → masuk cukup dengan nama itu (mis. NIS ${'2023045'} atau w2023045 untuk wali).`}>
            {(id) => <Input id={id} value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" spellCheck={false} placeholder="guru@email.com atau 2023045" />}
          </Field>}
        </div>
        {isNew && <Note>Kata sandi awal dibuat otomatis dan hanya tampil sekali. Pengguna wajib menggantinya saat masuk pertama.</Note>}
        {err && <Note tone="bad">{err}</Note>}
      </div>
    </Modal>
  );
}

function ToggleModal({ u, onClose }: { u: UserProfile; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const off = u.status === 'aktif';
  async function go() {
    setBusy(true);
    try {
      await callGas('setDisabled', { uid: u.uid, disabled: off }, { write: true });
      await saveUserProfile(u.uid, { status: off ? 'nonaktif' : 'aktif', roles: u.roles }, false, u);
      await audit(off ? 'nonaktif_akun' : 'aktif_akun', 'users', u.uid);
      invalidate('users'); toast.ok(off ? 'Akun dinonaktifkan. Riwayat aktivitasnya tetap tersimpan.' : 'Akun diaktifkan kembali.'); onClose();
    } catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <ConfirmModal open onClose={onClose} onConfirm={go} loading={busy} danger={off} title={off ? 'Nonaktifkan akun?' : 'Aktifkan akun?'} confirmLabel={off ? 'Nonaktifkan' : 'Aktifkan'}>
      {off ? <><b>{u.nama}</b> tidak bisa masuk lagi dan sesi yang sedang berjalan akan terputus. Akun tidak dihapus.</> : <><b>{u.nama}</b> dapat masuk kembali dengan kata sandi terakhirnya.</>}
    </ConfirmModal>
  );
}

function ResetModal({ u, onClose, onSecret }: { u: UserProfile; onClose: () => void; onSecret: (s: { login: string; pw: string }) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const pw = genPassword();
      await callGas('resetPassword', { uid: u.uid, password: pw }, { write: true });
      await updateDoc(doc(db, 'users', u.uid), { mustChangePassword: true, roles: u.roles });
      await audit('reset_sandi', 'users', u.uid);
      invalidate('users');
      onSecret({ login: u.email.endsWith('@' + CONFIG.loginDomain) ? u.email.split('@')[0] : u.email, pw });
      onClose();
    } catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <ConfirmModal open onClose={onClose} onConfirm={go} loading={busy} title="Atur ulang kata sandi?" confirmLabel="Buat Sandi Baru">
      Kata sandi baru untuk <b>{u.nama}</b> akan dibuat dan hanya tampil sekali. Pengguna wajib menggantinya saat masuk.
    </ConfirmModal>
  );
}

function SecretModal({ login, pw, onClose }: { login: string; pw: string; onClose: () => void }) {
  const toast = useToast();
  const text = `Akun SIMMA\nMasuk dengan: ${login}\nKata sandi awal: ${pw}\nAlamat: ${location.origin}${location.pathname}`;
  return (
    <Modal open onClose={onClose} title="Catat kata sandi awal" size="sm" footer={<Button onClick={onClose}>Sudah saya catat</Button>}>
      <Note tone="warn">Kata sandi ini <b>hanya tampil sekali</b> dan tidak disimpan di mana pun. Serahkan langsung kepada pemilik akun.</Note>
      <dl className="mt-4 grid gap-2 rounded-lg bg-surface-recessed p-4 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-ink-2">Masuk dengan</dt><dd className="font-semibold">{login}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-2">Kata sandi awal</dt><dd className="font-mono font-semibold tracking-wide">{pw}</dd></div>
      </dl>
      <Button className="mt-3" variant="secondary" block icon={<Copy className="h-4 w-4" />} onClick={async () => { try { await navigator.clipboard.writeText(text); toast.ok('Tersalin.'); } catch { toast.warn('Salin manual dari kotak di atas.'); } }}>Salin untuk dibagikan</Button>
    </Modal>
  );
}
