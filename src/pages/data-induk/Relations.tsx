import { useState } from 'react';
import { CircleCheck, ShieldCheck, CircleX } from 'lucide-react';
import { invalidate, useSWR } from '../../lib/swr';
import { decideLink, getLinks } from '../../services/data';
import { fmtWaktu } from '../../lib/format';
import type { GuardianLink, LinkStatus } from '../../lib/types';
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, Note, PageHeader, TableSkeleton, Tabs, Textarea } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

export default function Relations() {
  const [tab, setTab] = useState<LinkStatus>('menunggu');
  const l = useSWR(`links:${tab}`, () => getLinks(tab), { ttl: 30_000 });
  const [act, setAct] = useState<{ link: GuardianLink; to: 'terverifikasi' | 'ditolak' } | null>(null);
  return (
    <>
      <PageHeader eyebrow="Data Induk" title="Verifikasi Relasi Wali Murid" subtitle="Pastikan wali benar orang tua/wali siswa (cek KK atau berkas pendukung) sebelum memberi akses data anak." />
      <Note className="mb-4">Wali murid <b>tidak</b> bisa melihat data anak hanya dengan memasukkan NIS. Akses terbuka setelah relasi diverifikasi di halaman ini (PRD §3.6).</Note>
      <Card>
        <div className="px-4 pt-2 sm:px-5">
          <Tabs value={tab} onChange={setTab} tabs={[{ key: 'menunggu', label: 'Menunggu' }, { key: 'terverifikasi', label: 'Terverifikasi' }, { key: 'ditolak', label: 'Ditolak' }]} />
        </div>
        {l.loading ? <TableSkeleton cols={4} /> : !l.data?.length ? (
          <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title={tab === 'menunggu' ? 'Tidak ada relasi menunggu' : 'Belum ada data'} text={tab === 'menunggu' ? 'Relasi dibuat dari menu Orang Tua / Wali atau impor Excel.' : undefined} />
        ) : (
          <ul className="divide-y divide-line">
            {l.data.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar nama={x.guardianName} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><b>{x.guardianName}</b> <span className="text-ink-2">({x.hubungan || 'Wali'}) → </span><b>{x.studentName}</b> <span className="caption">NIS {x.studentId}</span></p>
                  <p className="caption mt-0.5">Diajukan {fmtWaktu(x.createdAt)}{x.verifiedAt ? ` · Diputuskan ${fmtWaktu(x.verifiedAt)}` : ''}{x.catatan ? ` · Catatan: ${x.catatan}` : ''}</p>
                </div>
                {tab === 'menunggu' ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<CircleX className="h-4 w-4" />} onClick={() => setAct({ link: x, to: 'ditolak' })}>Tolak</Button>
                    <Button size="sm" icon={<CircleCheck className="h-4 w-4" />} onClick={() => setAct({ link: x, to: 'terverifikasi' })}>Verifikasi</Button>
                  </div>
                ) : <Badge tone={tab === 'terverifikasi' ? 'ok' : 'bad'}>{tab}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {act && <DecideModal link={act.link} to={act.to} onClose={() => setAct(null)} />}
    </>
  );
}

function DecideModal({ link, to, onClose }: { link: GuardianLink; to: 'terverifikasi' | 'ditolak'; onClose: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const tolak = to === 'ditolak';
  async function go() {
    if (tolak && note.trim().length < 5) { toast.warn('Alasan penolakan wajib diisi (min. 5 karakter).'); return; }
    setBusy(true);
    try { await decideLink(link, to, note.trim()); invalidate('links'); invalidate('count:relasi'); toast.ok(tolak ? 'Relasi ditolak.' : 'Relasi terverifikasi. Wali kini dapat melihat data anak.'); onClose(); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={tolak ? 'Tolak relasi' : 'Verifikasi relasi'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button><Button variant={tolak ? 'danger' : 'primary'} onClick={go} loading={busy}>{tolak ? 'Konfirmasi Tolak' : 'Ya, Verifikasi'}</Button></>}>
      <div className="grid gap-4">
        <p className="text-sm text-ink-2"><b className="text-ink">{link.guardianName}</b> sebagai {link.hubungan || 'wali'} dari <b className="text-ink">{link.studentName}</b>.</p>
        <Field label={tolak ? 'Alasan penolakan' : 'Catatan (opsional)'} required={tolak}>{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tolak ? 'mis. Nama tidak sesuai KK' : 'mis. Sesuai KK'} />}</Field>
      </div>
    </Modal>
  );
}
