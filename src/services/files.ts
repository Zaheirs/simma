/* Berkas disimpan di Google Drive lewat GAS (folder tidak publik). Firestore hanya menyimpan metadata (PRD §4.1, §4.4). */
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { callGas, fileToBase64 } from '../lib/gas';
import { useSWR } from '../lib/swr';

export const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export interface FileMeta { id: string; driveFileId: string; nama: string; kategori: string; mime: string; ukuran: number; ownerUid: string; relasi: { koleksi: string; docId: string }; status: string }

export function validateFile(f: File, maxMb: number): string | null {
  if (!ALLOWED.includes(f.type)) return 'Format tidak didukung. Gunakan JPG, PNG, PDF, DOCX, atau XLSX.';
  if (f.size > maxMb * 1024 * 1024 && !f.type.startsWith('image/')) return `Ukuran berkas maksimal ${maxMb} MB.`;
  if (f.size > 15 * 1024 * 1024) return 'Berkas terlalu besar (maks 15 MB sebelum dikompres).';
  return null;
}

/** folder: sub-folder Drive, mis. "01_Siswa/2023045". */
export async function uploadFile(file: File, opt: { folder: string; kategori: string; koleksi: string; docId: string }): Promise<FileMeta> {
  const b = await fileToBase64(file);
  const r = await callGas<{ fileId: string; name: string; size: number; mime: string }>('uploadFile', { ...b, folder: opt.folder }, { write: true });
  const meta = {
    driveFileId: r.fileId, nama: r.name, kategori: opt.kategori, mime: r.mime, ukuran: r.size,
    ownerUid: auth.currentUser!.uid, relasi: { koleksi: opt.koleksi, docId: opt.docId }, status: 'aktif', waktu: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'files'), meta);
  return { id: ref.id, ...meta } as unknown as FileMeta;
}

export async function filesOf(koleksi: string, docId: string): Promise<FileMeta[]> {
  const s = await getDocs(query(collection(db, 'files'), where('relasi.koleksi', '==', koleksi), where('relasi.docId', '==', docId), limit(50)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }) as FileMeta);
}

/** Ambil isi berkas privat (setelah GAS memeriksa hak akses) sebagai data URL. Disimpan di cache memori saja. */
export function useDriveFile(fileId?: string | null) {
  return useSWR(fileId ? `drive:${fileId}` : null, async () => {
    const r = await callGas<{ mime: string; base64: string }>('getFile', { fileId });
    return `data:${r.mime};base64,${r.base64}`;
  }, { ttl: 30 * 60_000 });
}

export async function openDriveFile(fileId: string) {
  const r = await callGas<{ mime: string; base64: string; name: string }>('getFile', { fileId });
  const bin = atob(r.base64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([u8], { type: r.mime }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
