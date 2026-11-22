import { useParams, Link } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader } from '../components/ui';

const INFO: Record<string, { judul: string; tahap: string; isi: string[] }> = {
  presensi: { judul: 'Presensi Harian', tahap: 'Tahap 1.5', isi: ['Input absensi lewat HP (Hadir otomatis, ubah S/I/A sekali ketuk)', 'Koreksi dengan alasan & riwayat perubahan', 'Rekap harian–tahunan, ekspor PDF/Excel', 'Izin wali murid otomatis tercatat'] },
  penilaian: { judul: 'Penilaian & Rapor', tahap: 'Tahap 1.6', isi: ['Guru input nilai mapel yang diampu', 'Wali Kelas memeriksa leger', 'Kepala Madrasah menyetujui', 'Rapor PDF terbit ke portal wali murid'] },
  keuangan: { judul: 'Tagihan & Kas', tahap: 'Tahap 1.7', isi: ['Tagihan bulanan & insidental massal', 'Verifikasi bukti transfer & kuitansi PDF', 'Buku kas berbasis ledger (tanpa hapus)', 'Pengajuan pengeluaran dengan persetujuan Kepala'] },
  portal: { judul: 'Portal Anak', tahap: 'Tahap 1.8', isi: ['Kehadiran & nilai anak', 'Tagihan dan unggah bukti bayar', 'Pengajuan izin/sakit', 'Unduh rapor yang sudah terbit'] },
  pengumuman: { judul: 'Pengumuman & Notifikasi', tahap: 'Tahap 1.8', isi: ['Pengumuman umum & per kelas', 'Notifikasi dalam aplikasi', 'Notifikasi push PWA bila perangkat mendukung'] },
};

export default function ComingSoon({ modul: m }: { modul?: string }) {
  const p = useParams();
  const key = m || p.modul || '';
  const info = INFO[key] || { judul: 'Modul berikutnya', tahap: 'Tahap berikutnya', isi: [] };
  return (
    <>
      <PageHeader eyebrow={info.tahap} title={info.judul} subtitle="Modul ini sudah direncanakan di PRD dan dibangun pada tahap berikutnya, di atas fondasi akun dan hak akses yang sudah aktif." />
      <Card>
        <EmptyState icon={<Hourglass className="h-7 w-7" />} title="Segera hadir" text="Data yang Anda masukkan di Data Induk sekarang akan langsung dipakai oleh modul ini." action={<Link to="/"><Button variant="secondary">Kembali ke Beranda</Button></Link>} />
        {info.isi.length > 0 && (
          <ul className="mx-auto mb-8 grid max-w-md gap-2 px-6 text-sm text-ink-2">
            {info.isi.map((s) => <li key={s} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" aria-hidden />{s}</li>)}
          </ul>
        )}
      </Card>
    </>
  );
}
