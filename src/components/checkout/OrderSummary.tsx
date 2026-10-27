import { useState } from 'react';
import Icon from '@/components/react/Icon';
import { saveCode } from '@/lib/cart';
import { PROMO, isPromoCode, type PromoState } from '@/lib/commerce';
import { formatMoney } from '@/lib/money';
import type { CartLine } from '@/lib/types';

export interface SummaryData {
  lines: CartLine[];
  /** cents */
  subtotal: number;
  discount: number;
  total: number;
  shipping: string;
  /** small print under the shipping value (UPS live rate) */
  shippingNote?: string;
  tax: string;
  promo: PromoState;
  /** false on the confirmation (snapshot, no promo form) */
  editable: boolean;
}

const count = (lines: CartLine[]) => lines.reduce((a, l) => a + l.quantity, 0);

/** Compact discount form from the checkout design; same rules as the cart's PromoForm. */
function SummaryPromo({ id, promo, subtotal }: { id: string; promo: PromoState; subtotal: number }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPromoCode(code)) {
      saveCode(PROMO.code);
      setCode('');
      setError(false);
    } else setError(true);
  };
  return (
    <div className="flex flex-col gap-2.5">
      <form onSubmit={apply} className="flex flex-col gap-1.5 pt-1">
        <div className="flex gap-2">
          <label htmlFor={id} className="sr-only">Discount code</label>
          <input
            id={id}
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder="Discount code"
            autoComplete="off"
            aria-invalid={error}
            aria-describedby={error ? `${id}-err` : undefined}
            className="box-border h-12 min-w-0 flex-1 rounded-md border-[1.5px] border-line-strong bg-surface px-3.5 text-[15px] text-ink-900 uppercase placeholder:normal-case placeholder:text-ink-500"
          />
          <button
            type="submit"
            className={`h-12 rounded-md px-[18px] text-sm font-extrabold ${code.trim() ? 'bg-ink-900 text-white hover:bg-ink-950' : 'bg-line-strong text-ink-900'}`}
          >
            Apply
          </button>
        </div>
        {error && <span id={`${id}-err`} role="alert" className="text-[13px] font-semibold text-sale-600">That code isn’t valid.</span>}
      </form>
      {promo.applied && (
        <span className="flex h-8 items-center gap-2 self-start rounded-full bg-flash-100 pr-1.5 pl-3 text-[13px] font-extrabold">
          <Icon name="tag" size={14} stroke={2.4} />
          {PROMO.code} · {PROMO.percent}% off
          <button type="button" onClick={() => saveCode(null)} aria-label="Remove discount" className="flex size-6 items-center justify-center rounded-full bg-ink-950/8 text-ink-900">
            <Icon name="close" size={12} stroke={3} />
          </button>
        </span>
      )}
      {promo.pending && (
        <span className="flex h-8 items-center gap-2 self-start rounded-full border-[1.5px] border-dashed border-ink-950 bg-surface pr-1.5 pl-3 text-[13px] font-extrabold">
          {PROMO.code} saved · applies at $3,500+
          <button type="button" onClick={() => saveCode(null)} aria-label="Remove discount code" className="flex size-6 items-center justify-center rounded-full bg-ink-950/8 text-ink-900">
            <Icon name="close" size={12} stroke={2.6} />
          </button>
        </span>
      )}
      {subtotal > 0 && subtotal < PROMO.minSubtotal && (
        <span role="status" className="block self-start rounded-lg bg-flash-100 px-3 py-2 text-[13px] leading-[18px] font-semibold text-ink-950">
          Add <strong>{formatMoney(promo.needed)}</strong> more to unlock {PROMO.percent}% off with <strong className="font-mono">{PROMO.code}</strong> (orders $3,500+)
        </span>
      )}
    </div>
  );
}

function Thumb({ line, size }: { line: CartLine; size: 56 | 64 }) {
  return (
    <span
      className={`relative flex flex-none items-center justify-center border border-line bg-surface ${size === 64 ? 'size-16 rounded-lg' : 'size-14 rounded-[10px]'}`}
    >
      {line.image ? (
        <img src={line.image} alt="" className={`product-shot ${size === 64 ? 'size-[54px]' : 'size-12'}`} loading="lazy" />
      ) : (
        <Icon name="bag" size={24} className="text-ink-300" />
      )}
      <span
        aria-label={`Quantity ${line.quantity}`}
        className="absolute -top-2 -right-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-ink-500 px-1.5 text-xs font-extrabold text-white"
      >
        {line.quantity}
      </span>
    </span>
  );
}

