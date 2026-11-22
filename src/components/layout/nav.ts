import type { LucideIcon } from 'lucide-react';
import { BookOpenCheck, Building2, CalendarCheck, ClipboardList, FileUp, GraduationCap, HeartHandshake, LayoutDashboard, Megaphone, ScrollText, Settings, ShieldCheck, UserCog, Users, Wallet } from 'lucide-react';
import { can, type Perm, type RoleKey } from '../../lib/rbac';

export interface NavItem { to: string; label: string; icon: LucideIcon; perm?: Perm; roles?: RoleKey[]; soon?: boolean; group: string; badgeKey?: 'relasi' }

/* Menu yang belum dibangun ditandai "Segera" (soon) agar pengguna tahu modulnya direncanakan — bukan tombol mati. */
export const NAV: NavItem[] = [
  { group: 'Utama', to: '/', label: 'Beranda', icon: LayoutDashboard },
  { group: 'Utama', to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, soon: true },

  { group: 'Data Induk', to: '/siswa', label: 'Siswa', icon: GraduationCap, perm: 'siswa.lihat' },
  { group: 'Data Induk', to: '/guru', label: 'Guru & Tendik', icon: Users, perm: 'guru.lihat' },
  { group: 'Data Induk', to: '/wali', label: 'Orang Tua / Wali', icon: HeartHandshake, perm: 'wali.lihat', roles: ['super_admin', 'kepala', 'operator', 'tu'] },
  { group: 'Data Induk', to: '/relasi', label: 'Verifikasi Relasi', icon: ShieldCheck, perm: 'relasi.verifikasi', badgeKey: 'relasi' },
  { group: 'Data Induk', to: '/akademik', label: 'Kelas, Mapel & Tahun', icon: Building2, perm: 'akademik.kelola' },
  { group: 'Data Induk', to: '/impor', label: 'Impor Data', icon: FileUp, perm: 'impor' },

  { group: 'Akademik', to: '/segera/presensi', label: 'Presensi Harian', icon: CalendarCheck, roles: ['super_admin', 'kepala', 'operator', 'guru', 'wali_kelas'], soon: true },
  { group: 'Akademik', to: '/segera/penilaian', label: 'Penilaian & Rapor', icon: BookOpenCheck, roles: ['super_admin', 'kepala', 'operator', 'guru', 'wali_kelas'], soon: true },

  { group: 'Keuangan', to: '/segera/keuangan', label: 'Tagihan & Kas', icon: Wallet, roles: ['super_admin', 'kepala', 'bendahara'], soon: true },

  { group: 'Portal Anak', to: '/segera/portal', label: 'Kehadiran, Nilai & Tagihan', icon: ClipboardList, roles: ['wali_murid', 'siswa'], soon: true },

  { group: 'Pengaturan', to: '/pengaturan/akun', label: 'Akun & Peran', icon: UserCog, perm: 'akun.lihat' },
  { group: 'Pengaturan', to: '/pengaturan/identitas', label: 'Identitas Madrasah', icon: Settings, perm: 'pengaturan.lihat' },
  { group: 'Pengaturan', to: '/pengaturan/audit', label: 'Jejak Audit', icon: ScrollText, perm: 'audit.lihat' },
];

export function navFor(role: RoleKey | null): NavItem[] {
  if (!role) return [];
  return NAV.filter((n) => (!n.perm || can(role, n.perm)) && (!n.roles || n.roles.includes(role)));
}

/** 4 menu tersering per peran untuk navigasi bawah HP (PRD §7.2); sisanya di "Lainnya". */
const BOTTOM: Partial<Record<RoleKey, string[]>> = {
  super_admin: ['/', '/siswa', '/pengaturan/akun', '/pengaturan/audit'],
  kepala: ['/', '/siswa', '/guru', '/pengaturan/audit'],
  operator: ['/', '/siswa', '/relasi', '/impor'],
  tu: ['/', '/siswa', '/guru', '/wali'],
  bendahara: ['/', '/segera/keuangan', '/pengumuman'],
  guru: ['/', '/segera/presensi', '/segera/penilaian', '/siswa'],
  wali_kelas: ['/', '/segera/presensi', '/segera/penilaian', '/siswa'],
  siswa: ['/', '/segera/portal', '/pengumuman'],
  wali_murid: ['/', '/segera/portal', '/pengumuman'],
  pustakawan: ['/', '/pengumuman'],
  panitia_spmb: ['/', '/pengumuman'],
};
const SHORT: Record<string, string> = {
  '/': 'Beranda', '/siswa': 'Siswa', '/guru': 'Guru', '/wali': 'Wali', '/relasi': 'Relasi', '/impor': 'Impor',
  '/pengaturan/akun': 'Akun', '/pengaturan/audit': 'Audit', '/segera/presensi': 'Absensi', '/segera/penilaian': 'Nilai',
  '/segera/keuangan': 'Keuangan', '/segera/portal': 'Anak', '/pengumuman': 'Info',
};

export function bottomFor(role: RoleKey | null) {
  const items = navFor(role);
  const keys = (role && BOTTOM[role]) || ['/'];
  return keys.map((k) => items.find((i) => i.to === k)).filter(Boolean).map((i) => ({ ...i!, short: SHORT[i!.to] || i!.label }));
}
