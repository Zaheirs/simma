# SIMMA · Sistem Informasi Manajemen Madrasah

MI. Miftahul Ulum Semampir, Surabaya · **Tahap 1** (fondasi, dashboard per peran, data induk).

**Stack:** React 19 + TypeScript + Tailwind CSS (PWA, HashRouter) · Firebase Authentication + Cloud Firestore (database utama, Spark gratis) · Google Apps Script (berkas Drive, kelola akun, backup) · GitHub Pages (build otomatis via GitHub Actions).

## Struktur

```
index.html, vite.config.ts, tailwind.config.js   kerangka & token desain (DESIGN.md)
public/            manifest, service worker (aset statis saja), offline.html, ikon
src/lib/           config, firebase, rbac, swr (cache memori), gas (klien REST), format, hooks
src/auth/          AuthProvider (profil live, peran aktif)
src/components/    ui kit + AppShell (sidebar, header, navigasi bawah HP)
src/pages/         dashboard per peran, data induk, pengaturan, auth
src/services/      akses Firestore & berkas
firestore.rules    hak akses 11 peran (deny by default)
tests/rules.test.ts  uji emulator dengan akun simulasi
RBAC_MATRIX.md     matriks koleksi × peran × aksi × lingkup
.github/workflows/deploy.yml  build & deploy GitHub Pages
```

Backend Apps Script diserahkan terpisah (8 berkas), **tidak** ada di repository ini.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | jalankan lokal |
| `npm run build` | cek tipe + build produksi ke `dist/` |
| `npm run emulator` / `npm run seed:emulator` | Firebase Emulator + 11 akun simulasi |
| `npm run test:rules` | uji Security Rules (wajib lulus sebelum data asli) |

## Prinsip yang dipegang

- Hak akses ditegakkan di `firestore.rules` dan GAS, bukan hanya di tampilan.
- Tidak ada hapus permanen untuk siswa, akun, atau audit. Gunakan arsip/nonaktif.
- Wali murid baru melihat data anak setelah relasi **terverifikasi**.
- Data pribadi tidak di-cache offline. Cache Firestore & SWR hanya di memori.
- Hanya layanan gratis. Upgrade berbayar hanya dengan persetujuan pemilik proyek.

Panduan lengkap: [PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md).
