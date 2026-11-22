# Panduan Instalasi SIMMA · Tahap 1

**SIMMA** (Sistem Informasi Manajemen Madrasah), MI. Miftahul Ulum Semampir, versi 1.0.0.
Isi Tahap 1: login, peran, dashboard per peran, data induk (siswa, guru, wali, relasi, kelas, mapel, tahun pelajaran), impor Excel, akun, identitas madrasah, dan jejak audit.

Perkiraan waktu: **60–90 menit**. Kerjakan di laptop. Semua layanan memakai paket **gratis**.

| Bagian | Fungsi | Tempat |
|---|---|---|
| Firebase (Auth + Firestore) | Login & database utama | console.firebase.google.com |
| Google Apps Script | Unggah berkas ke Drive, kelola akun, backup | script.google.com |
| GitHub Pages | Tampilan aplikasi (PWA) | github.com |

> **Gerbang keamanan (PRD §8.4):** jangan memasukkan data siswa asli sebelum langkah D2 (uji aturan keamanan) lulus.

---

## Yang perlu disiapkan

1. Satu **akun Google madrasah** (mis. `simma.miftahululum@gmail.com`). Pakai akun yang **sama** untuk Firebase dan Apps Script.
2. **Node.js LTS** dari https://nodejs.org (klik tombol LTS, Next sampai selesai). Dipakai untuk memasang aturan keamanan.
3. **Git** dari https://git-scm.com/download/win dan akun **GitHub**.
4. Berkas `simma-frontend-v1.0.0.zip` dan 8 berkas backend (`appsscript.json`, `Config.gs`, …).

---

## A. Firebase

### A1. Buat proyek
1. Buka https://console.firebase.google.com → **Create a project / Buat proyek**.
2. Nama: `simma-miftahul-ulum` (ID proyek boleh berbeda; catat ID-nya).
3. **Matikan** Google Analytics → **Create project**.
4. Paket tetap **Spark (gratis)**. Jangan pilih Blaze.

### A2. Aktifkan login Email/Password
**Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**

### A3. Buat database Firestore
**Build → Firestore Database → Create database** → lokasi **asia-southeast2 (Jakarta)** → **Start in production mode** → **Create**.

### A4. Daftarkan aplikasi web & catat konfigurasi
**Project settings (⚙) → General → Your apps → ikon `</>`** → nama `SIMMA Web` → **Register app**. Catat empat nilai ini:

```
apiKey, authDomain, projectId, appId
```

### A5. Pasang aturan keamanan & indeks
Ekstrak `simma-frontend-v1.0.0.zip`. Buka folder `simma` hasil ekstrak, klik kolom alamat File Explorer, ketik `powershell`, lalu tekan Enter. Jalankan:

```powershell
npx firebase-tools@14 login
npx firebase-tools@14 deploy --only firestore --project ID-PROYEK-ANDA
```

Berhasil bila muncul `Deploy complete!`. Perintah ini memasang `firestore.rules` (hak akses 11 peran) dan `firestore.indexes.json`.

---

## B. Backend Google Apps Script

### B1. Buat proyek
Buka https://script.google.com/home/projects/create dengan akun Google yang **sama** dengan Firebase. Ganti nama proyek menjadi **SIMMA Backend**.

### B2. Tempel 8 berkas
1. **⚙ Setelan proyek** → centang **Tampilkan file manifes "appsscript.json"**.
2. Ganti isi `appsscript.json`.
3. Ganti nama `Kode.gs` menjadi `Config`, lalu tempel isi `Config.gs`.
4. Tambah skrip baru (**+ → Skrip**) untuk `Core`, `Auth`, `Firestore`, `Files`, `Accounts`, dan `Sistem`, lalu tempel isinya masing-masing. Simpan (Ctrl+S).

### B3. Isi Properti skrip
**⚙ Setelan proyek → Properti skrip → Tambahkan properti skrip**:

| Properti | Nilai |
|---|---|
| `FIREBASE_PROJECT_ID` | ID proyek dari A4 |
| `FIREBASE_API_KEY` | apiKey dari A4 |
| `SUPERADMIN_EMAIL` | email Super Admin pertama (mis. email operator utama) |

