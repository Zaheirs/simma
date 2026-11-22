/* Komponen dasar SIMMA mengikuti DESIGN.md "Madrasah Administrative Modern".
 * Aksesibilitas (ui-ux-pro-max prioritas 1–2): label terlihat, target sentuh ≥44px di HP, fokus jelas, ikon selalu berlabel. */
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { CircleAlert, CircleCheck, ChevronLeft, ChevronRight, Info, LoaderCircle, Search, TriangleAlert, X } from 'lucide-react';
import { inisial } from '../../lib/format';

export function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' '); }

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border border-brand-600',
  secondary: 'bg-white text-ink border border-line-input hover:bg-surface-recessed',
  ghost: 'bg-transparent text-brand-600 border border-transparent hover:bg-brand-tint',
  danger: 'bg-bad text-white border border-bad hover:bg-bad-ink',
  gold: 'bg-gold text-white border border-gold hover:bg-gold-600',
};
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode; block?: boolean }
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, type = 'button', ...rest }, ref) {
  const sz = size === 'sm' ? 'h-9 px-3 text-[13px]' : size === 'lg' ? 'h-12 px-5 text-[15px]' : 'h-11 sm:h-10 px-4 text-sm';
  return (
    <button ref={ref} type={type} disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors duration-150 disabled:opacity-45 disabled:cursor-not-allowed select-none whitespace-nowrap', BTN[variant], sz, block && 'w-full', className)}
      {...rest}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label}
      className={cx('inline-grid h-11 w-11 sm:h-10 sm:w-10 place-items-center rounded text-ink-2 hover:bg-surface-recessed hover:text-ink transition-colors', className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Form ---------- */
interface FieldProps { label: string; required?: boolean; hint?: string; error?: string | null; children: (id: string, describedBy?: string) => ReactNode; className?: string }
export function Field({ label, required, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hid = hint || error ? id + '-h' : undefined;
  return (
    <div className={cx('grid gap-1', className)}>
      <label htmlFor={id} className="label text-ink">{label}{required && <span className="text-bad"> *</span>}</label>
      {children(id, hid)}
      {error ? <p id={hid} className="flex items-start gap-1 text-xs text-bad"><CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />{error}</p>
        : hint ? <p id={hid} className="caption">{hint}</p> : null}
    </div>
  );
}

const INPUT = 'w-full rounded border bg-white px-3 text-[15px] sm:text-sm text-ink placeholder:text-ink-muted transition-shadow outline-none focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/15 disabled:bg-surface-recessed disabled:text-ink-muted';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx(INPUT, 'h-11 sm:h-[38px]', invalid ? 'border-bad focus:border-bad focus:ring-bad/15' : 'border-line-input', className)} {...rest} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select({ invalid, className, children, ...rest }, ref) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={cx(INPUT, 'h-11 sm:h-[38px] pr-8', invalid ? 'border-bad' : 'border-line-input', className)} {...rest}>{children}</select>;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cx(INPUT, 'min-h-[96px] py-2 resize-y', invalid ? 'border-bad' : 'border-line-input', className)} {...rest} />;
});

export function SearchInput({ value, onChange, placeholder = 'Cari…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-9" />
    </div>
  );
}

/* ---------- Badge (pill) ---------- */
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand' | 'gold' | 'solid';
const TONE: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-ink', warn: 'bg-warn-bg text-warn-ink', bad: 'bg-bad-bg text-bad-ink', info: 'bg-info-bg text-info-ink',
  neutral: 'bg-[#F1F5F9] text-ink-2', brand: 'bg-brand-tint text-brand', gold: 'bg-gold-tint text-[#8A6A0E]', solid: 'bg-brand text-white',
};
export function Badge({ tone = 'neutral', children, icon, className }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[.02em] whitespace-nowrap', TONE[tone], className)}>{icon}{children}</span>;
}

