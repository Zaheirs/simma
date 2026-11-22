import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RefreshCw, UserX } from 'lucide-react';
import { useAuth } from './auth/AuthProvider';
import { CONFIG_OK } from './lib/config';
import { can, type Perm } from './lib/rbac';
import { setActorNama } from './services/data';
import { AppShell } from './components/layout/AppShell';
import { Button, EmptyState, Skeleton } from './components/ui';
import Login from './pages/auth/Login';
import { FirstPassword, ForgotPassword, RolePicker } from './pages/auth/AuthMisc';

// Halaman dimuat sesuai kebutuhan (code splitting) agar pembukaan pertama ringan di HP.
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Students = lazy(() => import('./pages/data-induk/Students'));
const StudentDetail = lazy(() => import('./pages/data-induk/StudentDetail'));
const StudentForm = lazy(() => import('./pages/data-induk/StudentForm'));
const StaffPage = lazy(() => import('./pages/data-induk/Staff'));
const Guardians = lazy(() => import('./pages/data-induk/Guardians'));
const Relations = lazy(() => import('./pages/data-induk/Relations'));
const Academic = lazy(() => import('./pages/data-induk/Academic'));
const ImportPage = lazy(() => import('./pages/data-induk/Import'));
const Accounts = lazy(() => import('./pages/settings/Accounts'));
const Identity = lazy(() => import('./pages/settings/Identity'));
const AuditPage = lazy(() => import('./pages/settings/Audit'));
const Profile = lazy(() => import('./pages/settings/Profile'));
const ComingSoon = lazy(() => import('./pages/ComingSoon'));

// Muat awal halaman yang paling sering dibuka saat browser senggang → perpindahan menu terasa instan.
function prefetch() {
  const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback || ((f: () => void) => setTimeout(f, 1200));
  idle(() => { import('./pages/data-induk/Students'); import('./pages/data-induk/StudentDetail'); import('./pages/settings/Profile'); });
}

function PageFallback() {
  return <div className="grid gap-4" aria-busy="true"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-full" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-72" /></div>;
}

function Boot() {
  return <div className="grid min-h-screen place-items-center bg-canvas text-center"><div><p className="text-xl font-bold text-brand">SIMMA</p><div className="mx-auto mt-3 h-1 w-28 overflow-hidden rounded bg-brand-tint"><div className="h-full w-1/3 animate-pulse bg-brand" /></div></div></div>;
}

function RequirePerm({ perm, children }: { perm: Perm; children: ReactNode }) {
  const { role } = useAuth();
  if (!can(role, perm)) return <EmptyState icon={<UserX className="h-7 w-7" />} title="Halaman ini bukan untuk peran Anda" text="Bila Anda memiliki beberapa peran, ganti peran aktif melalui menu profil." />;
  return <>{children}</>;
}

function UpdateBar() {
  const [w, setW] = useState<ServiceWorker | null>(null);
  useEffect(() => { const f = (e: Event) => setW((e as CustomEvent<ServiceWorker>).detail); window.addEventListener('simma:update', f); return () => window.removeEventListener('simma:update', f); }, []);
  if (!w) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-modal lg:bottom-4">
      <RefreshCw className="h-4 w-4 shrink-0" aria-hidden /><span className="flex-1">Versi baru SIMMA tersedia.</span>
      <button type="button" className="font-semibold text-gold" onClick={() => w.postMessage('SKIP_WAITING')}>Perbarui</button>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-6">
      <div className="card max-w-lg p-8">
        <h1 className="h2">Konfigurasi belum lengkap</h1>
        <p className="mt-2 text-sm text-ink-2">Alamat Firebase belum diisi. Di GitHub buka <b>Settings → Secrets and variables → Actions → Variables</b>, isi <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>, <code>VITE_FIREBASE_PROJECT_ID</code>, <code>VITE_FIREBASE_APP_ID</code>, lalu jalankan ulang workflow <b>Deploy SIMMA</b>. Lihat PANDUAN-INSTALASI.md tahap B.</p>
      </div>
    </div>
  );
}

export default function App() {
  const { phase, profile, role, logout } = useAuth();
  useEffect(() => { if (profile) { setActorNama(profile.nama); prefetch(); } }, [profile]);

  if (!CONFIG_OK) return <ConfigMissing />;
  if (phase === 'loading') return <Boot />;
  if (phase === 'signedOut') return (
    <Routes>
      <Route path="/lupa-sandi" element={<ForgotPassword />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );
  if (phase === 'noProfile') return (
    <div className="grid min-h-screen place-items-center bg-canvas p-6">
      <div className="card max-w-md p-6 text-center">
        <EmptyState icon={<UserX className="h-7 w-7" />} title="Akun belum terdaftar di SIMMA" text="Akun login Anda ada, tetapi belum diberi peran oleh admin. Hubungi operator madrasah." action={<Button variant="secondary" onClick={() => logout()}>Keluar</Button>} />
      </div>
    </div>
  );
  if (profile?.mustChangePassword) return <FirstPassword />;
  if (!role) return <RolePicker />;

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pilih-peran" element={<RolePicker />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/siswa" element={<RequirePerm perm="siswa.lihat"><Students /></RequirePerm>} />
          <Route path="/siswa/baru" element={<RequirePerm perm="siswa.kelola"><StudentForm /></RequirePerm>} />
          <Route path="/siswa/:nis" element={<RequirePerm perm="siswa.lihat"><StudentDetail /></RequirePerm>} />
          <Route path="/siswa/:nis/ubah" element={<RequirePerm perm="siswa.kelola"><StudentForm /></RequirePerm>} />
          <Route path="/guru" element={<RequirePerm perm="guru.lihat"><StaffPage /></RequirePerm>} />
          <Route path="/wali" element={<RequirePerm perm="wali.lihat"><Guardians /></RequirePerm>} />
          <Route path="/relasi" element={<RequirePerm perm="relasi.verifikasi"><Relations /></RequirePerm>} />
          <Route path="/akademik" element={<RequirePerm perm="akademik.kelola"><Academic /></RequirePerm>} />
          <Route path="/impor" element={<RequirePerm perm="impor"><ImportPage /></RequirePerm>} />
          <Route path="/pengaturan/akun" element={<RequirePerm perm="akun.lihat"><Accounts /></RequirePerm>} />
          <Route path="/pengaturan/identitas" element={<RequirePerm perm="pengaturan.lihat"><Identity /></RequirePerm>} />
          <Route path="/pengaturan/audit" element={<RequirePerm perm="audit.lihat"><AuditPage /></RequirePerm>} />
          <Route path="/pengumuman" element={<ComingSoon modul="pengumuman" />} />
          <Route path="/segera/:modul" element={<ComingSoon />} />
          <Route path="/lupa-sandi" element={<Navigate to="/profil" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <UpdateBar />
    </AppShell>
  );
}
