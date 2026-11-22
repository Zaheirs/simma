/* Isi Firebase Emulator dengan akun simulasi tiap peran + data fiktif (PRD §3.7: bukan data siswa asli).
 * Urutan: (1) npm run emulator  (2) di terminal lain: npm run seed:emulator  (3) npm run dev dengan VITE_USE_EMULATOR=true
 * Semua akun memakai kata sandi: Simulasi#2026 */
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-simma';
const DOMAIN = process.env.VITE_LOGIN_DOMAIN || 'simma.miftahulumul.id';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const PASS = 'Simulasi#2026';
const AY = '2026-2027';

function val(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
  return { stringValue: String(v) };
}
async function put(path, data) {
  const res = await fetch(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, val(v)])) }),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}
async function akun(login, nama) {
  const email = login.includes('@') ? login : `${login}@${DOMAIN}`;
  const res = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS, displayName: nama, returnSecureToken: false }),
  });
  const j = await res.json();
  if (j.localId) return { uid: j.localId, email };
  if (j.error?.message === 'EMAIL_EXISTS') throw new Error(`Akun ${email} sudah ada. Hentikan emulator (Ctrl+C) lalu jalankan ulang agar data bersih.`);
  throw new Error(JSON.stringify(j));
}

const now = new Date();
const PENGGUNA = [
  ['superadmin@simulasi.test', 'Simulasi Super Admin', ['super_admin'], {}],
  ['kepala@simulasi.test', 'Simulasi Kepala Madrasah', ['kepala'], {}],
  ['operator@simulasi.test', 'Simulasi Operator', ['operator'], {}],
  ['tu@simulasi.test', 'Simulasi Tata Usaha', ['tu'], {}],
  ['bendahara@simulasi.test', 'Simulasi Bendahara', ['bendahara'], {}],
  ['guru@simulasi.test', 'Simulasi Guru Mapel', ['guru'], { staffId: 'st_guru' }],
  ['walikelas@simulasi.test', 'Simulasi Wali Kelas 4A', ['guru', 'wali_kelas'], { staffId: 'st_wk' }],
  ['pustakawan@simulasi.test', 'Simulasi Pustakawan', ['pustakawan'], {}],
  ['spmb@simulasi.test', 'Simulasi Panitia SPMB', ['panitia_spmb'], {}],
  ['900001', 'Siswa Fiktif Satu', ['siswa'], { studentId: '900001' }],
  ['w900001', 'Wali Fiktif Satu', ['wali_murid'], { guardianId: 'g_fiktif1' }],
];

const main = async () => {
  console.log(`Mengisi emulator proyek "${PROJECT}"…`);
  const uid = {};
  for (const [login, nama, roles, extra] of PENGGUNA) {
    const a = await akun(login, nama);
    uid[login] = a.uid;
    await put(`users/${a.uid}`, { nama, email: a.email, roles, status: 'aktif', mustChangePassword: false, ...extra, createdAt: now, updatedAt: now });
    console.log(`  ✓ ${roles.join(' + ').padEnd(18)} ${a.email}`);
  }
  await put('settings/school', {
    namaMadrasah: 'MI. Miftahul Ulum Semampir', alamat: 'Semampir, Surabaya (alamat contoh)', nsm: '-', npsn: '-',
    kepalaMadrasah: 'Simulasi Kepala Madrasah', maxUploadMb: 2, batasPersetujuanPengeluaran: 500000,
  });
  await put(`academic_years/${AY}`, { nama: '2026/2027', semesterAktif: 'Ganjil', isActive: true });
  const kelas = [[1, '1A'], [2, '2A'], [3, '3A'], [4, '4A'], [5, '5A'], [6, '6A']];
  for (const [t, n] of kelas) {
    const wk = n === '4A' ? { waliKelasUid: uid['walikelas@simulasi.test'], waliKelasNama: 'Simulasi Wali Kelas 4A' } : { waliKelasUid: null, waliKelasNama: null };
    await put(`classes/${AY}_${n}`, { academicYearId: AY, tingkat: t, nama: n, archived: false, ...wk });
  }
  await put(`class_access/${AY}_3A_${uid['guru@simulasi.test']}`, { classId: `${AY}_3A`, uid: uid['guru@simulasi.test'] });
  for (const [k, n, g] of [['QH', "Al-Qur'an Hadis", 'Agama'], ['FQ', 'Fiqih', 'Agama'], ['MTK', 'Matematika', 'Umum'], ['BIN', 'Bahasa Indonesia', 'Umum'], ['BAR', 'Bahasa Arab', 'Agama'], ['IPAS', 'IPAS', 'Umum']])
    await put(`subjects/${k}`, { kode: k, nama: n, kelompok: g, archived: false });
  await put('staff/st_guru', { nama: 'Simulasi Guru Mapel', jabatan: 'Guru Mapel', status: 'aktif', userUid: uid['guru@simulasi.test'], createdAt: now });
  await put('staff/st_wk', { nama: 'Simulasi Wali Kelas 4A', jabatan: 'Guru Kelas', status: 'aktif', userUid: uid['walikelas@simulasi.test'], createdAt: now });

  const namaDepan = ['Ahmad', 'Fatimah', 'Bilal', 'Aisyah', 'Umar', 'Khadijah', 'Zaid', 'Maryam', 'Hasan', 'Zainab', 'Yusuf', 'Hafsah'];
  let n = 900001;
  for (const [t, kls] of kelas) {
    for (let i = 0; i < 4; i++) {
      const nis = String(n++), nama = `${namaDepan[(n + i) % namaDepan.length]} Fiktif ${nis.slice(-3)}`;
      await put(`students/${nis}`, { nis, nama, jk: i % 2 ? 'P' : 'L', tempatLahir: 'Surabaya', tanggalLahir: `${2020 - t}-0${(i % 9) + 1}-15`,
        alamat: 'Alamat contoh', classId: `${AY}_${kls}`, className: kls, academicYearId: AY, status: 'aktif', archived: false, createdAt: now, updatedAt: now });
      await put(`enrollments/${AY}_${nis}`, { studentId: nis, classId: `${AY}_${kls}`, academicYearId: AY, status: 'aktif' });
    }
  }
  await put('guardians/g_fiktif1', { nama: 'Wali Fiktif Satu', hubungan: 'Ayah', hp: '080000000001', userUid: uid['w900001'], createdAt: now });
  await put('guardian_links/900001_g_fiktif1', { studentId: '900001', studentName: 'Siswa Fiktif Satu', guardianId: 'g_fiktif1', guardianName: 'Wali Fiktif Satu',
    hubungan: 'Ayah', status: 'terverifikasi', createdBy: uid['operator@simulasi.test'], verifiedBy: uid['operator@simulasi.test'], verifiedAt: now, createdAt: now });
  await put('guardians/g_fiktif2', { nama: 'Wali Fiktif Dua', hubungan: 'Ibu', hp: '080000000002', userUid: null, createdAt: now });
  await put('guardian_links/900002_g_fiktif2', { studentId: '900002', studentName: 'Siswa Fiktif 002', guardianId: 'g_fiktif2', guardianName: 'Wali Fiktif Dua',
    hubungan: 'Ibu', status: 'menunggu', createdBy: uid['operator@simulasi.test'], createdAt: now });

  console.log(`\nSelesai. Kata sandi semua akun: ${PASS}`);
  console.log('Siswa & wali masuk cukup dengan mengetik 900001 atau w900001 di kolom Email / NIS.');
};
main().catch((e) => { console.error('Gagal:', e.message); process.exit(1); });
