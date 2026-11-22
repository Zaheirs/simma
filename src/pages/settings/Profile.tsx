import { Link } from 'react-router-dom';
import { Download, LogOut, Repeat, Share, Smartphone } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useInstallPrompt } from '../../lib/hooks';
import { ROLES } from '../../lib/rbac';
import { isNisAccount } from '../../lib/config';
import { Avatar, Badge, Button, Card, CardHeader, Note, PageHeader } from '../../components/ui';
import { PasswordForm } from '../auth/AuthMisc';

export default function Profile() {
  const { profile, role, roles, logout } = useAuth();
  const inst = useInstallPrompt();
  if (!profile) return null;
  return (
    <>
      <PageHeader title="Profil & Kata Sandi" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid h-fit gap-5">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <Avatar nama={profile.nama} size={64} />
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{profile.nama}</h2>
                <p className="caption truncate">{isNisAccount(profile.email) ? `Masuk dengan: ${profile.email.split('@')[0]}` : profile.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">{roles.map((r) => <Badge key={r} tone={r === role ? 'solid' : 'brand'}>{ROLES[r].label}</Badge>)}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {roles.length > 1 && <Link to="/pilih-peran"><Button variant="secondary" icon={<Repeat className="h-4 w-4" />}>Ganti peran aktif</Button></Link>}
              <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={() => logout()}>Keluar</Button>
            </div>
          </Card>
          <Card>
            <CardHeader icon={<Smartphone className="h-4 w-4" />} title="Pasang SIMMA di HP" subtitle="Terbuka layar penuh seperti aplikasi, tanpa Play Store" />
            <div className="grid gap-3 p-5 text-sm">
              {inst.canInstall ? <Button icon={<Download className="h-4 w-4" />} onClick={inst.install}>Pasang Sekarang</Button>
                : inst.iosHint ? <Note>Di iPhone: buka di <b>Safari</b> → tombol <Share className="inline h-4 w-4" aria-label="Bagikan" /> <b>Bagikan</b> → <b>Tambahkan ke Layar Utama</b>.</Note>
                : <p className="text-ink-2">SIMMA sudah terpasang, atau browser ini belum menawarkan pemasangan. Di Android: menu ⋮ → <b>Instal aplikasi</b>.</p>}
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader title="Ganti Kata Sandi" subtitle="Minimal 8 karakter, gabungkan huruf besar, kecil, dan angka" />
          <div className="p-5"><PasswordForm /></div>
        </Card>
      </div>
    </>
  );
}
