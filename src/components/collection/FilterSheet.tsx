import { useEffect, useRef } from 'react';
import Icon from '@/components/react/Icon';
import { PRICE_RANGES, SORTS, type FilterState, type PriceRangeId } from '@/lib/collection';

interface Props {
  open: boolean;
  onClose: () => void;
  state: FilterState;
  togglePrice: (id: PriceRangeId) => void;
  update: (patch: Partial<FilterState>) => void;
  clearAll: () => void;
  saleCount: number;
  resultCount: number;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

/**
 * Mobile "Filter & sort" bottom sheet: slides up 200 ms; scrim tap, Esc and a
 * swipe down on the grabber close it; focus is trapped while open and returns
 * to the opener on close. Filters apply live, "Show N results" closes it.
 */
export default function FilterSheet({ open, onClose, state: s, togglePrice, update, clearAll, saleCount, resultCount }: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>('#cp-sheet-title')?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const f = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !sheetRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !sheetRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      returnFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    const el = sheetRef.current;
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    if (!el) return;
    if (dy > 90) {
      onClose();
      return;
    }
    el.style.transition = 'transform 160ms ease-out';
    el.style.transform = '';
  };

  const word = resultCount === 1 ? 'result' : 'results';

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/55" onClick={onClose} aria-hidden="true" />
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-sheet-title"
        className="absolute inset-x-0 bottom-0 flex h-[720px] max-h-[calc(100dvh-24px)] animate-sheet-up flex-col rounded-t-hero bg-surface shadow-[0_-12px_40px_rgba(11,16,32,0.25)]"
      >
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="touch-none">
          <div className="flex justify-center pt-2.5">
            <span aria-hidden="true" className="h-[5px] w-10 rounded-full bg-line-strong" />
          </div>
          <div className="flex items-center justify-between border-b border-line pt-2 pr-2 pb-3 pl-5">
            <h2 id="cp-sheet-title" tabIndex={-1} className="m-0 text-xl font-extrabold outline-none">
              Filter &amp; sort
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full text-ink-900 hover:bg-chip">
              <Icon name="close" size={22} stroke={2.2} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5">
          <fieldset className="m-0 flex flex-col gap-1 border-0 border-b border-line px-0 py-5">
            <legend className="float-left w-full pb-2 text-[15px] font-extrabold">Sort by</legend>
            {SORTS.map((o) => (
              <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                <input
                  type="radio"
                  name="cp-sheet-sort"
                  value={o.id}
                  checked={s.sort === o.id}
                  onChange={() => update({ sort: o.id })}
                  className="m-0 size-5 accent-brand-600"
                />
                {o.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="m-0 flex min-w-0 flex-col border-0 border-b border-line px-0 py-5">
            <legend className="float-left w-full pb-3 text-[15px] font-extrabold">Price</legend>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((r) => {
                const on = s.price.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePrice(r.id)}
                    className={
                      'h-11 rounded-full border-[1.5px] px-4 text-sm font-bold transition-colors duration-150 ' +
                      (on ? 'border-ink-900 bg-ink-900 text-white' : 'border-line-strong bg-surface text-ink-900 hover:border-ink-900')
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="m-0 flex flex-col gap-1 border-0 px-0 pt-5 pb-7">
            <legend className="float-left w-full pb-2 text-[15px] font-extrabold">Availability &amp; deals</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <input type="checkbox" checked={s.stock} onChange={() => update({ stock: !s.stock })} className="m-0 size-5 accent-brand-600" />
              <span className="flex-1">In stock only</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <input type="checkbox" checked={s.sale} onChange={() => update({ sale: !s.sale })} className="m-0 size-5 accent-brand-600" />
              <span className="flex-1">On sale</span>
              <span className="text-[13px] text-ink-500">{saleCount}</span>
            </label>
          </fieldset>
        </div>

        <div className="flex gap-2.5 border-t border-line bg-surface px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={clearAll}
            className="h-13 flex-[0_0_120px] rounded-lg border-[1.5px] border-line-strong bg-surface text-[15px] font-bold text-ink-900 hover:border-ink-900"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-13 flex-1 items-center justify-center rounded-lg bg-brand-600 text-[15px] font-extrabold text-white hover:bg-brand-700"
          >
            Show {resultCount} {word}
          </button>
        </div>
      </section>
    </div>
  );
}
