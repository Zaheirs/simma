import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, browserSessionPersistence, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, memoryLocalCache } from 'firebase/firestore';
import { CONFIG, CONFIG_OK } from './config';

// Saat konfigurasi belum diisi, tetap inisialisasi dengan nilai tiruan agar layar "Konfigurasi belum lengkap" bisa tampil.
export const app = initializeApp(
  CONFIG_OK ? CONFIG.firebase : { apiKey: 'demo', projectId: 'demo-simma', appId: 'demo', authDomain: 'demo-simma.firebaseapp.com' }
);

export const auth = getAuth(app);
auth.languageCode = 'id';

/* Cache Firestore hanya di memori (bukan IndexedDB): data siswa tidak tertinggal di perangkat setelah tab ditutup.
 * Sesuai PRD §6.1. Kecepatan dijaga oleh cache memori SDK + cache SWR di src/lib/swr.ts. */
export const db = initializeFirestore(app, { localCache: memoryLocalCache(), ignoreUndefinedProperties: true });

if (CONFIG.useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/** "Ingat sesi" dicentang → tetap masuk setelah browser ditutup; tidak → keluar saat tab ditutup. */
export function setRemember(remember: boolean) {
  return setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}
