# RBAC_MATRIX — SIMMA (Tahap 1)

Matriks rinci **koleksi Firestore × peran × aksi × lingkup** sesuai PRD §3.4–§3.7. Sumber kebenaran penegakan adalah `firestore.rules`; menu di aplikasi (`src/lib/rbac.ts`) hanya mengikuti matriks ini.

**Aksi:** R = baca · C = tambah · U = ubah · Ar = arsipkan (U khusus kolom status) · D = hapus permanen · — = ditolak
**Aturan umum:** default deny · akun `nonaktif` ditolak di semua koleksi · tidak ada peran yang mendapat **D** untuk data induk, riwayat, dan jejak audit.

## 1. Akun & sistem

| Koleksi | Super Admin | Kepala | Operator | TU | Bendahara | Guru | Wali Kelas | Siswa | Wali Murid | Pustakawan / SPMB |
|---|---|---|---|---|---|---|---|---|---|---|
| `users` | R C U (semua peran) | R | R · C U hanya peran guru, wali_kelas, tu, pustakawan, panitia_spmb, siswa, wali_murid | R (get) | diri sendiri | diri sendiri | diri sendiri | diri sendiri | diri sendiri | diri sendiri |
| `users` (diri sendiri) | U hanya `mustChangePassword=false` | sama | sama | sama | sama | sama | sama | sama | sama | sama |
| `settings` | R C U | R | R | R | R | R | R | R | R | R |
| `audit_logs` | R · C atas nama sendiri | R · C | C | C | C | C | C | C | C | C |
| `import_export_logs` | R C | R C | R C | C | C | C | C | C | C | C |
| `files` (metadata) | R · C milik sendiri · U status | R · C milik sendiri | R · C · U status | R · C | milik sendiri | milik sendiri | milik sendiri | milik sendiri | milik sendiri | milik sendiri |

Catatan:
- Pembuatan akun Firebase Auth, penonaktifan, dan reset sandi dilakukan lewat GAS (`Accounts.gs`) yang memeriksa peran pemanggil dengan aturan yang sama: Operator tidak bisa membuat/mengubah akun Super Admin, Kepala, Operator, atau Bendahara.
- `audit_logs`: `actorUid` wajib = pengguna yang masuk, `waktu` wajib = waktu server. Tidak bisa diubah/dihapus siapa pun.

## 2. Data induk

| Koleksi | Super Admin | Kepala | Operator | TU | Bendahara | Guru | Wali Kelas | Siswa | Wali Murid |
|---|---|---|---|---|---|---|---|---|---|
| `students` | R C U Ar | R | R C U Ar | R | — ¹ | R kelas ajar ² | R kelas binaan ³ | R diri sendiri | R anak terverifikasi ⁴ |
| `uniques` (NISN/NISM) | R C D | — | R C D | — | — | — | — | — | — |
| `enrollments` | R C U | R | R C U | R | — | — | R kelas binaan | R diri sendiri | R anak terverifikasi |
| `staff` | R C U Ar | R | R C U Ar | R | R (nama) | R (nama) | R (nama) | — | — |
| `guardians` | R C U | R | R C U | R | — | — | — ⁵ | — | R diri sendiri |
| `guardian_links` | R C U (verifikasi) | R | R C U (verifikasi) | R | — | — | — | — | R miliknya |
| `academic_years` · `classes` · `subjects` | R C U Ar | R | R C U Ar | R | R | R | R | R | R |
| `class_access` | R C U D | R | R C U D | R | — | R miliknya | R miliknya | — | — |

¹ PRD menyebut Bendahara melihat nama/NIS/kelas. Firestore tidak bisa membatasi per kolom, jadi pada modul Keuangan nama & kelas disalin ke dokumen tagihan; Bendahara tetap tidak membaca biodata siswa.
² Guru membaca siswa bila ada dokumen `class_access/{classId}_{uid}` (dibuat Operator dari penugasan mengajar, Tahap 1.4).
³ Wali Kelas membaca siswa bila `classes/{classId}.waliKelasUid` = dirinya. Daftar siswa wajib difilter `classId`.
⁴ Wali Murid membaca anak bila `guardian_links/{studentId}_{guardianId}.status` = `terverifikasi`. Status `menunggu` atau `ditolak` = ditolak.
⁵ Data orang tua kelas binaan untuk Wali Kelas menyusul bersama modul Kesiswaan.

Aturan tulis tambahan:
- `students`: ID dokumen = NIS (unik oleh database). NIS tidak bisa diubah. Status baru wajib `aktif`.
- `guardian_links`: dibuat berstatus `menunggu`; verifikasi wajib mengisi `verifiedBy` = pemverifikasi; siswa/wali pada relasi tidak bisa diganti.

## 3. Pengumuman & notifikasi (dasar)

| Koleksi | Super Admin | Kepala | Operator | TU | Lainnya |
|---|---|---|---|---|---|
| `announcements` | R C U | R C U | R C U | R C U | R |
| `notifications` | penerima: R, U `dibaca` · semua akun aktif: C | | | | |

## 4. Uji akses dengan akun simulasi

Jalankan `npm run test:rules` (emulator). Kasus wajib yang **harus ditolak** sudah tercakup di `tests/rules.test.ts`:

| # | Kasus | Hasil wajib |
|---|---|---|
| 1 | Tanpa login membaca siswa | Ditolak |
| 2 | Bendahara membaca biodata siswa | Ditolak |
| 3 | Guru membaca siswa kelas yang tidak ditugaskan | Ditolak |
| 4 | Wali Kelas membaca siswa kelas lain / daftar semua siswa | Ditolak |
| 5 | Siswa membaca data siswa lain | Ditolak |
| 6 | Wali Murid membaca anak lain atau relasi belum terverifikasi | Ditolak |
| 7 | Akun nonaktif (walau Super Admin) | Ditolak |
| 8 | Pengguna menambah peran sendiri | Ditolak |
| 9 | Operator membuat akun Super Admin/Kepala/Bendahara/Operator | Ditolak |
| 10 | Operator mengubah akun Kepala | Ditolak |
| 11 | Siapa pun menghapus siswa atau akun | Ditolak |
| 12 | Mengubah NIS | Ditolak |
| 13 | Wali Murid memverifikasi relasinya sendiri | Ditolak |
| 14 | Mencatat audit atas nama orang lain / mengubah / menghapus audit | Ditolak |
| 15 | Menulis ke koleksi yang tidak didefinisikan | Ditolak |

**Gerbang (PRD §8.4):** data siswa asli baru boleh diimpor setelah seluruh tes lulus.

## 5. Akan ditambahkan per tahap

| Tahap | Koleksi | Inti aturan |
|---|---|---|
| 1.4 Akademik | `teaching_assignments`, `schedules` | Operator kelola; penugasan otomatis membuat `class_access` |
| 1.5 Presensi | `attendance_students`, `attendance_staff` | Guru kelas ajar, Wali Kelas kelas binaan; koreksi wajib alasan |
| 1.6 Rapor | `grades`, `report_cards`, `approvals` | Guru hanya mapel diampu; Kepala menyetujui; nilai terkunci setelah disetujui |
| 1.7 Keuangan | `invoices`, `ledger_entries`, `payment_submissions`, `expense_requests` | Ledger tanpa update/delete; Bendahara tidak menyetujui pengajuannya sendiri |
