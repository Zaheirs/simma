/* Peran & hak akses di sisi tampilan. PENTING: ini hanya mengatur menu/tombol yang terlihat.
 * Penegakan sesungguhnya ada di firestore.rules dan backend GAS (PRD §3.5 butir 3). */

export const ROLES = {
  super_admin: { label: 'Super Admin', scope: 'Seluruh sistem' },
  kepala: { label: 'Kepala Madrasah', scope: 'Pengawasan & persetujuan lintas modul' },
  operator: { label: 'Operator', scope: 'Data induk & akademik' },
  tu: { label: 'Tata Usaha', scope: 'Administrasi & arsip' },
  bendahara: { label: 'Bendahara', scope: 'Tagihan, pembayaran & kas' },
  guru: { label: 'Guru', scope: 'Kelas & mapel yang ditugaskan' },
  wali_kelas: { label: 'Wali Kelas', scope: 'Kelas binaan' },
  pustakawan: { label: 'Pustakawan', scope: 'Perpustakaan (tahap lanjut)' },
  panitia_spmb: { label: 'Panitia SPMB', scope: 'Calon siswa (tahap lanjut)' },
  siswa: { label: 'Siswa', scope: 'Data diri sendiri' },
  wali_murid: { label: 'Wali Murid', scope: 'Anak yang sudah diverifikasi' },
} as const;

export type RoleKey = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];
export const STAFF_ROLES: RoleKey[] = ['super_admin', 'kepala', 'operator', 'tu', 'bendahara', 'guru', 'wali_kelas', 'pustakawan', 'panitia_spmb'];

/** Izin per aksi (PRD §3.5 butir 4). Default deny: yang tidak tercantum = tidak boleh. */
export type Perm =
  | 'akun.kelola' | 'akun.lihat'
  | 'siswa.lihat' | 'siswa.kelola' | 'siswa.arsip' | 'siswa.ekspor'
  | 'guru.lihat' | 'guru.kelola'
  | 'wali.lihat' | 'wali.kelola' | 'relasi.verifikasi'
  | 'akademik.lihat' | 'akademik.kelola'
  | 'impor'
  | 'pengaturan.lihat' | 'pengaturan.kelola'
  | 'audit.lihat'
  | 'pengumuman.lihat';

const P: Record<RoleKey, Perm[]> = {
  super_admin: ['akun.kelola', 'akun.lihat', 'siswa.lihat', 'siswa.kelola', 'siswa.arsip', 'siswa.ekspor', 'guru.lihat', 'guru.kelola', 'wali.lihat', 'wali.kelola', 'relasi.verifikasi', 'akademik.lihat', 'akademik.kelola', 'impor', 'pengaturan.lihat', 'pengaturan.kelola', 'audit.lihat', 'pengumuman.lihat'],
  kepala: ['akun.lihat', 'siswa.lihat', 'siswa.ekspor', 'guru.lihat', 'wali.lihat', 'akademik.lihat', 'pengaturan.lihat', 'audit.lihat', 'pengumuman.lihat'],
  operator: ['akun.kelola', 'akun.lihat', 'siswa.lihat', 'siswa.kelola', 'siswa.arsip', 'siswa.ekspor', 'guru.lihat', 'guru.kelola', 'wali.lihat', 'wali.kelola', 'relasi.verifikasi', 'akademik.lihat', 'akademik.kelola', 'impor', 'pengumuman.lihat'],
  tu: ['siswa.lihat', 'guru.lihat', 'wali.lihat', 'akademik.lihat', 'pengumuman.lihat'],
  bendahara: ['akademik.lihat', 'pengumuman.lihat'],
  guru: ['siswa.lihat', 'akademik.lihat', 'pengumuman.lihat'],
  wali_kelas: ['siswa.lihat', 'siswa.ekspor', 'wali.lihat', 'akademik.lihat', 'pengumuman.lihat'],
  pustakawan: ['pengumuman.lihat'],
  panitia_spmb: ['pengumuman.lihat'],
  siswa: ['pengumuman.lihat'],
  wali_murid: ['pengumuman.lihat'],
};

export function can(role: RoleKey | null | undefined, perm: Perm): boolean {
  return !!role && P[role].includes(perm);
}

export function sortRoles(roles: RoleKey[]): RoleKey[] {
  return [...roles].sort((a, b) => ROLE_KEYS.indexOf(a) - ROLE_KEYS.indexOf(b));
}
