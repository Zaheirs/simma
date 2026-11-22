/* SIMMA service worker.
 * Aturan keamanan PRD §6.1 & §7.6:
 *  - Yang di-cache HANYA aset statis aplikasi (HTML kerangka, JS/CSS hasil build, ikon, font).
 *  - Respons Firebase (Auth/Firestore), Google APIs, dan Apps Script TIDAK PERNAH di-cache.
 *  - Tidak ada data pribadi siswa yang disimpan di perangkat.
 * Naikkan VERSION setiap rilis agar cache lama dibuang. */
const VERSION = 'simma-v1.0.1';
const SHELL = ['./', './index.html', './offline.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

function bolehCache(url) {
  if (url.origin !== self.location.origin) return false; // semua domain luar (Firebase, Google, GAS) dilewati
  return /\.(?:js|css|woff2?|png|svg|ico|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/offline.html');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigasi halaman: utamakan jaringan (selalu versi terbaru), cadangan kerangka dari cache, terakhir halaman offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./offline.html')))
    );
    return;
  }

  if (!bolehCache(url)) return; // biarkan browser menangani langsung, tanpa cache

  // Aset statis ber-hash: cache dulu, jaringan bila belum ada.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      });
    })
  );
});