/* ---------- Card ---------- */
export function Card({ children, className, accent }: { children: ReactNode; className?: string; accent?: 'brand' | 'gold' | 'bad' }) {
  const a = accent === 'gold' ? 'border-l-[3px] border-l-gold' : accent === 'brand' ? 'border-l-[3px] border-l-brand' : accent === 'bad' ? 'border-l-[3px] border-l-bad' : '';
  return <section className={cx('card', a, className)}>{children}</section>;
}
export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-tint text-brand">{icon}</span>}
        <div className="min-w-0"><h2 className="h3">{title}</h2>{subtitle && <p className="caption mt-0.5">{subtitle}</p>}</div>
      </div>
      {action}
    </header>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'brand', link, loading }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'brand' | 'gold' | 'bad'; link?: ReactNode; loading?: boolean }) {
  return (
    <Card accent={tone} className="flex flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {icon && <span className={cx('grid h-9 w-9 place-items-center rounded-full', tone === 'bad' ? 'bg-bad-bg text-bad' : tone === 'gold' ? 'bg-gold-tint text-gold-600' : 'bg-brand-tint text-brand')}>{icon}</span>}
      </div>
      {loading ? <div className="skeleton mt-3 h-8 w-24" /> : <div className={cx('mt-2 text-[28px] font-bold leading-tight', tone === 'bad' ? 'text-bad' : 'text-ink')}>{value}</div>}
      {hint && <div className="caption mt-1">{hint}</div>}
      {link && <div className="mt-auto border-t border-line pt-3 text-[13px] font-semibold text-brand-600">{link}</div>}
    </Card>
  );
}

/* ---------- Note / Alert ---------- */
export function Note({ tone = 'info', children, className }: { tone?: 'info' | 'warn' | 'ok' | 'bad'; children: ReactNode; className?: string }) {
  const I = tone === 'warn' ? TriangleAlert : tone === 'ok' ? CircleCheck : tone === 'bad' ? CircleAlert : Info;
  const c = { info: 'bg-[#EFF6FF] text-info border-[#BFDBFE]', warn: 'bg-gold-tint text-warn-ink border-gold-line', ok: 'bg-brand-tint text-brand border-[#BBE3C8]', bad: 'bg-[#FEF2F2] text-bad border-[#FECACA]' }[tone];
  return <div role={tone === 'bad' ? 'alert' : undefined} className={cx('flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13.5px] leading-relaxed', c, className)}><I className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><div className="min-w-0">{children}</div></div>;
}

/* ---------- Skeleton & Empty ---------- */
export function Skeleton({ className }: { className?: string }) { return <div className={cx('skeleton', className)} aria-hidden />; }
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">{Array.from({ length: cols }).map((__, j) => <Skeleton key={j} className={cx('h-4', j === 1 ? 'w-40' : 'w-20')} />)}</div>
      ))}
    </div>
  );
}
export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="relative mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-tint text-brand">
        <span className="absolute -right-1 -top-1 h-3 w-3 rotate-45 bg-gold" aria-hidden />{icon}
      </div>
      <h3 className="h3">{title}</h3>
      {text && <p className="caption mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ nama, src, size = 40 }: { nama: string; src?: string | null; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-input bg-surface-recessed font-semibold text-ink-2" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : inisial(nama) || '?'}
    </span>
  );
}

/* ---------- Modal (dialog) ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.removeEventListener('keydown', esc); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  const w = size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 animate-fade-in sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-modal animate-slide-up sm:rounded-xl sm:animate-fade-in', w)}>
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="h3">{title}</h2>
          <IconButton label="Tutup" onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="safe-bottom flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, children, confirmLabel = 'Ya, lanjutkan', danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; children: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Batal</Button><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <div className="text-sm leading-relaxed text-ink-2">{children}</div>
    </Modal>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: ReactNode }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div role="tablist" className="scroll-fade -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
      {tabs.map((t) => (
        <button key={t.key} role="tab" type="button" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={cx('relative h-11 shrink-0 px-3 text-sm font-semibold transition-colors', value === t.key ? 'text-brand' : 'text-ink-2 hover:text-ink')}>
          {t.label}
          {value === t.key && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-brand" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ page, total, perPage, onPage }: { page: number; total: number; perPage: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total ? (page - 1) * perPage + 1 : 0, to = Math.min(total, page * perPage);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <span className="caption">Menampilkan {from}–{to} dari {total}</span>
      <nav className="flex items-center gap-1" aria-label="Halaman">
        <IconButton label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onPage(page - 1)} className="disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></IconButton>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-ink-muted">…</span>}
            <button type="button" onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}
              className={cx('h-9 min-w-[36px] rounded-full px-2 text-[13px] font-semibold', n === page ? 'bg-brand-600 text-white' : 'text-ink-2 hover:bg-surface-recessed')}>{n}</button>
          </span>
        ))}
        <IconButton label="Halaman berikutnya" disabled={page >= pages} onClick={() => onPage(page + 1)} className="disabled:opacity-40"><ChevronRight className="h-4 w-4" /></IconButton>
      </nav>
    </div>
  );
}

/* ---------- Table helpers ---------- */
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={cx('whitespace-nowrap border-y border-line bg-surface-recessed px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[.04em] text-ink-2', className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx('border-b border-line px-4 py-2.5 text-sm align-middle', className)}>{children}</td>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-2" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-brand" aria-hidden />{label}</div>;
}
