/* Dashboard berbeda per peran (PRD §7.4): Kepala melihat gambaran menyeluruh, Guru melihat pekerjaan hari ini,
 * Wali Murid hanya anaknya. Tahap 1 hanya menampilkan angka nyata dari database — tidak ada angka contoh. */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Building2, CalendarCheck, CircleCheck, ClipboardCheck, FileUp, GraduationCap, HeartHandshake, History, Info, ScrollText, ShieldCheck, Sparkles, UserCog, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useSWR } from '../../lib/swr';
import { useActiveYear, useClasses } from '../../lib/hooks';
import { countOf, countPendingLinks, getAudit, getStudent, getStudents, myClassIds, where } from '../../services/data';
import { fmtRelatif, fmtTanggalPanjang, salam } from '../../lib/format';
import { ROLES } from '../../lib/rbac';
import { CONFIG } from '../../lib/config';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Note, Skeleton, StatCard, Td, Th } from '../../components/ui';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { GuardianLink, Student } from '../../lib/types';

export default function Dashboard() {
  const { role } = useAuth();
  switch (role) {
    case 'kepala': return <KepalaDash />;
    case 'super_admin': return <SuperDash />;
    case 'operator': return <OperatorDash />;
    case 'tu': return <TuDash />;
    case 'guru':
    case 'wali_kelas': return <GuruDash />;
    case 'wali_murid': return <WaliMuridDash />;
    case 'siswa': return <SiswaDash />;
    default: return <GenericDash />;
  }
}

function Hero({ eyebrow, title, subtitle, right }: { eyebrow: string; title: string; subtitle: string; right?: ReactNode }) {
  const year = useActiveYear();
  return (
    <Card className="mb-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="h1 mt-1">{title}</h1>
          <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {year.data ? <Badge tone="brand">TP {year.data.nama} · Semester {year.data.semesterAktif}</Badge> : year.loading ? <Skeleton className="h-5 w-40" /> : <Badge tone="warn">Tahun pelajaran aktif belum diatur</Badge>}
          <span className="caption">{fmtTanggalPanjang(new Date())}</span>
          {right}
        </div>
      </div>
      <div className="gold-rule mt-5" />
    </Card>
  );
}

function useCounts() {
  const year = useActiveYear();
  return useSWR(year.data !== undefined ? `dash:counts:${year.data?.id || '-'}` : null, async () => {
    const [siswa, guru, wali, kelas] = await Promise.all([
      countOf('students', where('archived', '==', false)),
      countOf('staff', where('status', '==', 'aktif')),
      countOf('guardians'),
      year.data ? countOf('classes', where('academicYearId', '==', year.data.id)) : Promise.resolve(0),
    ]);
    return { siswa, guru, wali, kelas };
  }, { ttl: 2 * 60_000 });
}

function StatRow() {
  const c = useCounts();
  const n = (v?: number) => (v === undefined ? '–' : v.toLocaleString('id-ID'));
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard label="Siswa Aktif" value={n(c.data?.siswa)} loading={c.loading} icon={<GraduationCap className="h-4 w-4" />} link={<Link to="/siswa" className="inline-flex items-center gap-1">Lihat data siswa <ArrowRight className="h-3.5 w-3.5" /></Link>} />
      <StatCard label="Guru & Tendik" value={n(c.data?.guru)} loading={c.loading} icon={<Users className="h-4 w-4" />} link={<Link to="/guru" className="inline-flex items-center gap-1">Data guru <ArrowRight className="h-3.5 w-3.5" /></Link>} />
      <StatCard label="Rombongan Belajar" value={n(c.data?.kelas)} loading={c.loading} icon={<Building2 className="h-4 w-4" />} tone="gold" hint="Tahun pelajaran aktif" />
      <StatCard label="Orang Tua / Wali" value={n(c.data?.wali)} loading={c.loading} icon={<HeartHandshake className="h-4 w-4" />} tone="gold" hint="Terdaftar di data induk" />
    </div>
  );
}

