/* Impor 3 langkah: Unggah → Pratinjau & Validasi → Selesai (PRD US-DI-02). Tidak ada data tertulis sebelum dikonfirmasi. */
import { useRef, useState } from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { CircleCheck, Download, FileSpreadsheet, CloudUpload } from 'lucide-react';
import { db } from '../../lib/firebase';
import { invalidate } from '../../lib/swr';
import { useActiveYear, useClasses } from '../../lib/hooks';
import { audit, createLink, getStudents, logImport, saveGuardian, saveStaff } from '../../services/data';
import { Badge, Button, Card, cx, Note, PageHeader, Select, Td, Th } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { downloadTemplate, readSheet } from './xlsx';

type Jenis = 'siswa' | 'guru' | 'wali';
interface Row { n: number; data: Record<string, string>; errors: string[] }

export default function ImportPage() {
  const toast = useToast();
  const year = useActiveYear();
  const classes = useClasses(year.data?.id);
  const [jenis, setJenis] = useState<Jenis>('siswa');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [skip, setSkip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState({ ok: 0, gagal: 0 });
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function baca(f?: File) {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { toast.bad('Gunakan berkas Excel (.xlsx) atau CSV.'); return; }
    setBusy(true);
    try {
      const raw = await readSheet(f);
      if (!raw.length) { toast.bad('Berkas kosong atau baris judul tidak dikenali.'); return; }
      setFileName(f.name);
      setRows(await validasi(jenis, raw));
      setStep(2);
    } catch (e) { toast.bad('Berkas tidak dapat dibaca: ' + (e as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }

  async function validasi(j: Jenis, raw: Record<string, string>[]): Promise<Row[]> {
    if (j === 'siswa') {
      const [a, b] = await Promise.all([getStudents(false), getStudents(true)]);
      const ada = new Set([...a, ...b].map((s) => s.nis)), nisnAda = new Set([...a, ...b].map((s) => s.nisn).filter(Boolean));
      const seen = new Set<string>(), seenN = new Set<string>();
      const kelas = new Set((classes.data || []).map((c) => c.nama.toUpperCase()));
      return raw.map((d, i) => {
        const e: string[] = [];
        const nis = d.nis || '', nisn = d.nisn || '';
        if (!/^\d{3,20}$/.test(nis)) e.push('NIS kosong/tidak valid');
        else if (ada.has(nis)) e.push('NIS sudah ada di database');
        else if (seen.has(nis)) e.push('NIS ganda di berkas');
        if (nisn && !/^\d{10}$/.test(nisn)) e.push('NISN harus 10 digit');
        else if (nisn && (nisnAda.has(nisn) || seenN.has(nisn))) e.push('NISN sudah dipakai');
        if ((d.nama || '').length < 3) e.push('Nama kosong');
        if (d.jk && !/^[LP]$/i.test(d.jk)) e.push('JK harus L atau P');
        if (d.kelas && !kelas.has(d.kelas.toUpperCase())) e.push(`Kelas ${d.kelas} tidak ada di TP aktif`);
        seen.add(nis); if (nisn) seenN.add(nisn);
        return { n: i + 2, data: d, errors: e };
      });
    }
    if (j === 'wali') {
      const [a] = await Promise.all([getStudents(false)]);
      const ada = new Map(a.map((s) => [s.nis, s.nama]));
      return raw.map((d, i) => {
        const e: string[] = [];
        if ((d.nama || '').length < 3) e.push('Nama kosong');
        if (d.nis_anak && !ada.has(d.nis_anak)) e.push(`NIS anak ${d.nis_anak} tidak ditemukan`);
        return { n: i + 2, data: d, errors: e };
      });
    }
    return raw.map((d, i) => ({ n: i + 2, data: d, errors: (d.nama || '').length < 3 ? ['Nama kosong'] : [] }));
  }

  const valid = rows.filter((r) => !r.errors.length), invalid = rows.length - valid.length;

  async function impor() {
    if (!valid.length) return;
    setBusy(true);
    let ok = 0;
    try {
      if (jenis === 'siswa') {
        const kelasMap = new Map((classes.data || []).map((c) => [c.nama.toUpperCase(), c]));
        for (let i = 0; i < valid.length; i += 120) { // ≤ 3 tulis per siswa → di bawah batas 500 per batch
          const b = writeBatch(db);
          for (const r of valid.slice(i, i + 120)) {
            const d = r.data, k = d.kelas ? kelasMap.get(d.kelas.toUpperCase()) : undefined;
            b.set(doc(db, 'students', d.nis), {
              nis: d.nis, nisn: d.nisn || '', nism: d.nism || '', nama: d.nama.replace(/\s+/g, ' '), jk: (d.jk || 'L').toUpperCase(),
              tempatLahir: d.tempat_lahir || '', tanggalLahir: d.tanggal_lahir || '', alamat: d.alamat || '',
              classId: k?.id || null, className: k?.nama || null, academicYearId: k ? year.data!.id : null,
              status: 'aktif', archived: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            });
            if (d.nisn) b.set(doc(db, 'uniques', `nisn_${d.nisn}`), { studentId: d.nis });
            if (k) b.set(doc(db, 'enrollments', `${year.data!.id}_${d.nis}`), { studentId: d.nis, classId: k.id, className: k.nama, academicYearId: year.data!.id, status: 'aktif' });
          }
          await b.commit();
          ok = Math.min(valid.length, i + 120);
        }
        invalidate('students');
      } else if (jenis === 'guru') {
        for (const r of valid) { await saveStaff({ nama: r.data.nama, nip: r.data.nip || '', jabatan: r.data.jabatan || '', hp: r.data.hp || '', email: r.data.email || '', status: 'aktif', userUid: null }); ok++; }
        invalidate('staff');
      } else {
        const siswa = new Map((await getStudents(false)).map((s) => [s.nis, s]));
        for (const r of valid) {
          const gid = await saveGuardian({ nama: r.data.nama, hubungan: r.data.hubungan || 'Wali', hp: r.data.hp || '', pekerjaan: r.data.pekerjaan || '', userUid: null });
          const s = r.data.nis_anak ? siswa.get(r.data.nis_anak) : undefined;
          if (s) await createLink({ id: s.id, nama: s.nama }, { id: gid, nama: r.data.nama }, r.data.hubungan || 'Wali').catch(() => {});
          ok++;
        }
        invalidate('guardians'); invalidate('links'); invalidate('count:relasi');
      }
      invalidate('dash');
      await logImport(jenis, ok, invalid);
      await audit('impor_data', jenis === 'siswa' ? 'students' : jenis === 'guru' ? 'staff' : 'guardians', fileName, { sesudah: { berhasil: ok, dilewati: invalid } });
      setHasil({ ok, gagal: invalid });
      setStep(3);
    } catch (e) {
      toast.bad(`Impor berhenti setelah ${ok} baris: ${(e as Error).message.includes('permission') ? 'izin ditolak' : (e as Error).message}`);
    } finally { setBusy(false); }
  }

  const steps = ['Unggah Berkas', 'Pratinjau & Validasi', 'Selesai'];
  const cols = jenis === 'siswa' ? ['nis', 'nisn', 'nama', 'jk', 'kelas'] : jenis === 'guru' ? ['nama', 'nip', 'jabatan', 'hp'] : ['nama', 'hubungan', 'hp', 'nis_anak'];

  return (
    <>
      <PageHeader eyebrow="Data Induk" title="Impor Data dari Excel" subtitle="Data diperiksa dan ditampilkan dulu. Tidak ada yang tersimpan sebelum Anda menekan tombol impor." />
      <ol className="mb-5 flex flex-wrap items-center gap-2 text-sm" aria-label="Langkah impor">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cx('grid h-7 w-7 place-items-center rounded-full text-xs font-bold', step > i + 1 ? 'bg-brand text-white' : step === i + 1 ? 'bg-white text-brand ring-2 ring-gold' : 'bg-surface-recessed text-ink-muted')}>{step > i + 1 ? '✓' : i + 1}</span>
            <span className={step === i + 1 ? 'font-semibold' : 'text-ink-2'}>{s}</span>
            {i < 2 && <span className="mx-1 h-px w-6 bg-line-input" aria-hidden />}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-[240px_auto] sm:items-end">
            <label className="grid gap-1"><span className="label text-ink">Jenis data</span>
              <Select value={jenis} onChange={(e) => setJenis(e.target.value as Jenis)}><option value="siswa">Data Siswa</option><option value="guru">Guru & Tendik</option><option value="wali">Orang Tua / Wali</option></Select>
            </label>
            <Button variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => downloadTemplate(jenis)} className="justify-self-start">Unduh template Excel</Button>
          </div>
          {jenis === 'siswa' && !year.data && <Note tone="warn" className="mt-4">Tahun pelajaran aktif belum diatur. Kolom kelas akan dianggap tidak valid.</Note>}
          {jenis === 'wali' && <Note className="mt-4">Kolom <b>nis_anak</b> otomatis membuat relasi berstatus <b>menunggu</b>. Relasi tetap perlu diverifikasi.</Note>}
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); baca(e.dataTransfer.files[0]); }}
            className={cx('mt-5 grid place-items-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors', drag ? 'border-brand-600 bg-brand-tint' : 'border-line-input bg-canvas')}>
            <CloudUpload className="h-10 w-10 text-brand" aria-hidden />
            <p className="mt-3 font-semibold">Seret berkas Excel ke sini</p>
            <p className="caption mt-1">atau</p>
            <Button className="mt-3" loading={busy} icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => input.current?.click()}>Pilih Berkas</Button>
            <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => baca(e.target.files?.[0])} />
            <p className="caption mt-3">Baris pertama wajib berisi judul kolom sesuai template.</p>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <FileSpreadsheet className="h-5 w-5 text-brand" aria-hidden /><span className="font-semibold">{fileName}</span>
            <Badge tone="ok">{valid.length} valid</Badge>{invalid > 0 && <Badge tone="bad">{invalid} bermasalah</Badge>}
            <label className="ml-auto flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="h-[18px] w-[18px] accent-brand-600" /> Lewati baris bermasalah</label>
          </div>
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full min-w-[640px]">
              <thead className="sticky top-0"><tr><Th>Baris</Th>{cols.map((c) => <Th key={c}>{c.replace('_', ' ')}</Th>)}<Th>Keterangan</Th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.n} className={r.errors.length ? 'bg-[#FEF2F2]' : ''}>
                  <Td className="text-ink-2">{r.n}</Td>{cols.map((c) => <Td key={c}>{r.data[c] || <span className="text-ink-muted">–</span>}</Td>)}
                  <Td>{r.errors.length ? <span className="text-[13px] font-medium text-bad">{r.errors.join('; ')}</span> : <Badge tone="ok">Siap</Badge>}</Td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-3">
            <Button variant="secondary" onClick={() => { setStep(1); setRows([]); }} disabled={busy}>Unggah Ulang</Button>
            <Button onClick={impor} loading={busy} disabled={!valid.length || (!skip && invalid > 0)}>Impor {valid.length} Data Valid</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-10 text-center">
          <CircleCheck className="mx-auto h-14 w-14 text-ok" aria-hidden />
          <h2 className="h2 mt-3">Impor selesai</h2>
          <p className="mt-1 text-sm text-ink-2">{hasil.ok} data tersimpan{hasil.gagal ? `, ${hasil.gagal} baris dilewati` : ''}. Tercatat di jejak audit.</p>
          <Button className="mt-5" variant="secondary" onClick={() => { setStep(1); setRows([]); }}>Impor Berkas Lain</Button>
        </Card>
      )}
    </>
  );
}
