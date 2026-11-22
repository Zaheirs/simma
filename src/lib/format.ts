import type { Timestamp } from 'firebase/firestore';

const TZ = 'Asia/Jakarta';

function toDate(v: Date | Timestamp | string | number | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && 'toDate' in v) return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** 19 Nov 2026 */
export function fmtTanggal(v: Parameters<typeof toDate>[0]): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '-';
}

/** Kamis, 19 November 2026 */
export function fmtTanggalPanjang(v: Parameters<typeof toDate>[0]): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }) : '-';
}

/** 19 Nov 2026, 07.45 WIB */
export function fmtWaktu(v: Parameters<typeof toDate>[0]): string {
  const d = toDate(v);
  if (!d) return '-';
  const t = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).replace(':', '.');
  return `${fmtTanggal(d)}, ${t} WIB`;
}

/** 12 menit lalu */
export function fmtRelatif(v: Parameters<typeof toDate>[0]): string {
  const d = toDate(v);
  if (!d) return '-';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return fmtTanggal(d);
}

export function fmtRupiah(n: number | null | undefined): string {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

export function salam(nama: string): string {
  return `Assalamu'alaikum, ${nama.split(',')[0].split(' ').slice(0, 3).join(' ')}`;
}

export function inisial(nama: string): string {
  return nama.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('');
}

/** Cari tanpa membedakan huruf besar/kecil & aksen. */
export function norm(s: string | undefined | null): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function reqId(): string {
  return (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
}
