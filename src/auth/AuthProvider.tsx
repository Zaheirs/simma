import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, setRemember } from '../lib/firebase';
import { toLoginEmail } from '../lib/config';
import { sortRoles, type RoleKey } from '../lib/rbac';
import type { SchoolSettings, UserProfile } from '../lib/types';
import { clearAll } from '../lib/swr';

type Phase = 'loading' | 'signedOut' | 'noProfile' | 'ready';

interface AuthCtx {
  phase: Phase;
  user: User | null;
  profile: UserProfile | null;
  role: RoleKey | null;
  roles: RoleKey[];
  school: SchoolSettings | null;
  notice: string | null;
  login: (id: string, password: string, remember: boolean) => Promise<void>;
  logout: (notice?: string) => Promise<void>;
  setRole: (r: RoleKey) => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const ROLE_KEY = 'simma.activeRole'; // preferensi tampilan saja, bukan data sensitif

const DEFAULT_SCHOOL: SchoolSettings = { namaMadrasah: 'MI. Miftahul Ulum Semampir', alamat: 'Surabaya', maxUploadMb: 2 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<RoleKey | null>(null);
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const logout = useCallback(async (msg?: string) => {
    sessionStorage.removeItem(ROLE_KEY);
    clearAll();
    setNotice(msg || null);
    await signOut(auth);
  }, []);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    if (!u) { setProfile(null); setRoleState(null); setPhase('signedOut'); }
  }), []);

  // Profil dipantau langsung: perubahan peran atau penonaktifan oleh admin langsung berlaku.
  useEffect(() => {
    if (!user) return;
    setPhase('loading');
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (!snap.exists()) { setProfile(null); setPhase('noProfile'); return; }
      const p = { uid: snap.id, ...snap.data() } as UserProfile;
      if (p.status !== 'aktif') { logout('Akun Anda dinonaktifkan. Hubungi operator madrasah.'); return; }
      p.roles = sortRoles(p.roles || []);
      setProfile(p);
      setRoleState((cur) => {
        const saved = sessionStorage.getItem(ROLE_KEY) as RoleKey | null;
        if (cur && p.roles.includes(cur)) return cur;
        if (saved && p.roles.includes(saved)) return saved;
        return p.roles.length === 1 ? p.roles[0] : null; // >1 peran → halaman Pilih Peran
      });
      setPhase('ready');
    }, () => setPhase('noProfile'));
  }, [user, logout]);

  // Identitas madrasah (logo, nama, alamat) dari Pengaturan — bisa diubah tanpa mengubah kode.
  useEffect(() => {
    if (phase !== 'ready') return;
    return onSnapshot(doc(db, 'settings', 'school'), (s) => setSchool(s.exists() ? { ...DEFAULT_SCHOOL, ...(s.data() as SchoolSettings) } : DEFAULT_SCHOOL), () => setSchool(DEFAULT_SCHOOL));
  }, [phase]);

  const login = useCallback(async (id: string, password: string, remember: boolean) => {
    setNotice(null);
    await setRemember(remember);
    await signInWithEmailAndPassword(auth, toLoginEmail(id), password);
  }, []);

  const setRole = useCallback((r: RoleKey) => { sessionStorage.setItem(ROLE_KEY, r); setRoleState(r); }, []);

  const value = useMemo<AuthCtx>(() => ({
    phase, user, profile, role, roles: profile?.roles || [], school: school || DEFAULT_SCHOOL, notice, login, logout, setRole,
  }), [phase, user, profile, role, school, notice, login, logout, setRole]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth harus di dalam AuthProvider');
  return c;
}

/** Pesan galat Firebase Auth dalam Bahasa Indonesia. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email': return 'Email/NIS atau kata sandi salah.';
    case 'auth/user-disabled': return 'Akun Anda dinonaktifkan. Hubungi operator madrasah.';
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
    case 'auth/network-request-failed': return 'Tidak dapat terhubung. Periksa koneksi internet Anda.';
    case 'auth/weak-password': return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.';
    case 'auth/requires-recent-login': return 'Demi keamanan, keluar lalu masuk kembali sebelum mengganti kata sandi.';
    default: return 'Terjadi kesalahan. Coba lagi.';
  }
}
