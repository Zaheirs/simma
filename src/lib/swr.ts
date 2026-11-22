/* Cache Stale-While-Revalidate di memori (gas-instant-ux-pro Prinsip 2).
 * - Pindah halaman/menu langsung menampilkan data terakhir (0 ms), lalu menyegarkan di latar bila sudah basi.
 * - Permintaan yang sama digabung (dedupe) sehingga tidak ada pembacaan Firestore ganda.
 * - Hanya di memori: hilang saat tab ditutup, tidak ada data siswa tersimpan di perangkat (PRD §6.1). */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

interface Entry<T = unknown> { data?: T; error?: Error; at: number; hash?: string; loading: boolean; promise?: Promise<T> }

const store = new Map<string, Entry>();
const subs = new Map<string, Set<() => void>>();
const EMPTY: Entry = { at: 0, loading: false };

function emit(key: string) { subs.get(key)?.forEach((f) => f()); }
function set(key: string, patch: Partial<Entry>) { store.set(key, { ...(store.get(key) || EMPTY), ...patch }); emit(key); }

export async function revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cur = store.get(key);
  if (cur?.promise) return cur.promise as Promise<T>;
  const p = fetcher()
    .then((data) => {
      const hash = JSON.stringify(data);
      const prev = store.get(key);
      // Data identik → jangan memicu render ulang (hemat CPU HP).
      if (prev?.hash === hash) set(key, { at: Date.now(), loading: false, promise: undefined, error: undefined });
      else set(key, { data, hash, at: Date.now(), loading: false, promise: undefined, error: undefined });
      return data;
    })
    .catch((error: Error) => { set(key, { error, loading: false, promise: undefined }); throw error; });
  set(key, { loading: true, promise: p });
  return p;
}

/** Ubah cache secara langsung (optimistic UI). Gunakan setelah simpan berhasil agar daftar langsung berubah. */
export function mutate<T>(key: string, updater: T | ((old: T | undefined) => T)) {
  const old = store.get(key)?.data as T | undefined;
  const data = typeof updater === 'function' ? (updater as (o: T | undefined) => T)(old) : updater;
  set(key, { data, hash: JSON.stringify(data), at: Date.now() });
}

/** Tandai basi semua kunci yang diawali prefix (mis. "students") sehingga dibaca ulang saat dibuka. */
export function invalidate(prefix: string) {
  for (const [k, e] of store) if (k.startsWith(prefix)) { store.set(k, { ...e, at: 0 }); emit(k); }
}

export function clearAll() { store.clear(); subs.forEach((s) => s.forEach((f) => f())); }

export function useSWR<T>(key: string | null, fetcher: () => Promise<T>, opts: { ttl?: number } = {}) {
  const ttl = opts.ttl ?? 60_000;
  const fRef = useRef(fetcher);
  fRef.current = fetcher;

  const subscribe = useCallback((cb: () => void) => {
    if (!key) return () => {};
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key)!.add(cb);
    return () => { subs.get(key)?.delete(cb); };
  }, [key]);
  const entry = useSyncExternalStore(subscribe, () => (key ? store.get(key) || EMPTY : EMPTY));

  useEffect(() => {
    if (!key) return;
    const e = store.get(key);
    if (!e || Date.now() - e.at > ttl) revalidate(key, () => fRef.current()).catch(() => {});
  }, [key, ttl, entry.at]);

  const refresh = useCallback(() => (key ? revalidate(key, () => fRef.current()) : Promise.resolve(undefined as T)), [key]);

  return {
    data: entry.data as T | undefined,
    error: entry.error,
    loading: entry.loading && entry.data === undefined, // skeleton hanya saat belum ada data sama sekali
    refreshing: entry.loading && entry.data !== undefined,
    updatedAt: entry.at,
    refresh,
  };
}