/** Siswa per kelas — dihitung dari data, bukan angka contoh. */
function ClassTable() {
  const year = useActiveYear();
  const classes = useClasses(year.data?.id);
  const counts = useSWR(classes.data ? `dash:perkelas:${year.data?.id}` : null, async () => {
    const r = await Promise.all((classes.data || []).map((k) => countOf('students', where('classId', '==', k.id))));
    return Object.fromEntries((classes.data || []).map((k, i) => [k.id, r[i]]));
  }, { ttl: 2 * 60_000 });
  return (
    <Card>
      <CardHeader icon={<Building2 className="h-4 w-4" />} title="Siswa per Rombel" subtitle={year.data ? `Tahun pelajaran ${year.data.nama}` : 'Atur tahun pelajaran aktif lebih dulu'} />
      {classes.loading ? <div className="p-5"><Skeleton className="h-32" /></div> : !classes.data?.length ? (
        <EmptyState icon={<Building2 className="h-7 w-7" />} title="Belum ada rombel" text="Rombongan belajar dibuat Operator di menu Kelas, Mapel & Tahun." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead><tr><Th>Rombel</Th><Th>Wali Kelas</Th><Th className="text-right">Jumlah Siswa</Th></tr></thead>
            <tbody>
              {classes.data.map((k) => (
                <tr key={k.id} className="hover:bg-canvas">
                  <Td className="font-semibold">Kelas {k.nama}</Td>
                  <Td className="text-ink-2">{k.waliKelasNama || <span className="text-ink-muted">Belum ditetapkan</span>}</Td>
                  <Td className="text-right font-semibold">{counts.data ? counts.data[k.id] : <Skeleton className="ml-auto h-4 w-8" />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Activity({ title = 'Aktivitas Terbaru' }: { title?: string }) {
  const a = useSWR('dash:audit', () => getAudit(), { ttl: 60_000 });
  return (
    <Card>
      <CardHeader icon={<History className="h-4 w-4" />} title={title} action={<Link to="/pengaturan/audit" className="text-[13px] font-semibold text-brand-600 hover:underline">Lihat semua</Link>} />
      {a.loading ? <div className="grid gap-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div> : !a.data?.length ? (
        <EmptyState icon={<ScrollText className="h-7 w-7" />} title="Belum ada aktivitas" text="Setiap perubahan data akan tercatat di sini." />
      ) : (
        <ol className="relative grid gap-4 px-5 py-4">
          {a.data.slice(0, 6).map((x) => (
            <li key={x.id} className="relative flex gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-hidden />
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{labelAksi(x.aksi)}</p>
                <p className="caption">{x.actorNama} · {fmtRelatif(x.waktu)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
export function labelAksi(a: string) {
  const m: Record<string, string> = {
    tambah_siswa: 'Menambah data siswa', ubah_siswa: 'Mengubah data siswa', arsip_siswa: 'Mengarsipkan siswa', pulihkan_siswa: 'Memulihkan siswa dari arsip',
    ganti_foto_siswa: 'Mengganti foto siswa', tambah_guru: 'Menambah guru/tendik', ubah_guru: 'Mengubah guru/tendik', tambah_wali: 'Menambah orang tua/wali',
    ubah_wali: 'Mengubah orang tua/wali', buat_relasi_wali: 'Membuat relasi wali–siswa', verifikasi_relasi: 'Memverifikasi relasi wali–siswa', tolak_relasi: 'Menolak relasi wali–siswa',
    buat_akun: 'Membuat akun pengguna', ubah_akun: 'Mengubah akun/peran', nonaktif_akun: 'Menonaktifkan akun', aktif_akun: 'Mengaktifkan akun', reset_sandi: 'Mengatur ulang kata sandi',
    tambah_kelas: 'Menambah rombel', ubah_kelas: 'Mengubah rombel', tambah_mapel: 'Menambah mapel', ubah_mapel: 'Mengubah mapel',
    tambah_tahun_pelajaran: 'Menambah tahun pelajaran', ubah_tahun_pelajaran: 'Mengubah tahun pelajaran', ubah_identitas_madrasah: 'Mengubah identitas madrasah', impor_data: 'Mengimpor data',
  };
  return m[a] || a.replace(/_/g, ' ');
}

function ApprovalCard() {
  return (
    <Card className="mb-5 border-gold-line bg-gold-tint/60" accent="gold">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold text-white"><ClipboardCheck className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="h3">Menunggu Persetujuan Anda</h2>
          <p className="caption">Persetujuan rapor dan pengeluaran kas akan muncul di sini setelah modul Penilaian (Tahap 1.6) dan Keuangan (Tahap 1.7) aktif.</p>
        </div>
        <Badge tone="gold">0 permintaan</Badge>
      </div>
    </Card>
  );
}

function KepalaDash() {
  const { profile } = useAuth();
  return (
    <>
      <Hero eyebrow="Portal Pimpinan Madrasah" title="Dashboard Kepala Madrasah" subtitle={`${salam(profile?.nama || '')}. Pantauan data induk dan aktivitas madrasah.`} />
      <ApprovalCard />
      <StatRow />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><ClassTable /><Activity /></div>
      <UpcomingModules mods={['presensi', 'penilaian', 'keuangan']} />
    </>
  );
}

function SuperDash() {
  const users = useSWR('dash:users', async () => ({ aktif: await countOf('users', where('status', '==', 'aktif')), nonaktif: await countOf('users', where('status', '==', 'nonaktif')) }), { ttl: 2 * 60_000 });
  const year = useActiveYear();
  const checks = [
    { ok: !!year.data, label: 'Tahun pelajaran aktif diatur', to: '/akademik' },
    { ok: !!CONFIG.gasUrl, label: 'Server berkas (Apps Script) tersambung', to: '/pengaturan/identitas' },
    { ok: (users.data?.aktif || 0) > 1, label: 'Akun pengguna selain Super Admin dibuat', to: '/pengaturan/akun' },
  ];
  return (
    <>
      <Hero eyebrow="Administrasi Sistem" title="Dashboard Super Admin" subtitle="Akun, keamanan, dan kesiapan sistem." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Akun Aktif" value={users.data?.aktif ?? '–'} loading={users.loading} icon={<UserCog className="h-4 w-4" />} link={<Link to="/pengaturan/akun">Kelola akun →</Link>} />
        <StatCard label="Akun Nonaktif" value={users.data?.nonaktif ?? '–'} loading={users.loading} icon={<UserCog className="h-4 w-4" />} tone="gold" hint="Riwayat tetap tersimpan" />
        <StatCard label="Versi Aplikasi" value={CONFIG.version} icon={<Sparkles className="h-4 w-4" />} tone="gold" hint="Tahap 1 · fondasi & data induk" />
        <StatCard label="Mode Data" value={CONFIG.useEmulator ? 'Emulator' : 'Produksi'} icon={<ShieldCheck className="h-4 w-4" />} tone={CONFIG.useEmulator ? 'gold' : 'brand'} hint={CONFIG.useEmulator ? 'Data simulasi lokal' : 'Firebase Spark (gratis)'} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader icon={<CircleCheck className="h-4 w-4" />} title="Kesiapan Sistem" subtitle="Lengkapi sebelum data asli dimasukkan" />
          <ul className="divide-y divide-line">
            {checks.map((c) => (
              <li key={c.label}><Link to={c.to} className="flex min-h-[52px] items-center gap-3 px-5 py-2 text-sm hover:bg-canvas">
                <span className={c.ok ? 'text-ok' : 'text-warn'}>{c.ok ? <CircleCheck className="h-5 w-5" /> : <Info className="h-5 w-5" />}</span>
                <span className="flex-1">{c.label}</span><Badge tone={c.ok ? 'ok' : 'warn'}>{c.ok ? 'Siap' : 'Belum'}</Badge>
              </Link></li>
            ))}
          </ul>
          <div className="px-5 pb-5"><Note tone="warn">Gerbang PRD §8.4: impor data siswa asli hanya setelah <b>npm run test:rules</b> lulus seluruhnya.</Note></div>
        </Card>
        <Activity title="Jejak Audit Terbaru" />
      </div>
    </>
  );
}

function OperatorDash() {
  const pending = useSWR('count:relasi', countPendingLinks, { ttl: 60_000 });
  const lengkap = useSWR('dash:kelengkapan', async () => {
    const s = await getStudents(false);
    return { tanpaKelas: s.filter((x) => !x.classId).length, tanpaFoto: s.filter((x) => !x.fotoFileId).length, tanpaNisn: s.filter((x) => !x.nisn).length, total: s.length };
  }, { ttl: 5 * 60_000 });
  return (
    <>
      <Hero eyebrow="Pengelola Data" title="Dashboard Operator" subtitle="Data induk, relasi wali murid, dan impor." right={<div className="flex gap-2"><Link to="/impor"><Button variant="secondary" size="sm" icon={<FileUp className="h-4 w-4" />}>Impor</Button></Link><Link to="/siswa/baru"><Button size="sm">+ Tambah Siswa</Button></Link></div>} />
      <StatRow />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card accent="gold" className="bg-gold-tint/50">
          <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="Relasi Menunggu Verifikasi" subtitle="Wali murid baru melihat data anak setelah diverifikasi" action={<Badge tone="gold">{pending.data ?? '…'}</Badge>} />
          <div className="p-5"><Link to="/relasi"><Button block icon={<ShieldCheck className="h-4 w-4" />}>Verifikasi Relasi</Button></Link></div>
        </Card>
        <Card>
          <CardHeader icon={<ClipboardCheck className="h-4 w-4" />} title="Kelengkapan Data Siswa" subtitle={lengkap.data ? `Dari ${lengkap.data.total} siswa aktif` : 'Menghitung…'} />
          {lengkap.loading ? <div className="p-5"><Skeleton className="h-24" /></div> : (
            <ul className="divide-y divide-line text-sm">
              {[['Belum ditempatkan di kelas', lengkap.data?.tanpaKelas], ['Belum ada foto', lengkap.data?.tanpaFoto], ['NISN belum diisi', lengkap.data?.tanpaNisn]].map(([l, v]) => (
                <li key={l as string} className="flex items-center justify-between px-5 py-3"><span>{l}</span><Badge tone={v ? 'warn' : 'ok'}>{v ? `${v} siswa` : 'Lengkap'}</Badge></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2"><ClassTable /><QuickLinks /></div>
    </>
  );
}

function QuickLinks() {
  const items = [
    { to: '/siswa', icon: GraduationCap, l: 'Data Siswa' }, { to: '/guru', icon: Users, l: 'Guru & Tendik' }, { to: '/wali', icon: HeartHandshake, l: 'Orang Tua / Wali' },
    { to: '/akademik', icon: Building2, l: 'Kelas, Mapel & Tahun' }, { to: '/pengaturan/akun', icon: UserCog, l: 'Akun & Peran' }, { to: '/impor', icon: FileUp, l: 'Impor Excel' },
  ];
  return (
    <Card>
      <CardHeader title="Akses Cepat" />
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        {items.map(({ to, icon: I, l }) => (
          <Link key={to} to={to} className="flex min-h-[76px] flex-col items-start justify-between rounded-lg border border-line p-3 text-sm font-semibold transition-colors hover:border-brand-600 hover:bg-brand-tint/50">
            <I className="h-5 w-5 text-brand" aria-hidden />{l}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function TuDash() {
  return (
    <>
      <Hero eyebrow="Tata Usaha" title="Dashboard Tata Usaha" subtitle="Data induk untuk keperluan administrasi." />
      <StatRow />
      <div className="grid gap-5 xl:grid-cols-2"><ClassTable /><UpcomingModules mods={['pengumuman']} inline /></div>
    </>
  );
}

function GuruDash() {
  const { profile, role, user } = useAuth();
  const year = useActiveYear();
  const classes = useClasses(year.data?.id);
  const mine = useSWR(year.data && role ? `dash:myclasses:${role}:${year.data.id}` : null, () => myClassIds(role!, user!.uid, year.data!.id), { ttl: 5 * 60_000 });
  const myClasses = (classes.data || []).filter((c) => mine.data?.includes(c.id));
  const counts = useSWR(myClasses.length ? `dash:mycount:${myClasses.map((c) => c.id).join(',')}` : null,
    async () => Object.fromEntries(await Promise.all(myClasses.map(async (k) => [k.id, await countOf('students', where('classId', '==', k.id))] as const))), { ttl: 2 * 60_000 });
  const total = counts.data ? Object.values(counts.data).reduce((a, b) => a + b, 0) : undefined;
  return (
    <>
      <Hero eyebrow={role === 'wali_kelas' ? 'Wali Kelas' : 'Selamat Mengajar'} title={salam(profile?.nama || '')} subtitle={role === 'wali_kelas' ? 'Kelas binaan Anda.' : 'Kelas yang Anda ampu tahun ini.'} />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label={role === 'wali_kelas' ? 'Kelas Binaan' : 'Kelas Diampu'} value={mine.loading ? '–' : myClasses.length} />
        <StatCard label="Total Siswa" value={total ?? '–'} loading={!!myClasses.length && counts.loading} tone="gold" />
        <StatCard label="Peran" value={<span className="text-sm sm:text-lg">{ROLES[role!].label}</span>} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card accent="brand">
          <CardHeader icon={<Building2 className="h-4 w-4" />} title={role === 'wali_kelas' ? 'Kelas Binaan' : 'Kelas yang Diampu'} />
          {mine.loading || classes.loading ? <div className="p-5"><Skeleton className="h-20" /></div> : !myClasses.length ? (
            <EmptyState icon={<Building2 className="h-7 w-7" />} title="Belum ada kelas" text={role === 'wali_kelas' ? 'Operator belum menetapkan Anda sebagai wali kelas.' : 'Penugasan mengajar diatur Operator (aktif penuh di Tahap 1.4).'} />
          ) : (
            <ul className="divide-y divide-line">
              {myClasses.map((k) => (
                <li key={k.id}><Link to={`/siswa?kelas=${encodeURIComponent(k.id)}`} className="flex min-h-[56px] items-center gap-3 px-5 py-2 hover:bg-canvas">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-tint font-bold text-brand">{k.nama}</span>
                  <span className="flex-1"><span className="block font-semibold">Kelas {k.nama}</span><span className="caption">{counts.data ? `${counts.data[k.id]} siswa` : 'menghitung…'}</span></span>
                  <ArrowRight className="h-4 w-4 text-ink-muted" aria-hidden />
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <UpcomingModules mods={['presensi', 'penilaian']} inline />
      </div>
    </>
  );
}

function useMyChildren() {
  const { profile } = useAuth();
  return useSWR(profile?.guardianId ? `dash:children:${profile.guardianId}` : null, async () => {
    const s = await getDocs(query(collection(db, 'guardian_links'), where('guardianId', '==', profile!.guardianId), where('status', '==', 'terverifikasi'), limit(10)));
    const links = s.docs.map((d) => d.data() as GuardianLink);
    const kids = await Promise.all(links.map((l) => getStudent(l.studentId).catch(() => null)));
    return kids.filter(Boolean) as Student[];
  }, { ttl: 5 * 60_000 });
}

function ChildCard({ s }: { s: Student }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <Avatar nama={s.nama} size={64} />
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{s.nama}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone="brand">NIS {s.nis}</Badge><Badge tone="ok" icon={<CircleCheck className="h-3 w-3" />}>Terverifikasi</Badge></div>
          <p className="caption mt-1.5">{s.className ? `Kelas ${s.className}` : 'Kelas belum ditetapkan'}</p>
        </div>
      </div>
    </Card>
  );
}

function WaliMuridDash() {
  const { profile } = useAuth();
  const kids = useMyChildren();
  return (
    <>
      <Hero eyebrow="Portal Wali Murid" title={salam(profile?.nama || '')} subtitle="Informasi anak yang terhubung dengan akun Anda." />
      {kids.loading ? <Skeleton className="h-28" /> : !kids.data?.length ? (
        <Card><EmptyState icon={<HeartHandshake className="h-7 w-7" />} title="Belum ada anak yang terverifikasi" text="Operator madrasah sedang memverifikasi hubungan Anda dengan siswa. Setelah diverifikasi, data anak tampil di sini." /></Card>
      ) : <div className="grid gap-4 md:grid-cols-2">{kids.data.map((s) => <ChildCard key={s.id} s={s} />)}</div>}
      <UpcomingModules mods={['portal']} />
    </>
  );
}

function SiswaDash() {
  const { profile } = useAuth();
  const me = useSWR(profile?.studentId ? `dash:siswa:${profile.studentId}` : null, () => getStudent(profile!.studentId!), { ttl: 5 * 60_000 });
  return (
    <>
      <Hero eyebrow="Portal Siswa" title={salam(profile?.nama || '')} subtitle="Profil dan informasi belajarmu." />
      {me.loading ? <Skeleton className="h-28" /> : me.data ? <ChildCard s={me.data} /> : <Note tone="warn">Akun belum terhubung dengan data siswa. Hubungi operator.</Note>}
      <UpcomingModules mods={['portal', 'pengumuman']} />
    </>
  );
}

function GenericDash() {
  const { profile, role } = useAuth();
  const mods = role === 'bendahara' ? ['keuangan'] : ['pengumuman'];
  return (
    <>
      <Hero eyebrow={role ? ROLES[role].label : ''} title={salam(profile?.nama || '')} subtitle={role ? ROLES[role].scope : ''} />
      <UpcomingModules mods={mods} />
    </>
  );
}

const MODS: Record<string, { icon: typeof Wallet; t: string; d: string; tahap: string }> = {
  presensi: { icon: CalendarCheck, t: 'Presensi Harian', d: 'Absensi lewat HP, rekap & koreksi beralasan.', tahap: '1.5' },
  penilaian: { icon: BookOpenCheck, t: 'Penilaian & Rapor', d: 'Input nilai, leger, persetujuan, rapor PDF.', tahap: '1.6' },
  keuangan: { icon: Wallet, t: 'Tagihan & Kas', d: 'Tagihan, verifikasi bayar, buku kas ledger.', tahap: '1.7' },
  portal: { icon: GraduationCap, t: 'Kehadiran, Nilai & Tagihan', d: 'Dipantau langsung dari HP.', tahap: '1.8' },
  pengumuman: { icon: Info, t: 'Pengumuman & Notifikasi', d: 'Informasi madrasah langsung ke akun Anda.', tahap: '1.8' },
};
function UpcomingModules({ mods, inline }: { mods: string[]; inline?: boolean }) {
  return (
    <Card className={inline ? '' : 'mt-5'}>
      <CardHeader icon={<Sparkles className="h-4 w-4" />} title="Modul berikutnya" subtitle="Dibangun bertahap di atas fondasi yang sama" />
      <ul className="divide-y divide-line">
        {mods.map((m) => { const x = MODS[m]; const I = x.icon; return (
          <li key={m} className="flex items-center gap-3 px-5 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-recessed text-ink-2"><I className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{x.t}</span><span className="caption">{x.d}</span></span>
            <Badge>Tahap {x.tahap}</Badge>
          </li>
        ); })}
      </ul>
    </Card>
  );
}
