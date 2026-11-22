import { useEffect, useState } from 'react';
import { useSWR } from './swr';
import { getActiveYear, getClasses } from '../services/data';
import { useAuth } from '../auth/AuthProvider';

export function useActiveYear() {
  const { phase } = useAuth();
  return useSWR(phase === 'ready' ? 'year:active' : null, getActiveYear, { ttl: 5 * 60_000 });
}

export function useClasses(yearId?: string | null) {
  return useSWR(yearId ? `classes:${yearId}` : null, () => getClasses(yearId!), { ttl: 5 * 60_000 });
}

export function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener('online', a); window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  return on;
}

/** Tombol "Pasang SIMMA" (Android/desktop). iPhone tidak mendukung prompt — tampilkan petunjuk manual. */
interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; listeners.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()); });
}
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    canInstall: !!deferred && !standalone,
    iosHint: ios && !standalone,
    install: async () => { if (!deferred) return; await deferred.prompt(); await deferred.userChoice; deferred = null; force((x) => x + 1); },
  };
}

/** Debounce nilai (pencarian 250 ms — gas-instant-ux-pro Prinsip 1). */
export function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}
