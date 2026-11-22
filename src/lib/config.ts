/** Konfigurasi dibaca dari variabel lingkungan Vite (VITE_*). Tidak ada rahasia di sini. */
const env = import.meta.env;

export const CONFIG = {
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  },
  gasUrl: (env.VITE_GAS_URL as string) || '',
  loginDomain: (env.VITE_LOGIN_DOMAIN as string) || 'simma.local',
  useEmulator: env.VITE_USE_EMULATOR === 'true',
  version: '1.0.1',
};

export const CONFIG_OK = Boolean(CONFIG.firebase.apiKey && CONFIG.firebase.projectId);

/** "2023045" → "2023045@domain". Alamat email lengkap dibiarkan apa adanya. */
export function toLoginEmail(input: string): string {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${CONFIG.loginDomain}`;
}

export function isNisAccount(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@' + CONFIG.loginDomain.toLowerCase());
}
