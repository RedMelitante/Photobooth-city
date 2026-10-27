import { useState } from 'react';
import type { Order } from '@/lib/account';
import { addLine } from '@/lib/cart';
import { formatMoney } from '@/lib/money';
import { PAGES, productUrl } from '@/lib/routes';
import type { CartLine } from '@/lib/types';
import { btnSmDark, btnSmOutline } from './ui';

const STATUS_STYLE: Record<Order['status'], string> = {
  processing: 'bg-flash-100 text-[#7A5A00]',
  shipped: 'bg-brand-50 text-brand-700',
  delivered: 'bg-success-50 text-success-700',
};

const STEPS = ['Confirmed', 'Shipped', 'Delivered'];

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

interface Props {
  orders: Order[];
  /** catalog cart lines by variant id, for "Buy again" */
  reorder: Record<string, Omit<CartLine, 'quantity'>>;
}

export default function AccountOrders({ orders, reorder }: Props) {
  const [open, setOpen] = useState(0);
  const [added, setAdded] = useState<string | null>(null);

  const buyAgain = (o: Order) => {
    const lines = o.lines.map((l) => ({ line: reorder[l.variantId], qty: l.quantity })).filter((x) => !!x.line);
    lines.forEach((x, i) => addLine(x.line, x.qty, i === lines.length - 1));
    setAdded(o.id);
    setTimeout(() => setAdded(null), 1800);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="mb-1 text-[22px] font-extrabold">Orders</h2>
      {orders.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-panel bg-canvas p-6">
          <strong className="text-lg">No orders yet</strong>
          <a href="/" className={btnSmDark}>
            Start shopping
          </a>
        </div>
      )}
      {orders.map((o, i) => {
        const isOpen = open === i;
        const panelId = `order-${o.id}`;
        return (
          <article key={o.id} className="overflow-hidden rounded-[18px] border border-line">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 border-0 bg-surface px-5 py-[18px] text-left text-ink-900 transition-colors hover:bg-canvas/60"
            >
              <span className="flex min-w-[120px] flex-col gap-0.5">
                <strong className="text-base">Order {o.displayId}</strong>
                <span className="text-[13px] text-ink-500">{dateFmt.format(new Date(o.createdAt))}</span>
              </span>
              <span className={'flex h-[30px] items-center gap-2 rounded-full px-3 text-[13px] font-extrabold ' + STATUS_STYLE[o.status]}>
                <span className="size-2 rounded-full bg-current" />
                {o.statusLabel}
              </span>
              <span className="text-sm text-ink-700">{o.itemCount} {o.itemCount === 1 ? "item" : "items"}</span>
              <span className="ml-auto flex items-center gap-3">
                <strong className="text-base">{formatMoney(o.total)}</strong>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={'transition-transform duration-200 ' + (isOpen ? 'rotate-180' : '')}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div id={panelId} className="flex flex-col gap-3.5 border-t border-line px-5 pt-1 pb-5">
                <ol aria-label="Shipment progress" className="mt-3.5 grid list-none grid-cols-3 gap-2 p-0">
                  {STEPS.map((label, j) => (
                    <li key={label} className="flex flex-col gap-1.5" aria-current={j === o.step - 1 ? 'step' : undefined}>
                      <span className={'h-1.5 rounded-full ' + (j < o.step ? 'bg-success-700' : 'bg-line')} />
                      <span className="text-[13px] font-bold">
                        {label}
                        <span className="sr-only">{j < o.step ? ' — done' : ' — pending'}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {o.lines.map((l) => (
                    <li key={l.variantId || l.handle} className="flex items-center gap-3">
                      <a href={productUrl(l.handle)} tabIndex={-1} aria-hidden="true" className="size-12 flex-none overflow-hidden rounded-md bg-canvas">
                        {l.image && <img src={l.image} alt="" loading="lazy" className="product-shot block size-full" />}
                      </a>
                      <a href={productUrl(l.handle)} className="flex-1 text-sm leading-[19px] font-bold text-ink-900 no-underline hover:text-ink-900 hover:underline">
                        {l.title}
                        {l.variantTitle && ` — ${l.variantTitle}`}
                        {l.quantity > 1 && ` × ${l.quantity}`}
                      </a>
                      <span className="text-sm font-bold">{formatMoney(l.unitPrice * l.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2.5">
                  {o.status === 'delivered' ? (
                    <a href={PAGES.refund} className={btnSmDark}>
                      Start a return
                    </a>
                  ) : (
                    // No carrier link until the order ships; the expert line can help meanwhile.
                    <a href={o.trackingUrl ?? PAGES.contact} className={btnSmDark} {...(o.trackingUrl ? { target: '_blank', rel: 'noopener' } : {})}>
                      Track shipment
                    </a>
                  )}
                  <a href={PAGES.contact} className={btnSmOutline}>
                    View invoice
                  </a>
                  <button type="button" onClick={() => buyAgain(o)} className={btnSmOutline + (added === o.id ? ' border-success-700! text-success-700' : '')}>
                    {added === o.id ? 'Added to cart' : 'Buy again'}
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
