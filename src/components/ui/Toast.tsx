import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cx } from './index';

type Kind = 'ok' | 'bad' | 'info' | 'warn';
interface T { id: number; kind: Kind; msg: string }
const Ctx = createContext<(kind: Kind, msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: Kind, msg: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { id, kind, msg }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'bad' ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 safe-top sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end" aria-live="polite">
        {items.map((t) => {
          const I = t.kind === 'ok' ? CircleCheck : t.kind === 'bad' ? CircleAlert : t.kind === 'warn' ? TriangleAlert : Info;
          const c = { ok: 'border-l-ok', bad: 'border-l-bad', info: 'border-l-info', warn: 'border-l-warn' }[t.kind];
          const ic = { ok: 'text-ok', bad: 'text-bad', info: 'text-info', warn: 'text-warn' }[t.kind];
          return (
            <div key={t.id} role={t.kind === 'bad' ? 'alert' : 'status'} className={cx('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line border-l-4 bg-white px-4 py-3 text-sm shadow-pop animate-fade-in', c)}>
              <I className={cx('mt-0.5 h-4 w-4 shrink-0', ic)} aria-hidden />
              <span className="min-w-0 flex-1">{t.msg}</span>
              <button type="button" aria-label="Tutup notifikasi" className="text-ink-muted hover:text-ink" onClick={() => setItems((x) => x.filter((y) => y.id !== t.id))}><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const push = useContext(Ctx);
  return { ok: (m: string) => push('ok', m), bad: (m: string) => push('bad', m), info: (m: string) => push('info', m), warn: (m: string) => push('warn', m) };
}
