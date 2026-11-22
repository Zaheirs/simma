import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Landmark, Lock, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { authErrorMessage, useAuth } from '../../auth/AuthProvider';
import { Button, Field, Input, Note } from '../../components/ui';
import { BrandMark } from '../../components/layout/BrandMark';
import { CONFIG } from '../../lib/config';

export default function Login() {
  const { login, notice } = useAuth();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!id.trim() || !pw) { setErr('Isi Email / NIS dan kata sandi.'); return; }
    setBusy(true); setErr(null);
    try { await login(id, pw, remember); }
    catch (x) { setErr(authErrorMessage((x as FirebaseError).code)); setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-0 sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden bg-white sm:rounded-xl sm:border sm:border-line sm:shadow-modal lg:grid-cols-[1fr_1.05fr]">
        {/* Panel identitas (desktop) */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
          <BrandMark className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 opacity-[.07]" />
          <div>
            <div className="flex items-center gap-4">
              <BrandMark className="h-14 w-14" filled />
              <div>
                <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.08em] text-gold-tint">Portal Akademik & Tata Kelola</span>
                <p className="mt-1 text-4xl font-bold tracking-tight">SIMMA</p>
                <p className="text-sm text-white/70">Sistem Informasi Manajemen Madrasah</p>
              </div>
            </div>
            <div className="my-8 h-px w-32 bg-gold" />
            <p className="text-[15px] font-semibold text-gold-tint">MI. Miftahul Ulum Semampir, Surabaya</p>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/85">Satu sistem untuk data induk, akademik, keuangan, dan komunikasi madrasah.</p>
            <ul className="mt-8 grid gap-3">
              {[
                [ShieldCheck, 'Akses sesuai peran', 'Setiap pengguna hanya melihat data yang menjadi kewenangannya.'],
                [GraduationCap, 'Data siswa terpusat', 'Riwayat kelas tersimpan per tahun pelajaran, tidak ditimpa.'],
                [Landmark, 'Keuangan tertib', 'Transaksi tercatat sebagai buku besar yang tidak bisa dihapus.'],
              ].map(([I, t, d]) => {
                const Ic = I as typeof ShieldCheck;
                return (
                  <li key={t as string} className="flex gap-3 rounded-lg bg-white/[.06] p-3.5">
                    <Ic className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
                    <div><p className="text-sm font-semibold">{t as string}</p><p className="text-[13px] text-white/70">{d as string}</p></div>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-xs text-white/50">SIMMA versi {CONFIG.version}</p>
        </section>

        {/* Formulir */}
        <section className="flex min-h-screen flex-col justify-center px-6 py-10 sm:min-h-0 sm:px-12 lg:py-16">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark className="h-12 w-12" filled />
              <div><p className="text-2xl font-bold text-brand">SIMMA</p><p className="caption">MI. Miftahul Ulum Semampir</p></div>
            </div>
            <p className="eyebrow flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" aria-hidden /> Portal masuk resmi</p>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight">Masuk ke SIMMA</h1>
            <p className="mt-1 text-sm text-ink-2">Gunakan akun yang diberikan madrasah.</p>

            {notice && <Note tone="warn" className="mt-5">{notice}</Note>}

            <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
              <Field label="Email / NIS">
                {(fid) => (
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                    <Input id={fid} value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
                      placeholder="contoh: 2023045 atau nama@email.com" className="h-12 pl-9 sm:h-12" invalid={!!err} />
                  </div>
                )}
              </Field>
              <Field label="Kata Sandi">
                {(fid) => (
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                    <Input id={fid} type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password"
                      placeholder="Masukkan kata sandi" className="h-12 pl-9 pr-12 sm:h-12" invalid={!!err} />
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded text-ink-2 hover:text-ink">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </Field>
              <div className="flex items-center justify-between gap-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-[18px] w-[18px] accent-brand-600" />
                  Ingat saya di perangkat ini
                </label>
                <Link to="/lupa-sandi" className="text-sm font-semibold text-brand-600 underline-offset-2 hover:underline">Lupa kata sandi?</Link>
              </div>
              {err && <Note tone="bad">{err}</Note>}
              <Button type="submit" size="lg" block loading={busy} icon={<LogIn className="h-4 w-4" />}>Masuk</Button>
            </form>

            <Note className="mt-6">Akun dibuat oleh operator madrasah. Siswa dan wali murid cukup mengetik <b>NIS</b> atau nama pengguna yang dibagikan operator. Tidak ada pendaftaran mandiri.</Note>
            <p className="mt-6 text-center text-xs text-ink-muted">Matikan "Ingat saya" bila memakai komputer bersama.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
