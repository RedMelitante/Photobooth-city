import { useState } from 'react';
import { useStore } from '@nanostores/react';
import Icon from './Icon';
import { $cart, $cartNotices, $promo, $subtotal, addLine, closeCart, removeLine, saveCode, setQuantity } from '@/lib/cart';
import { lineCap } from '@/lib/product';
import { PROMO, isPromoCode } from '@/lib/commerce';
import { formatMoney } from '@/lib/money';
import type { CartLine } from '@/lib/types';

export interface Upsell {
  /** product handle in the cart that triggers this suggestion */
  when: string;
  line: Omit<CartLine, 'quantity'>;
  label: string;
}

interface Props {
  upsells?: Upsell[];
  /** render as a dialog panel (drawer) or inline (mobile /cart) */
  mode?: 'drawer' | 'page';
  titleId?: string;
}

export function Stepper({ line, size = 'md' }: { line: CartLine; size?: 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-11' : 'h-10';
  return (
    <div role="group" aria-label={`Quantity for ${line.title}`} className={`flex items-center rounded-md border-[1.5px] border-line-strong ${h}`}>
      <button type="button" onClick={() => setQuantity(line.id, line.quantity - 1)} aria-label="Decrease quantity" className="flex h-full w-10 items-center justify-center text-ink-900">
        <Icon name="minus" size={16} stroke={2.4} />
      </button>
      <span className="w-6 text-center text-[15px] font-extrabold" aria-live="polite">{line.quantity}</span>
      <button type="button" onClick={() => setQuantity(line.id, line.quantity + 1)} disabled={line.quantity >= lineCap(line.maxQuantity)} aria-label="Increase quantity" className="flex h-full w-10 items-center justify-center text-ink-900 disabled:cursor-not-allowed disabled:text-ink-300">
        <Icon name="plus" size={16} stroke={2.4} />
      </button>
    </div>
  );
}

export function PromoForm({ id = 'cart-code' }: { id?: string }) {
  const promo = useStore($promo);
  const sub = useStore($subtotal);
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
    <form onSubmit={apply} className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold">Discount code</label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          placeholder="Enter code"
          autoComplete="off"
          aria-invalid={error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="h-11 min-w-0 flex-1 rounded-md border-[1.5px] border-line-strong px-3.5 text-[15px] text-ink-900 uppercase placeholder:normal-case"
        />
        <button type="submit" className="h-11 rounded-md bg-ink-900 px-[18px] text-sm font-extrabold text-white hover:bg-ink-950">Apply</button>
      </div>
      {error && <span id={`${id}-err`} role="alert" className="text-[13px] font-semibold text-sale-600">That code isn’t valid.</span>}
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
        <span className="mt-1 flex h-8 items-center gap-2 self-start rounded-full border-[1.5px] border-dashed border-ink-950 bg-surface pr-1.5 pl-3 text-[13px] font-extrabold">
          {PROMO.code} saved · applies at $3,500+
          <button type="button" onClick={() => saveCode(null)} aria-label="Remove discount code" className="flex size-6 items-center justify-center rounded-full bg-ink-950/8 text-ink-900">
            <Icon name="close" size={12} stroke={2.6} />
          </button>
        </span>
      )}
      {sub > 0 && sub < PROMO.minSubtotal && (
        <div role="status" className="mt-2 flex flex-col gap-2 rounded-lg bg-flash-100 px-3.5 py-3 text-[13px] leading-[18px] text-ink-950">
          <span>
            Add <strong>{formatMoney(promo.needed)}</strong> more to unlock <strong>{PROMO.percent}% off</strong> with code{' '}
            <strong className="font-mono">{PROMO.code}</strong>. It applies to orders of $3,500 or more.
          </span>
          <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-ink-950/12">
            <span className="block h-full rounded-full bg-ink-950 transition-[width] duration-200" style={{ width: `${promo.progress}%` }} />
          </span>
        </div>
      )}
    </form>
  );
}

export function LineThumb({ line, size = 84 }: { line: CartLine; size?: number }) {
  return (
    <span className="flex flex-none items-center justify-center overflow-hidden rounded-lg bg-canvas" style={{ width: size, height: size }}>
      {line.image ? <img src={line.image} alt="" className="product-shot size-full p-1" loading="lazy" /> : <Icon name="bag" size={28} className="text-ink-300" />}
    </span>
  );
}