### B4. Jalankan `setupSimma` sekali
Buka berkas `Sistem`, pilih fungsi **setupSimma**, lalu klik **▷ Jalankan**. Izinkan akses: **Tinjau izin → Lanjutan → Buka SIMMA Backend (tidak aman) → Izinkan**. Peringatan "tidak aman" ini wajar untuk skrip buatan sendiri.

Fungsi ini menguji koneksi Firestore, membuat folder privat **SIMMA** di Drive, mengisi identitas awal, membuat **Super Admin**, dan memasang backup harian.

Log akan menampilkan:
```
🔐 KATA SANDI AWAL SUPER ADMIN (catat sekarang — hanya tampil sekali)
   Masuk dengan : email-anda@gmail.com
   Kata sandi   : Sa…(acak)…#9
✅ Setup selesai
```
**Simpan kata sandi itu.** Bila hilang, jalankan `resetSandiSuperAdmin`.

### B5. Terbitkan sebagai Aplikasi Web
**Deploy → Deployment baru → ⚙ Aplikasi web**. Isi **Jalankan sebagai: Saya** dan **Yang memiliki akses: Siapa saja** → **Deploy**. Salin URL yang berakhiran `/exec`.

Uji dengan membuka `URL/exec?ping`. Berhasil bila muncul `{"success":true,"app":"SIMMA"…`.

> Akses "Siapa saja" aman, karena setiap permintaan wajib membawa token login Firebase dan diperiksa perannya.

---

## C. Frontend di GitHub Pages

GitHub yang membangun aplikasi (lewat GitHub Actions). Anda tidak perlu menjalankan `npm run build`.

### C1. Buat repository
https://github.com/new → nama `simma` → **Public** → **jangan** centang README → **Create repository**.

### C2. Kirim folder `simma`
Folder kerjanya adalah folder `simma` hasil ekstrak zip, yang berisi `index.html`, `package.json`, `src/`, dan `.github/`. Jalankan `dir` dulu dan pastikan `index.html` terlihat. Lalu jalankan satu per satu:

