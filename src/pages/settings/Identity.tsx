import { useEffect, useRef, useState } from 'react';
import { Building, ImageUp, Save } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { can } from '../../lib/rbac';
import { CONFIG } from '../../lib/config';
import { useSWR, invalidate } from '../../lib/swr';
import { getSettings, saveSettings } from '../../services/data';
import { uploadFile, useDriveFile, validateFile } from '../../services/files';
import type { SchoolSettings } from '../../lib/types';
import { Button, Card, CardHeader, Field, Input, Note, PageHeader, Spinner, Textarea } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { BrandMark } from '../../components/layout/BrandMark';

const DEF: SchoolSettings = { namaMadrasah: 'MI. Miftahul Ulum Semampir', alamat: '', nsm: '', npsn: '', kepalaMadrasah: '', telepon: '', maxUploadMb: 2, batasPersetujuanPengeluaran: 500000, logoFileId: null };

export default function Identity() {
  const { role } = useAuth();
  const toast = useToast();
  const s = useSWR('settings', getSettings, { ttl: 5 * 60_000 });
  const [f, setF] = useState<SchoolSettings>(DEF);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const logo = useDriveFile(f.logoFileId);
  const edit = can(role, 'pengaturan.kelola');
  useEffect(() => { if (s.data) setF({ ...DEF, ...s.data }); }, [s.data]);
  const set = <K extends keyof SchoolSettings>(k: K, v: SchoolSettings[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    if (f.namaMadrasah.trim().length < 3) { toast.warn('Nama madrasah wajib diisi.'); return; }
    if (f.maxUploadMb < 1 || f.maxUploadMb > 10) { toast.warn('Batas unggah 1–10 MB.'); return; }
    setBusy(true);
    try { await saveSettings(f, s.data || null); invalidate('settings'); toast.ok('Identitas madrasah tersimpan.'); }
    catch (x) { toast.bad((x as Error).message); } finally { setBusy(false); }
  }
  async function gantiLogo(file?: File) {
    if (!file) return;
    const e = validateFile(file, 2);
    if (e || !file.type.startsWith('image/')) { toast.bad(e || 'Logo harus JPG atau PNG.'); return; }
    setUp(true);
    try { const m = await uploadFile(file, { folder: '00_Identitas', kategori: 'logo', koleksi: 'settings', docId: 'school' }); set('logoFileId', m.driveFileId); toast.info('Logo terunggah. Tekan Simpan untuk menerapkan.'); }
    catch (x) { toast.bad((x as Error).message); } finally { setUp(false); }
  }

  if (s.loading) return <Spinner />;
  return (
    <>
      <PageHeader eyebrow="Pengaturan" title="Identitas Madrasah" subtitle="Dipakai di kop surat, rapor, kuitansi, dan tampilan aplikasi. Mengubahnya tidak perlu mengubah kode." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader icon={<Building className="h-4 w-4" />} title="Data Lembaga" />
          <fieldset disabled={!edit} className="grid gap-4 p-5">
            <Field label="Nama madrasah" required>{(id) => <Input id={id} value={f.namaMadrasah} onChange={(e) => set('namaMadrasah', e.target.value)} />}</Field>
            <Field label="Alamat lengkap">{(id) => <Textarea id={id} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} />}</Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="NSM">{(id) => <Input id={id} value={f.nsm} onChange={(e) => set('nsm', e.target.value)} />}</Field>
              <Field label="NPSN">{(id) => <Input id={id} value={f.npsn} onChange={(e) => set('npsn', e.target.value)} />}</Field>
              <Field label="Telepon">{(id) => <Input id={id} value={f.telepon} onChange={(e) => set('telepon', e.target.value)} />}</Field>
            </div>
            <Field label="Kepala madrasah (untuk tanda tangan)">{(id) => <Input id={id} value={f.kepalaMadrasah} onChange={(e) => set('kepalaMadrasah', e.target.value)} />}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Batas ukuran unggah (MB)" hint="Berkas non-foto. Foto otomatis dikompres.">{(id) => <Input id={id} type="number" min={1} max={10} value={f.maxUploadMb} onChange={(e) => set('maxUploadMb', Number(e.target.value))} />}</Field>
              <Field label="Batas nominal persetujuan pengeluaran (Rp)" hint="Dipakai modul Keuangan (Tahap 1.7)">{(id) => <Input id={id} type="number" min={0} value={f.batasPersetujuanPengeluaran || 0} onChange={(e) => set('batasPersetujuanPengeluaran', Number(e.target.value))} />}</Field>
            </div>
            {edit && <div className="flex justify-end"><Button onClick={save} loading={busy} icon={<Save className="h-4 w-4" />}>Simpan</Button></div>}
          </fieldset>
        </Card>
        <div className="grid h-fit gap-5">
          <Card className="p-5">
            <h2 className="h3 mb-3">Pratinjau Kop</h2>
            <div className="rounded border border-line bg-white p-4">
              <div className="flex items-center gap-3">
                {logo.data ? <img src={logo.data} alt="Logo madrasah" className="h-14 w-14 object-contain" /> : <BrandMark className="h-14 w-14" filled />}
                <div className="min-w-0 flex-1 text-center">
                  <p className="text-[13px] font-bold uppercase tracking-wide">{f.namaMadrasah || 'Nama Madrasah'}</p>
                  <p className="text-[11px] text-ink-2">{f.alamat || 'Alamat madrasah'}</p>
                  {(f.nsm || f.npsn) && <p className="text-[11px] text-ink-2">{f.nsm && `NSM ${f.nsm}`}{f.nsm && f.npsn ? ' · ' : ''}{f.npsn && `NPSN ${f.npsn}`}</p>}
                </div>
              </div>
              <div className="mt-3 border-t-2 border-brand" /><div className="mt-0.5 border-t border-gold" />
            </div>
            {edit && <>
              <Button className="mt-4" variant="secondary" block loading={up} icon={<ImageUp className="h-4 w-4" />} onClick={() => ref.current?.click()} disabled={!CONFIG.gasUrl}>Unggah Logo</Button>
              <input ref={ref} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => gantiLogo(e.target.files?.[0])} />
            </>}
          </Card>
          <Note>Logo disimpan privat di Google Drive madrasah, folder <code>SIMMA/00_Identitas</code>.</Note>
        </div>
      </div>
    </>
  );
}
