/* Klien REST ke Google Apps Script (gas-pro-api + gas-instant-ux-pro Prinsip 8).
 * - POST dengan Content-Type text/plain agar tidak ada preflight CORS yang ditolak GAS.
 * - Setiap panggilan membawa Firebase ID token; GAS memverifikasinya sebelum memproses.
 * - Baca: timeout 25 dtk + coba ulang 3x. Tulis: timeout 90 dtk, hanya diulang dengan reqId yang sama (idempoten). */
import { auth } from './firebase';
import { CONFIG } from './config';
import { reqId as newReqId } from './format';

export class GasError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

interface Opts { write?: boolean; timeoutMs?: number }

export async function callGas<T = unknown>(action: string, data: Record<string, unknown> = {}, opts: Opts = {}): Promise<T> {
  if (!CONFIG.gasUrl) throw new GasError('Alamat server berkas (VITE_GAS_URL) belum diisi. Hubungi Super Admin.', 'NO_GAS');
  const user = auth.currentUser;
  if (!user) throw new GasError('Sesi berakhir. Silakan masuk kembali.', 'NO_AUTH');

  const write = !!opts.write;
  const timeout = opts.timeoutMs ?? (write ? 90_000 : 25_000);
  const rid = write ? newReqId() : undefined;
  const maxTry = write ? 2 : 3;
  let last: unknown;

  for (let i = 0; i < maxTry; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(CONFIG.gasUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, idToken, reqId: rid, data }),
        signal: ctrl.signal,
      });
      if (res.status >= 500 || res.status === 429) throw new GasError('Server sibuk, mencoba lagi…', 'RETRY');
      const json = await res.json();
      if (!json.success) throw new GasError(json.message || 'Permintaan ditolak server.', json.code || 'FAIL');
      return json.data as T;
    } catch (err) {
      last = err;
      const retryable = (err as Error).name === 'AbortError' || (err as GasError).code === 'RETRY' || err instanceof TypeError;
      if (!retryable || i === maxTry - 1) break;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  if ((last as Error)?.name === 'AbortError') throw new GasError('Koneksi terlalu lambat. Periksa internet lalu coba lagi.', 'TIMEOUT');
  if (last instanceof TypeError) throw new GasError('Tidak dapat terhubung ke server. Periksa internet Anda.', 'NETWORK');
  throw last;
}

/** Ubah File menjadi base64 (tanpa awalan data:) untuk dikirim ke GAS. Foto dikecilkan dulu agar hemat kuota. */
export async function fileToBase64(file: File, maxSide = 1280): Promise<{ base64: string; mime: string; name: string }> {
  let blob: Blob = file;
  if (file.type.startsWith('image/') && file.type !== 'image/gif') blob = await compressImage(file, maxSide);
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { base64: btoa(bin), mime: blob.type || file.type, name: file.name };
}

async function compressImage(file: File, maxSide: number): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 400_000) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok) => c.toBlob((b) => ok(b || file), 'image/jpeg', 0.82));
  } catch { return file; }
}
