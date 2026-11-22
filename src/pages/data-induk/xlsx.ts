/* Pustaka Excel dimuat hanya saat dibutuhkan (lazy) agar halaman lain tetap ringan. */
export async function exportXlsx(nama: string, rows: Record<string, unknown>[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(10, k.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const tgl = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${nama}-${tgl}.xlsx`);
}

export async function readSheet(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
  return raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()])));
}

export async function downloadTemplate(jenis: 'siswa' | 'guru' | 'wali') {
  const contoh: Record<string, Record<string, string>[]> = {
    siswa: [{ nis: '2026001', nisn: '', nism: '', nama: 'Nama Lengkap Siswa', jk: 'L', tempat_lahir: 'Surabaya', tanggal_lahir: '2019-07-15', alamat: 'Jl. Contoh No. 1', kelas: '1A' }],
    guru: [{ nama: 'Nama Guru, S.Pd.', nip: '', jabatan: 'Guru Kelas', hp: '08xxxxxxxxxx', email: '' }],
    wali: [{ nama: 'Nama Orang Tua', hubungan: 'Ayah', hp: '08xxxxxxxxxx', pekerjaan: '', nis_anak: '2026001' }],
  };
  await exportXlsx(`template-impor-${jenis}`, contoh[jenis]);
}