```powershell
git init
git add .
git commit -m "SIMMA v1.0.0"
git branch -M main
git remote add origin https://github.com/USERNAME/simma.git
git push -u origin main
```
Bila diminta password, gunakan **Personal Access Token** (https://github.com/settings/tokens → classic → centang `repo`). Layar memang tidak menampilkan apa pun saat token ditempel; tekan Enter saja.

### C3. Isi Variables
Repository → **Settings → Secrets and variables → Actions → tab Variables → New repository variable**:

| Nama | Nilai |
|---|---|
| `VITE_FIREBASE_API_KEY` | apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | authDomain |
| `VITE_FIREBASE_PROJECT_ID` | projectId |
| `VITE_FIREBASE_APP_ID` | appId |
| `VITE_GAS_URL` | URL `/exec` dari B5 |
| `VITE_LOGIN_DOMAIN` | mis. `simma.miftahululum.id` (domain akun NIS; tidak harus benar-benar ada) |

### C4. Aktifkan Pages & jalankan
1. **Settings → Pages → Source: GitHub Actions**.
2. Tab **Actions** → **Deploy SIMMA ke GitHub Pages** → **Run workflow**. Tunggu 2–3 menit sampai centang hijau.
3. Situs aktif di `https://USERNAME.github.io/simma/`.

### C5. Izinkan domain di Firebase
**Firebase → Authentication → Settings → Authorized domains → Add domain** → `USERNAME.github.io`.

---

## D. Masuk pertama & setelan awal

1. **Masuk** dengan email Super Admin dan sandi dari B4, lalu ganti kata sandi.
2. **Uji keamanan (wajib sebelum data asli).** Jalankan di folder `simma`. Perlu Java 11+ (https://adoptium.net):
   ```powershell
   npm install
   npm run test:rules
   ```
   Semua tes wajib **hijau (passed)**, termasuk kasus yang harus ditolak. Daftar kasusnya ada di `RBAC_MATRIX.md`.
3. **Identitas madrasah:** menu **Identitas Madrasah**. Isi nama, alamat, NSM/NPSN, dan kepala madrasah, lalu unggah logo.
4. **Tahun pelajaran & rombel:** menu **Kelas, Mapel & Tahun**. Buat 2026/2027 (aktif), rombel 1A–6A, dan mata pelajaran.
5. **Akun:** menu **Akun & Peran** → **Buat Akun** untuk Kepala, Operator, Bendahara, dan guru. Tetapkan wali kelas di rombel.
6. **Data siswa:** menu **Impor Data** → unduh template → isi → unggah → periksa pratinjau → impor. Mulai dari satu kelas.
7. **Orang tua & relasi:** impor wali (kolom `nis_anak`) → menu **Verifikasi Relasi** → verifikasi setelah dicocokkan dengan KK.
8. **Akun siswa & wali murid:** dibuat dengan nama pengguna tanpa `@`, misalnya NIS `2023045` atau `w2023045` untuk wali. Mereka masuk cukup dengan mengetik itu.

### Kunci akses & periksa keamanan
- **Apps Script:** tombol **Bagikan** di proyek *SIMMA Backend* → hanya pemilik yang boleh menjadi editor. Siapa pun yang bisa mengedit skrip bisa membaca Properti skrip.
- **Firebase:** **Project settings → Users and permissions** → hanya pemilik (dan satu cadangan tepercaya).
- **GitHub:** repository boleh Public karena tidak memuat rahasia. Nilai Firebase di Variables memang publik dan dijaga aturan Firestore.
- Jalankan fungsi **`cekKeamanan`** di berkas `Sistem` kapan saja. Log menampilkan status setiap Properti skrip dalam bentuk tersamar (mis. `AIza••••••x9Q`) dan memastikan folder Drive SIMMA tetap privat.
- Jangan menyalin isi Properti skrip ke chat, dokumen, atau spreadsheet.

### Pasang di HP
- **Android (Chrome):** menu ⋮ → **Instal aplikasi**.
- **iPhone (Safari):** tombol Bagikan → **Tambahkan ke Layar Utama**.

---

## Uji coba lokal dengan akun simulasi (opsional)

```powershell
copy .env.example .env.local      # ubah VITE_USE_EMULATOR=true, VITE_FIREBASE_PROJECT_ID=demo-simma, isi apiKey bebas
npm install
npm run emulator                  # terminal 1
npm run seed:emulator             # terminal 2 — 11 akun simulasi, sandi Simulasi#2026
npm run dev                       # terminal 3 — buka http://localhost:5173
```

---

## Jika ada masalah

| Gejala | Penyebab & solusi |
|---|---|
| Layar "Konfigurasi belum lengkap" | Variables di C3 belum diisi atau salah nama. Perbaiki, lalu **Actions → Run workflow**. |
| Login: `auth/unauthorized-domain` atau gagal terus | Tambahkan `USERNAME.github.io` di Authorized domains (C5). |
| "Akun belum terdaftar di SIMMA" | Akun Auth ada, tetapi dokumen `users` belum dibuat. Buat lewat menu Akun & Peran atau jalankan ulang `setupSimma`. |
| Daftar data kosong + error "index" di konsol | Indeks belum terpasang. Ulangi perintah `deploy --only firestore` di A5. |
| setupSimma: "tidak punya akses ke proyek Firebase" | Apps Script dijalankan dengan akun berbeda. Gunakan akun pemilik proyek Firebase. |
| Buat akun / unggah foto: "Server berkas belum diisi" | `VITE_GAS_URL` kosong. Isi di C3 dan jalankan ulang workflow. |
| Mengubah kode backend tidak berpengaruh | **Deploy → Kelola deployment → ✎ → Versi baru → Deploy**. URL `/exec` tetap sama. |
| Tampilan versi lama | Muncul bilah "Versi baru tersedia" → **Perbarui**, atau tekan Ctrl+Shift+R. |
| Situs GitHub 404 | Pages Source belum **GitHub Actions**, atau `index.html` tidak berada di root repository. |

---

## Tahap berikutnya
1.4 Penugasan mengajar & jadwal · 1.5 Presensi · 1.6 Penilaian & Rapor · 1.7 Keuangan (ledger) · 1.8 Portal wali murid & notifikasi.
