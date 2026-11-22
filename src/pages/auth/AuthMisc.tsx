/* Halaman ganti kata sandi (wajib saat masuk pertama), lupa kata sandi, dan pilih peran. */
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound, MailCheck } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { isNisAccount, toLoginEmail } from '../../lib/config';
import { authErrorMessage, useAuth } from '../../auth/AuthProvider';
import { ROLES, type RoleKey } from '../../lib/rbac';
import { Button, cx, Field, Input, Note } from '../../components/ui';
import { BrandMark } from '../../components/layout/BrandMark';
import { useToast } from '../../components/ui/Toast';

function CenterCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3"><BrandMark className="h-11 w-11" filled /><div><p className="text-xl font-bold text-brand">SIMMA</p><p className="caption">MI. Miftahul Ulum Semampir</p></div></div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

export function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}
function Meter({ pw }: { pw: string }) {
  const s = strength(pw);
  const c = ['bg-line', 'bg-bad', 'bg-warn', 'bg-gold', 'bg-ok'][s];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1" aria-hidden>{[1, 2, 3, 4].map((i) => <span key={i} className={cx('h-1.5 flex-1 rounded-full', i <= s ? c : 'bg-line')} />)}</div>
      <p className="caption mt-1">Kekuatan sandi: {['belum diisi', 'lemah', 'cukup', 'baik', 'kuat'][s]}</p>
    </div>
  );
}

/** Form ganti sandi. `first` = masuk pertama (tanpa sandi lama, karena baru saja login). */
export function PasswordForm({ first, onDone }: { first?: boolean; onDone?: () => void }) {
  const toast = useToast();
  const [old, setOld] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (a.length < 8) return setErr('Kata sandi baru minimal 8 karakter.');
    if (strength(a) < 2) return setErr('Kata sandi terlalu mudah ditebak. Gabungkan huruf besar, huruf kecil, dan angka.');
    if (a !== b) return setErr('Ulangi kata sandi tidak sama.');
    const u = auth.currentUser!;
    setBusy(true);
    try {
      if (!first) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email!, old));
      await updatePassword(u, a);
      await updateDoc(doc(db, 'users', u.uid), { mustChangePassword: false, updatedAt: serverTimestamp() });
      toast.ok('Kata sandi berhasil diganti.');
      setOld(''); setA(''); setB('');
      onDone?.();
    } catch (x) { setErr(authErrorMessage((x as FirebaseError).code)); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {!first && <Field label="Kata sandi saat ini" required>{(id) => <Input id={id} type="password" autoComplete="current-password" value={old} onChange={(e) => setOld(e.target.value)} />}</Field>}
      <Field label="Kata sandi baru" required>{(id) => <><Input id={id} type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} /><Meter pw={a} /></>}</Field>
      <Field label="Ulangi kata sandi baru" required>{(id) => <Input id={id} type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} invalid={!!b && a !== b} />}</Field>
      {err && <Note tone="bad">{err}</Note>}
      <Button type="submit" block={first} loading={busy} icon={<KeyRound className="h-4 w-4" />}>{first ? 'Simpan & Lanjutkan' : 'Ganti Kata Sandi'}</Button>
    </form>
  );
}

export function FirstPassword() {
  const { logout } = useAuth();
  return (
    <CenterCard>
      <h1 className="h2">Ganti kata sandi pertama</h1>
      <Note tone="warn" className="my-4">Demi keamanan, ganti kata sandi bawaan dari operator sebelum melanjutkan.</Note>
      <PasswordForm first />
      <button type="button" onClick={() => logout()} className="mt-4 w-full text-center text-sm text-ink-2 hover:text-ink">Keluar</button>
    </CenterCard>
  );
}

export function ForgotPassword() {
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'idle' | 'sent' | 'nis'>('idle');
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const email = toLoginEmail(id);
    if (!id.trim()) return setErr('Isi email akun Anda.');
    if (isNisAccount(email)) { setState('nis'); return; }
    setBusy(true); setErr(null);
    try { await sendPasswordResetEmail(auth, email); setState('sent'); }
    catch (x) {
      const c = (x as FirebaseError).code;
      if (c === 'auth/user-not-found') setState('sent'); // jangan bocorkan email mana yang terdaftar
      else setErr(authErrorMessage(c));
    } finally { setBusy(false); }
  }
  return (
    <CenterCard>
      <h1 className="h2">Lupa kata sandi</h1>
      {state === 'sent' ? (
        <div className="mt-4 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-ok" aria-hidden />
          <p className="mt-3 text-sm text-ink-2">Bila email tersebut terdaftar, tautan untuk membuat sandi baru sudah dikirim. Periksa kotak masuk dan folder spam.</p>
        </div>
      ) : state === 'nis' ? (
        <Note tone="info" className="mt-4">Akun siswa dan wali murid tidak memakai email. Mintalah <b>operator madrasah</b> mengatur ulang kata sandi Anda dari menu Akun & Peran.</Note>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-4" noValidate>
          <p className="text-sm text-ink-2">Masukkan email akun Anda. Kami kirimkan tautan untuk membuat kata sandi baru.</p>
          <Field label="Email akun terdaftar" error={err}>{(fid) => <Input id={fid} type="email" autoComplete="email" value={id} onChange={(e) => setId(e.target.value)} placeholder="nama@email.com" />}</Field>
          <Button type="submit" variant="secondary" loading={busy} block>Kirim Tautan Reset</Button>
        </form>
      )}
      <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Kembali ke halaman masuk</Link>
    </CenterCard>
  );
}

export function RolePicker() {
  const { roles, role, setRole, profile, logout } = useAuth();
  const [sel, setSel] = useState<RoleKey | null>(role || roles[0] || null);
  const nav = useNavigate();
  const list = useMemo(() => roles, [roles]);
  return (
    <CenterCard>
      <h1 className="h2">Masuk sebagai</h1>
      <p className="caption mt-1">{profile?.nama}, akun Anda memiliki {list.length} hak akses. Pilih yang ingin dipakai sekarang.</p>
      <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Pilih peran">
        {list.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={sel === r} onClick={() => setSel(r)}
            className={cx('flex min-h-[64px] items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors', sel === r ? 'border-brand-600 bg-brand-tint ring-1 ring-brand-600' : 'border-line hover:bg-surface-recessed')}>
            <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold', sel === r ? 'bg-brand text-white' : 'bg-surface-recessed text-ink-2')}>{ROLES[r].label[0]}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">{ROLES[r].label}</span><span className="caption">{ROLES[r].scope}</span></span>
            {sel === r && <Check className="h-5 w-5 text-brand" aria-hidden />}
          </button>
        ))}
      </div>
      <Button className="mt-5" block size="lg" disabled={!sel} onClick={() => { if (sel) { setRole(sel); nav('/', { replace: true }); } }}>Lanjutkan</Button>
      <button type="button" onClick={() => logout()} className="mt-3 w-full text-center text-sm text-ink-2 hover:text-ink">Keluar</button>
    </CenterCard>
  );
}
