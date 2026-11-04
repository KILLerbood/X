import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import { initials, hueOf } from '../lib/format';
import { progress, stageTone, isOffRoad } from '../lib/journey';

/** Initials on a stable colour, with a ring that fills as the client moves along the road. */
export function Avatar({ name, stage, size = 44 }: { name: string; stage?: string; size?: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const p = stage === undefined ? 0 : isOffRoad(stage) ? 1 : Math.max(0.06, progress(stage));
  return (
    <span className={'avatar tone-' + stageTone(stage || '')} style={{ ['--s' as string]: size + 'px', ['--h' as string]: hueOf(name) }} aria-hidden="true">
      {initials(name)}
      {stage !== undefined && (
        <svg viewBox="0 0 48 48"><circle className="track" cx="24" cy="24" r={r} /><circle className="arc" cx="24" cy="24" r={r} strokeDasharray={c * p + ' ' + c} /></svg>
      )}
    </span>
  );
}

export function Stage({ stage }: { stage: string }) {
  return <span className={'pill stage tone-' + stageTone(stage)}><span className="dot" />{stage || 'جديد'}</span>;
}

/** Accessible modal: focus moves in, Esc closes, focus goes back where it was. */
export function Modal({ title, onClose, children, footer, wide, className, label }: { title?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; className?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button:not([data-close])');
    (first || el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={'modal' + (wide ? ' modal--wide' : '') + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={label || title} tabIndex={-1}>
        {title && (
          <div className="modal__head">
            <h2>{title}</h2>
            <button className="btn btn--ghost btn--icon btn--sm" data-close onClick={onClose} aria-label="اقفل"><Icon name="x" size={18} /></button>
          </div>
        )}
        {children}
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon = 'inbox', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return <div className="empty"><Icon name={icon} /><b>{title}</b>{children}</div>;
}
export function Sk({ w = '100%', h = 14, r }: { w?: number | string; h?: number; r?: number }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />;
}
export function RowsSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div aria-busy="true" aria-label="بيحمّل" style={{ display: 'grid', gap: 14, padding: 14 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Sk w={44} h={44} r={22} />
          <div style={{ flex: 1, display: 'grid', gap: 8 }}><Sk w={`${50 + ((i * 17) % 40)}%`} /><Sk w="80%" h={11} /></div>
        </div>
      ))}
    </div>
  );
}
export const Spinner = () => <span className="spin" role="status" aria-label="بيحمّل" />;
