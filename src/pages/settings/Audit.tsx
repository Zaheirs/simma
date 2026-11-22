import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useSWR } from '../../lib/swr';
import { useDebounced } from '../../lib/hooks';
import { getAudit } from '../../services/data';
import { fmtWaktu, norm } from '../../lib/format';
import { Card, EmptyState, Note, PageHeader, SearchInput, Select, TableSkeleton, Td, Th } from '../../components/ui';
import { labelAksi } from '../dashboard/Dashboard';

const KOL = [['', 'Semua data'], ['students', 'Siswa'], ['users', 'Akun'], ['guardian_links', 'Relasi wali'], ['guardians', 'Orang tua/wali'], ['staff', 'Guru/tendik'], ['classes', 'Rombel'], ['settings', 'Pengaturan']];

function ringkas(v: unknown): string {
  if (v === undefined || v === null) return '–';
  if (typeof v !== 'object') return String(v);
  return Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined && x !== '').map(([k, x]) => `${k}: ${Array.isArray(x) ? x.join(', ') : typeof x === 'object' ? '…' : x}`).join(' · ') || '–';
}

export default function AuditPage() {
  const [kol, setKol] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const a = useSWR(`audit:${kol}`, () => getAudit(kol || undefined), { ttl: 30_000 });
  const rows = useMemo(() => (a.data || []).filter((x) => !dq || norm(x.actorNama).includes(norm(dq)) || norm(labelAksi(x.aksi)).includes(norm(dq)) || x.docId.includes(dq)), [a.data, dq]);
  return (
    <>
      <PageHeader eyebrow="Pengaturan" title="Jejak Audit" subtitle="Catatan permanen perubahan data sensitif, persetujuan, penolakan, pengarsipan, dan koreksi. Tidak bisa diubah atau dihapus." />
      <Card>
        <div className="grid gap-2 p-4 sm:grid-cols-[1fr_220px] sm:px-5">
          <SearchInput value={q} onChange={setQ} placeholder="Cari pengguna, aksi, atau ID data" />
          <Select value={kol} onChange={(e) => setKol(e.target.value)} aria-label="Filter jenis data">{KOL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        </div>
        {a.loading ? <TableSkeleton /> : !rows.length ? <EmptyState icon={<ScrollText className="h-7 w-7" />} title="Belum ada catatan" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr><Th>Waktu</Th><Th>Pengguna</Th><Th>Aksi</Th><Th>Data</Th><Th>Sebelum → Sesudah</Th><Th>Alasan</Th></tr></thead>
              <tbody>{rows.map((x) => (
                <tr key={x.id} className="align-top hover:bg-canvas">
                  <Td className="whitespace-nowrap text-[13px] text-ink-2">{fmtWaktu(x.waktu)}</Td>
                  <Td className="font-semibold">{x.actorNama}</Td>
                  <Td>{labelAksi(x.aksi)}</Td>
                  <Td className="text-[13px] text-ink-2">{x.koleksi}/{x.docId}</Td>
                  <Td className="max-w-[320px] text-[13px]"><span className="text-ink-2">{ringkas(x.sebelum)}</span> → <span>{ringkas(x.sesudah)}</span></Td>
                  <Td className="text-[13px]">{x.alasan || '–'}</Td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      <Note className="mt-4">Menampilkan 100 catatan terbaru. Unduhan lengkap tersedia lewat ekspor di tahap Laporan.</Note>
    </>
  );
}
