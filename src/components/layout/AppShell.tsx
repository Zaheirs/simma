import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarRange, ChevronDown, Download, LayoutGrid, LogOut, Menu, Repeat, UserRound, WifiOff, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { ROLES } from '../../lib/rbac';
import { useActiveYear, useInstallPrompt, useOnline } from '../../lib/hooks';
import { useSWR } from '../../lib/swr';
import { countPendingLinks } from '../../services/data';
import { bottomFor, navFor, type NavItem } from './nav';
import { Avatar, Badge, cx, IconButton } from '../ui';
import { BrandMark } from './BrandMark';

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role } = useAuth();
  const [drawer, setDrawer] = useState(false); // sidebar di tablet
  const [more, setMore] = useState(false);     // lembar "Lainnya" di HP
  const loc = useLocation();
  const online = useOnline();
  useEffect(() => { setDrawer(false); setMore(false); window.scrollTo({ top: 0 }); }, [loc.pathname]);

  const items = navFor(role);
  const showBadge = role === 'operator' || role === 'super_admin';
  const pending = useSWR(showBadge ? 'count:relasi' : null, countPendingLinks, { ttl: 60_000 });
  const badges = { relasi: pending.data || 0 };

  return (
    <div className="min-h-screen lg:pl-[260px]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block"><Sidebar items={items} badges={badges} /></aside>

      {/* Sidebar sebagai laci di tablet */}
      {drawer && (
        <div className="fixed inset-0 z-40 bg-ink/45 animate-fade-in lg:hidden" onClick={() => setDrawer(false)}>
          <aside className="h-full w-[280px] max-w-[85vw]" onClick={(e) => e.stopPropagation()}><Sidebar items={items} badges={badges} onClose={() => setDrawer(false)} /></aside>
        </div>
      )}

      <Header onMenu={() => setDrawer(true)} />
      {!online && (
        <div role="status" className="sticky top-14 z-20 flex items-center justify-center gap-2 bg-[#1E293B] px-4 py-2 text-center text-[13px] font-medium text-white sm:top-16">
          <WifiOff className="h-4 w-4" aria-hidden /> Tidak ada koneksi internet — perubahan belum dapat disimpan.
        </div>
      )}

      <main className="mx-auto w-full max-w-content px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>

      <BottomNav onMore={() => setMore(true)} />
      {more && <MoreSheet items={items} badges={badges} onClose={() => setMore(false)} />}
      <span className="sr-only">{profile?.nama} sebagai {role ? ROLES[role].label : ''}</span>
    </div>
  );
}