export default function CartPanel({ upsells = [], mode = 'drawer', titleId = 'cart-title' }: Props) {
  const cart = useStore($cart);
  const notices = useStore($cartNotices);
  const sub = useStore($subtotal);
  const promo = useStore($promo);
  const count = cart.lines.reduce((a, l) => a + l.quantity, 0);
  const total = sub - promo.discount;
  const handles = new Set(cart.lines.map((l) => l.handle));
  const upsell = upsells.find((u) => handles.has(u.when) && !cart.lines.some((l) => l.id === u.line.id));

  return (
    <section className="flex min-h-full w-full flex-col bg-surface text-ink-900">
      <div className="flex items-center justify-between border-b border-line py-4 pr-3 pl-6">
        <h2 id={titleId} tabIndex={-1} className="font-display text-2xl font-bold tracking-[-0.02em] outline-none">
          Your cart <span className="font-sans text-[15px] font-bold text-ink-500">({count})</span>
        </h2>
        {mode === 'drawer' ? (
          <button type="button" onClick={closeCart} aria-label="Close cart" className="flex size-11 items-center justify-center rounded-full bg-chip text-ink-900">
            <Icon name="close" size={20} stroke={2.4} />
          </button>
        ) : (
          <a href="/" aria-label="Continue shopping" className="flex size-11 items-center justify-center rounded-full bg-chip text-ink-900">
            <Icon name="close" size={20} stroke={2.4} />
          </a>
        )}
      </div>

      <p className="flex items-center gap-2.5 bg-brand-50 px-6 py-3 text-[13px] leading-[18px] font-semibold text-brand-700">
        <Icon name="globe" size={18} />
        We ship across the US. Shipping is calculated at checkout.
      </p>

      {cart.lines.length > 0 ? (
        <ul className="flex flex-col px-6 py-2">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex gap-3.5 border-b border-line py-4">
              <LineThumb line={l} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex justify-between gap-3">
                  <a href={`/products/${l.handle}`} className="text-[15px] leading-5 font-bold text-ink-900 no-underline hover:underline">{l.title}</a>
                  <span className="flex-none text-[15px] font-extrabold">{formatMoney(l.unitPrice * l.quantity)}</span>
                </div>
                {l.variantTitle && <span className="text-[13px] leading-[18px] text-ink-500">{l.variantTitle}</span>}
                <span className="text-[13px] text-ink-500">{formatMoney(l.unitPrice)} each</span>
                {l.leadTime && <span className="text-[13px] font-semibold text-success-700">{l.leadTime}</span>}
                {notices[l.id] && <span role="status" className="text-[13px] font-bold text-sale-600">{notices[l.id]}</span>}
                <div className="mt-1.5 flex items-center justify-between">
                  <Stepper line={l} />
                  <button type="button" onClick={() => removeLine(l.id)} className="h-10 px-1 text-[13px] font-semibold text-ink-700 underline">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3.5 px-6 py-12 text-center">
          <span className="text-lg font-extrabold">Your cart is empty</span>
          <a href="/collections/ipad-booths" className="flex h-12 items-center rounded-lg bg-brand-600 px-[22px] font-extrabold text-white no-underline hover:bg-brand-700 hover:text-white">Shop photo booths</a>
        </div>
      )}

      {upsell && (
        <div className="mx-6 mt-2 flex items-center gap-3 rounded-[14px] bg-canvas p-3.5">
          <span className="flex size-[52px] flex-none items-center justify-center overflow-hidden rounded-md bg-surface">
            <img src={upsell.line.image} alt="" className="product-shot size-full" loading="lazy" />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs font-bold text-ink-500">{upsell.label}</span>
            <span className="text-sm leading-[18px] font-bold">{upsell.line.title}</span>
            <span className="text-sm">
              <strong className={upsell.line.compareAtPrice ? 'text-sale-600' : ''}>{formatMoney(upsell.line.unitPrice)}</strong>{' '}
              {upsell.line.compareAtPrice && <s className="text-ink-500">{formatMoney(upsell.line.compareAtPrice)}</s>}
            </span>
          </span>
          <button type="button" onClick={() => addLine(upsell.line, 1, false)} className="h-10 flex-none rounded-md border-[1.5px] border-ink-900 bg-surface px-3.5 text-[13px] font-extrabold text-ink-900">Add</button>
        </div>
      )}

      {cart.lines.length > 0 && (
        <div className="mt-auto flex flex-col gap-3.5 border-t border-line bg-surface px-6 pt-5 pb-6">
          <PromoForm id={`${mode}-code`} />
          <dl className="flex flex-col gap-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-700">Subtotal</dt><dd className="font-bold">{formatMoney(sub)}</dd></div>
            {promo.applied && (
              <div className="flex justify-between text-success-700"><dt>Discount ({PROMO.percent}%)</dt><dd className="font-bold">−{formatMoney(promo.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-ink-700">Shipping</dt><dd className="text-ink-700">Calculated at checkout</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="text-base font-extrabold">Estimated total</dt>
              <dd className="text-[22px] font-extrabold tracking-[-0.02em]">{formatMoney(total)}</dd>
            </div>
          </dl>
          <a href="/checkout" className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-brand-600 text-base font-extrabold text-white no-underline hover:bg-brand-700 hover:text-white">
            <Icon name="lock" size={18} stroke={2.2} />
            Checkout · {formatMoney(total)}
          </a>
          <div className="flex items-center justify-between gap-3">
            {mode === 'drawer' ? <a href="/cart" className="text-sm font-bold text-ink-900">View full cart</a> : <a href="/" className="text-sm font-bold text-ink-900">Continue shopping</a>}
            <span className="text-xs text-ink-500">Taxes calculated at checkout</span>
          </div>
        </div>
      )}
    </section>
  );
}
