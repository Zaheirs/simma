import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { invalidate, useSWR } from '../../lib/swr';
import { useActiveYear, useClasses } from '../../lib/hooks';
import { getStudent, saveStudent } from '../../services/data';
import { Button, Card, Field, Input, Note, Select, Spinner, Textarea } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

const EMPTY = { nis: '', nisn: '', nism: '', nama: '', jk: 'L' as 'L' | 'P', tempatLahir: '', tanggalLahir: '', alamat: '', kelurahan: '', kecamatan: '', classId: '' };
type F = typeof EMPTY;

export default function StudentForm() {
  const { nis } = useParams();
  const edit = !!nis;
  const nav = useNavigate();
  const toast = useToast();
  const year = useActiveYear();
  const classes = useClasses(year.data?.id);
  const cur = useSWR(edit ? `student:${nis}` : null, () => getStudent(nis!), { ttl: 60_000 });
  const [f, setF] = useState<F>(EMPTY);
  const [err, setErr] = useState<Partial<Record<keyof F, string>>>({});
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (cur.data) {
      const s = cur.data;
      setF({ nis: s.nis, nisn: s.nisn || '', nism: s.nism || '', nama: s.nama, jk: s.jk, tempatLahir: s.tempatLahir || '', tanggalLahir: s.tanggalLahir || '',
        alamat: s.alamat || '', kelurahan: s.kelurahan || '', kecamatan: s.kecamatan || '', classId: s.classId || '' });
    }
  }, [cur.data]);

  const set = <K extends keyof F>(k: K, v: F[K]) => { setF((x) => ({ ...x, [k]: v })); if (err[k]) setErr((e) => ({ ...e, [k]: undefined })); };

  function validate(): boolean {
    const e: typeof err = {};
    if (!/^\d{3,20}$/.test(f.nis.trim())) e.nis = 'NIS wajib diisi, hanya angka (3–20 digit).';
    if (f.nisn && !/^\d{10}$/.test(f.nisn.trim())) e.nisn = 'NISN terdiri dari 10 digit angka.';
    if (f.nism && !/^\d{6,20}$/.test(f.nism.trim())) e.nism = 'NISM hanya angka.';
    if (f.nama.trim().length < 3) e.nama = 'Nama lengkap minimal 3 huruf.';
    if (f.tanggalLahir && new Date(f.tanggalLahir) > new Date()) e.tanggalLahir = 'Tanggal lahir tidak boleh di masa depan.';
    setErr(e);
    return !Object.keys(e).length;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setFormErr(null);
    if (!validate()) { toast.warn('Periksa kembali isian yang ditandai merah.'); return; }
    const kelas = classes.data?.find((c) => c.id === f.classId);
    setBusy(true);
    try {
      await saveStudent({
        nis: f.nis.trim(), nisn: f.nisn.trim(), nism: f.nism.trim(), nama: f.nama.trim().replace(/\s+/g, ' '), jk: f.jk,
        tempatLahir: f.tempatLahir.trim(), tanggalLahir: f.tanggalLahir, alamat: f.alamat.trim(), kelurahan: f.kelurahan.trim(), kecamatan: f.kecamatan.trim(),
        classId: f.classId || null, className: kelas?.nama || null, academicYearId: f.classId ? year.data?.id || null : cur.data?.academicYearId || null,
      }, cur.data || null);
      invalidate('students'); invalidate(`student:${f.nis.trim()}`); invalidate('dash');
      toast.ok(edit ? 'Data siswa diperbarui.' : 'Siswa baru tersimpan.');
      nav(`/siswa/${f.nis.trim()}`, { replace: true });
    } catch (x) {
      const m = (x as Error).message;
      if (m.includes('NIS ')) setErr((e) => ({ ...e, nis: m })); else if (m.includes('NISN')) setErr((e) => ({ ...e, nisn: m })); else if (m.includes('NISM')) setErr((e) => ({ ...e, nism: m }));
      setFormErr(m.includes('permission') ? 'Akun Anda tidak memiliki izin menyimpan data siswa.' : m);
    } finally { setBusy(false); }
  }

  if (edit && cur.loading) return <Spinner />;

  return (
    <form onSubmit={submit} noValidate>
      <Link to={edit ? `/siswa/${nis}` : '/siswa'} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
      <h1 className="h1 mb-1">{edit ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}</h1>
      <p className="mb-5 text-sm text-ink-2">Kolom bertanda <span className="text-bad">*</span> wajib diisi.</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="h3 mb-4 border-b border-line pb-2">1. Identitas Pokok</h2>
          <div className="grid gap-4">
            <Field label="NIS (Nomor Induk Siswa)" required error={err.nis} hint={edit ? 'NIS tidak dapat diubah setelah tersimpan.' : 'Wajib dan tidak boleh sama dengan siswa lain.'}>
              {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" value={f.nis} onChange={(e) => set('nis', e.target.value)} disabled={edit} invalid={!!err.nis} placeholder="mis. 2026001" />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="NISN" error={err.nisn} hint="Opsional, unik bila diisi">{(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" value={f.nisn} onChange={(e) => set('nisn', e.target.value)} invalid={!!err.nisn} placeholder="10 digit" />}</Field>
              <Field label="NISM" error={err.nism} hint="Opsional, unik bila diisi">{(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" value={f.nism} onChange={(e) => set('nism', e.target.value)} invalid={!!err.nism} />}</Field>
            </div>
            <Field label="Nama lengkap" required error={err.nama}>{(id, d) => <Input id={id} aria-describedby={d} value={f.nama} onChange={(e) => set('nama', e.target.value)} invalid={!!err.nama} autoComplete="off" />}</Field>
            <fieldset>
              <legend className="label mb-1.5 text-ink">Jenis kelamin <span className="text-bad">*</span></legend>
              <div className="grid grid-cols-2 gap-2">
                {(['L', 'P'] as const).map((v) => (
                  <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded border px-3 text-sm ${f.jk === v ? 'border-brand-600 bg-brand-tint font-semibold' : 'border-line-input'}`}>
                    <input type="radio" name="jk" value={v} checked={f.jk === v} onChange={() => set('jk', v)} className="accent-brand-600" />{v === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tempat lahir">{(id) => <Input id={id} value={f.tempatLahir} onChange={(e) => set('tempatLahir', e.target.value)} />}</Field>
              <Field label="Tanggal lahir" error={err.tanggalLahir}>{(id) => <Input id={id} type="date" value={f.tanggalLahir} onChange={(e) => set('tanggalLahir', e.target.value)} invalid={!!err.tanggalLahir} />}</Field>
            </div>
          </div>
        </Card>

        <div className="grid h-fit gap-5">
          <Card className="p-5">
            <h2 className="h3 mb-4 border-b border-line pb-2">2. Alamat Tempat Tinggal</h2>
            <div className="grid gap-4">
              <Field label="Alamat lengkap">{(id) => <Textarea id={id} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} placeholder="Jalan, nomor rumah, RT/RW" />}</Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kelurahan">{(id) => <Input id={id} value={f.kelurahan} onChange={(e) => set('kelurahan', e.target.value)} />}</Field>
                <Field label="Kecamatan">{(id) => <Input id={id} value={f.kecamatan} onChange={(e) => set('kecamatan', e.target.value)} />}</Field>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="h3 mb-4 border-b border-line pb-2">3. Penempatan Kelas</h2>
            {!year.data ? <Note tone="warn">Tahun pelajaran aktif belum diatur. Atur dulu di menu Kelas, Mapel & Tahun, atau simpan tanpa kelas.</Note> : (
              <Field label={`Kelas tahun pelajaran ${year.data.nama}`} hint="Pindah kelas tercatat sebagai riwayat baru.">
                {(id) => <Select id={id} value={f.classId} onChange={(e) => set('classId', e.target.value)}><option value="">— Belum ditempatkan —</option>{(classes.data || []).map((c) => <option key={c.id} value={c.id}>Kelas {c.nama}</option>)}</Select>}
              </Field>
            )}
            <p className="caption mt-3">Foto dan dokumen diunggah dari halaman profil siswa setelah data tersimpan.</p>
          </Card>
        </div>
      </div>

      {formErr && <Note tone="bad" className="mt-5">{formErr}</Note>}
      <div className="safe-bottom sticky bottom-16 z-10 -mx-4 mt-5 flex justify-end gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:rounded-lg lg:border">
        <Button variant="secondary" onClick={() => nav(-1)} disabled={busy}>Batal</Button>
        <Button type="submit" loading={busy} icon={<Save className="h-4 w-4" />}>Simpan Data Siswa</Button>
      </div>
    </form>
  );
}