function Sidebar({ items, badges, onClose }: { items: NavItem[]; badges: Record<string, number>; onClose?: () => void }) {
  const { school, profile, role, logout } = useAuth();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-brand-900 text-white">
      {/* Motif bintang 8 sangat tipis di area logo (DESIGN.md: hanya dekoratif, tidak di belakang data) */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 opacity-[.06]" aria-hidden><BrandMark className="h-full w-full" /></div>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <BrandMark className="h-9 w-9 shrink-0" filled />
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-tight tracking-wide">SIMMA</p>
          <p className="truncate text-[11px] text-white/60">{school?.namaMadrasah}</p>
        </div>
        {onClose && <IconButton label="Tutup menu" onClick={onClose} className="ml-auto text-white/80 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></IconButton>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu utama">
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[.08em] text-white/45">{g}</p>
            {items.filter((i) => i.group === g).map((i) => <SideLink key={i.to} item={i} badge={i.badgeKey ? badges[i.badgeKey] : 0} />)}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <p className="truncate text-[13px] font-semibold">{profile?.nama}</p>
        <p className="mb-2 text-[11px] text-white/55">{role ? ROLES[role].label : ''}</p>
        <button type="button" onClick={() => logout()} className="flex h-10 w-full items-center gap-2 rounded px-2 text-sm text-white/80 transition-colors hover:bg-bad/25 hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden /> Keluar
        </button>
      </div>
    </div>
  );
}

function SideLink({ item, badge }: { item: NavItem; badge?: number }) {
  const I = item.icon;
  return (
    <NavLink to={item.to} end={item.to === '/'}
      className={({ isActive }) => cx('relative mb-0.5 flex h-10 items-center gap-3 rounded px-3 text-[14px] transition-colors',
        isActive ? 'bg-brand text-white font-semibold before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r before:bg-gold' : 'text-white/70 hover:bg-white/5 hover:text-white')}>
      <I className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.soon ? <span className="rounded-full border border-white/20 px-1.5 text-[10px] text-white/60">Segera</span>
        : badge ? <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-brand-900">{badge}</span> : null}
    </NavLink>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { profile, role, roles } = useAuth();
  const year = useActiveYear();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f);
  }, [open]);

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-14 max-w-content items-center gap-2 px-2 sm:h-16 sm:px-4 lg:px-8">
        <IconButton label="Buka menu" onClick={onMenu} className="max-sm:hidden lg:hidden"><Menu className="h-5 w-5" /></IconButton>
        <div className="flex items-center gap-2 pl-2 lg:hidden"><BrandMark className="h-8 w-8" filled /><span className="font-bold text-brand">SIMMA</span></div>
        {year.data && (
          <span className="ml-1 hidden items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand sm:inline-flex">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden /> TP {year.data.nama} · Semester {year.data.semesterAktif}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Notifikasi" onClick={() => nav('/pengumuman')}><Bell className="h-5 w-5" /></IconButton>
          <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
              className="flex h-11 items-center gap-2 rounded px-1.5 hover:bg-surface-recessed sm:px-2">
              <Avatar nama={profile?.nama || '?'} size={34} />
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-[180px] truncate text-[13px] font-semibold">{profile?.nama}</span>
                <span className="block text-[11px] text-ink-2">Peran: {role ? ROLES[role].label : '-'}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-ink-2 md:block" aria-hidden />
            </button>
            {open && (
              <div role="menu" className="absolute right-0 top-12 z-30 w-64 rounded-lg border border-line-input bg-white py-1 shadow-pop animate-fade-in">
                <div className="border-b border-line px-4 py-2.5"><p className="truncate text-sm font-semibold">{profile?.nama}</p><p className="truncate caption">{profile?.email}</p></div>
                {roles.length > 1 && <MenuBtn icon={<Repeat className="h-4 w-4" />} onClick={() => { setOpen(false); nav('/pilih-peran'); }}>Ganti peran aktif</MenuBtn>}
                <MenuBtn icon={<UserRound className="h-4 w-4" />} onClick={() => { setOpen(false); nav('/profil'); }}>Profil & kata sandi</MenuBtn>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuBtn({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return <button type="button" role="menuitem" onClick={onClick} className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm hover:bg-surface-recessed">{icon}{children}</button>;
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const { role } = useAuth();
  const items = bottomFor(role).slice(0, 4);
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white lg:hidden" aria-label="Navigasi bawah">
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0,1fr))` }}>
        {items.map((i) => {
          const I = i.icon;
          return (
            <NavLink key={i.to} to={i.to} end={i.to === '/'}
              className={({ isActive }) => cx('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-brand' : 'text-ink-2')}>
              {({ isActive }) => (<>
                {isActive && <span className="absolute top-1.5 h-1 w-1 rounded-full bg-gold" aria-hidden />}
                <I className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.75} aria-hidden />
                {i.short}
              </>)}
            </NavLink>
          );
        })}
        <button type="button" onClick={onMore} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink-2">
          <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />Lainnya
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ items, badges, onClose }: { items: NavItem[]; badges: Record<string, number>; onClose: () => void }) {
  const { roles, logout } = useAuth();
  const nav = useNavigate();
  const inst = useInstallPrompt();
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/45 animate-fade-in lg:hidden" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Menu lainnya" className="safe-bottom max-h-[85vh] w-full overflow-y-auto rounded-t-xl bg-white animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-input" aria-hidden />
        <div className="flex items-center justify-between px-5 pb-1 pt-3"><h2 className="h3">Menu & Pengaturan</h2><IconButton label="Tutup" onClick={onClose}><X className="h-5 w-5" /></IconButton></div>
        <div className="grid gap-1 px-3 pb-2">
          {items.filter((i) => i.to !== '/').map((i) => {
            const I = i.icon, b = i.badgeKey ? badges[i.badgeKey] : 0;
            return (
              <NavLink key={i.to} to={i.to} className={({ isActive }) => cx('flex h-12 items-center gap-3 rounded-lg px-3 text-[15px]', isActive ? 'bg-brand-tint font-semibold text-brand' : 'hover:bg-surface-recessed')}>
                <I className="h-5 w-5 text-brand" aria-hidden /><span className="flex-1">{i.label}</span>
                {i.soon ? <Badge>Segera</Badge> : b ? <Badge tone="gold">{b}</Badge> : null}
              </NavLink>
            );
          })}
        </div>
        <div className="grid gap-1 border-t border-line px-3 py-2">
          {roles.length > 1 && <SheetBtn icon={<Repeat className="h-5 w-5 text-brand" />} onClick={() => nav('/pilih-peran')}>Ganti Peran Aktif</SheetBtn>}
          <SheetBtn icon={<UserRound className="h-5 w-5 text-brand" />} onClick={() => nav('/profil')}>Profil & Kata Sandi</SheetBtn>
          {inst.canInstall && <SheetBtn icon={<Download className="h-5 w-5 text-brand" />} onClick={inst.install}>Pasang SIMMA di HP</SheetBtn>}
          <SheetBtn icon={<LogOut className="h-5 w-5 text-bad" />} onClick={() => logout()} danger>Keluar</SheetBtn>
        </div>
      </div>
    </div>
  );
}
function SheetBtn({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={cx('flex h-12 items-center gap-3 rounded-lg px-3 text-left text-[15px]', danger ? 'text-bad hover:bg-bad-bg' : 'hover:bg-surface-recessed')}>{icon}{children}</button>;
}