function Lines({ lines, size }: { lines: CartLine[]; size: 56 | 64 }) {
  return (
    <ul className={`m-0 flex list-none flex-col p-0 ${size === 64 ? 'gap-4' : 'gap-3.5'}`}>
      {lines.map((l) => (
        <li key={l.id} className={`flex items-center ${size === 64 ? 'gap-3.5' : 'gap-3'}`}>
          <Thumb line={l} size={size} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm leading-[19px] font-bold">{l.title}</span>
            {l.variantTitle && <span className="text-xs text-ink-500">{l.variantTitle}</span>}
          </span>
          <span className="text-sm font-bold">{formatMoney(l.unitPrice * l.quantity)}</span>
        </li>
      ))}
    </ul>
  );
}

function Rows({ d, compact }: { d: SummaryData; compact?: boolean }) {
  const n = count(d.lines);
  return (
    <>
      <div className="flex justify-between gap-3">
        <dt className="text-ink-700">{compact ? 'Subtotal' : `Subtotal · ${n} ${n === 1 ? 'item' : 'items'}`}</dt>
        <dd className="m-0 font-bold">{formatMoney(d.subtotal)}</dd>
      </div>
      {d.discount > 0 && (
        <div className="flex justify-between gap-3 text-success-700">
          <dt>Discount ({PROMO.percent}%)</dt>
          <dd className="m-0 font-bold">−{formatMoney(d.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <dt className="text-ink-700">Shipping</dt>
        <dd className="m-0 flex flex-col items-end text-right text-ink-700">
          {d.shipping}
          {d.shippingNote && <span className="text-xs text-ink-500">{d.shippingNote}</span>}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-ink-700">{compact ? 'Tax' : 'Estimated taxes'}</dt>
        <dd className="m-0 text-ink-700">{d.tax}</dd>
      </div>
    </>
  );
}

/** Desktop: right-hand column, sticky. */
export function SummaryAside({ d }: { d: SummaryData }) {
  return (
    <aside aria-labelledby="os-title" className="hidden border-l border-line bg-canvas pt-10 pr-10 pb-20 pl-12 lg:block lg:w-[420px] lg:flex-none">
      <div className="sticky top-6 flex max-w-[440px] flex-col gap-5">
        <h2 id="os-title" className="m-0 text-lg font-extrabold">Order summary</h2>
        <Lines lines={d.lines} size={64} />
        {d.editable && <SummaryPromo id="sum-code" promo={d.promo} subtotal={d.subtotal} />}
        <dl className="m-0 flex flex-col gap-2.5 border-t border-line-strong pt-4 text-sm">
          <Rows d={d} />
          <div className="flex items-baseline justify-between border-t border-line-strong pt-3.5">
            <dt className="text-[17px] font-extrabold">Total</dt>
            <dd className="m-0 flex items-baseline gap-2">
              <span className="text-xs text-ink-500">USD</span>
              <span className="text-[26px] font-extrabold tracking-[-0.02em]">{formatMoney(d.total)}</span>
            </dd>
          </div>
        </dl>
        <p className="m-0 flex items-center gap-2 text-[13px] text-ink-700">
          <Icon name="return" size={16} className="text-brand-600" />
          Easy returns within 7 days
        </p>
      </div>
    </aside>
  );
}

/** Mobile: collapsible bar under the header; the total stays visible. */
export function SummaryBar({ d }: { d: SummaryData }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Order summary" className="border-b border-line bg-canvas lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="m-summary"
        className="flex h-[60px] w-full items-center justify-between border-0 bg-transparent px-4"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-brand-600">
          <Icon name="bag" size={18} />
          {open ? 'Hide order summary' : 'Show order summary'}
          <Icon name="chevron-down" size={14} stroke={2.8} className={open ? 'rotate-180' : ''} />
        </span>
        <span className="text-lg font-extrabold text-ink-900">{formatMoney(d.total)}</span>
      </button>
      {open && (
        <div id="m-summary" className="flex flex-col gap-3.5 px-4 pt-1 pb-5">
          <Lines lines={d.lines} size={56} />
          {d.editable && <SummaryPromo id="m-sum-code" promo={d.promo} subtotal={d.subtotal} />}
          <dl className="m-0 flex flex-col gap-2 border-t border-line-strong pt-3 text-sm">
            <Rows d={d} compact />
            <div className="flex items-baseline justify-between border-t border-line-strong pt-2.5">
              <dt className="font-extrabold">Total</dt>
              <dd className="m-0 text-lg font-extrabold">{formatMoney(d.total)}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
