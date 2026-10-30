import { useStore } from '@nanostores/react';
import CartPanel, { PromoForm, type Upsell } from '@/components/react/CartPanel';
import Icon from '@/components/react/Icon';
import { $cart, $cartNotices, $promo, $subtotal, removeLine, setQuantity } from '@/lib/cart';
import { lineCap } from '@/lib/product';
import { PROMO, STORE } from '@/lib/commerce';
import { formatMoney } from '@/lib/money';
import { PAGES, collectionUrl, productUrl } from '@/lib/routes';
import { useHydrated } from '@/lib/useHydrated';
import type { CartLine } from '@/lib/types';

// Only methods checkout accepts today (cards through Stripe).
const PAYMENTS = ['Visa', 'Mastercard', 'Amex', 'Discover'];
const COLS = 'grid grid-cols-[minmax(0,1fr)_140px_160px_120px] gap-4';
const SHOP = collectionUrl('ipad-booths');

function QtyStepper({ line }: { line: CartLine }) {
  return (
    <div role="group" aria-label={`Quantity for ${line.title}`} className="flex h-11 items-center justify-self-start rounded-lg border-[1.5px] border-line-strong">
      <button type="button" onClick={() => setQuantity(line.id, line.quantity - 1)} aria-label="Decrease quantity" className="flex h-full w-11 items-center justify-center text-ink-900">
        <Icon name="minus" size={16} stroke={2.4} />
      </button>
      <span className="w-7 text-center font-extrabold" aria-live="polite">{line.quantity}</span>
      <button type="button" onClick={() => setQuantity(line.id, line.quantity + 1)} disabled={line.quantity >= lineCap(line.maxQuantity)} aria-label="Increase quantity" className="flex h-full w-11 items-center justify-center text-ink-900 disabled:cursor-not-allowed disabled:text-ink-300">
        <Icon name="plus" size={16} stroke={2.4} />
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4 px-4 py-8 lg:px-0 lg:py-0">
      <span className="sr-only">Loading your cart…</span>
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="size-[84px] animate-pulse rounded-lg bg-chip lg:size-[104px]" />
          <div className="flex flex-1 flex-col gap-2 pt-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-chip" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-chip" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Desktop({ ready }: { ready: boolean }) {
  const cart = useStore($cart);
  const notices = useStore($cartNotices);
  const sub = useStore($subtotal);
  const promo = useStore($promo);
  const count = cart.lines.reduce((a, l) => a + l.quantity, 0);
  const total = sub - promo.discount;

  return (
    <>
      <div className="mb-8 flex items-baseline gap-4">
        <h1 className="m-0 font-display text-[48px] leading-none font-extrabold tracking-[-0.035em]">Your cart</h1>
        {ready && (
          <span className="text-base font-bold text-ink-500">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {!ready ? (
        <Skeleton />
      ) : cart.lines.length === 0 ? (
        <section aria-label="Empty cart" className="flex flex-col items-center gap-4 rounded-hero bg-canvas px-6 pt-16 pb-24 text-center">
          <h2 className="m-0 font-display text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">Your cart is empty</h2>
          <a href={SHOP} className="flex h-14 items-center rounded-lg bg-brand-600 px-7 font-extrabold text-white no-underline hover:bg-brand-700 hover:text-white">
            Continue shopping
          </a>
          <p className="m-0 mt-2 text-base leading-6 text-ink-700">
            <strong className="text-ink-900">Have an account?</strong>
            <br />
            <a href={PAGES.login} className="font-bold">Log in</a> to check out faster.
          </p>
        </section>
      ) : (
        <div className="flex flex-wrap items-start gap-12">
          <section aria-label="Cart items" className="min-w-0 flex-[999_1_640px]">
            <div className={`${COLS} border-b border-line pb-3 text-xs font-extrabold tracking-[0.08em] text-ink-500 uppercase`} aria-hidden="true">
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span className="text-right">Total</span>
            </div>
            <ul className="m-0 list-none p-0">
              {cart.lines.map((l) => (
                <li key={l.id} className={`${COLS} items-center border-b border-line py-6`}>
                  <div className="flex min-w-0 items-center gap-[18px]">
                    <span className="flex size-[104px] flex-none items-center justify-center overflow-hidden rounded-[14px] bg-canvas">
                      {l.image ? <img src={l.image} alt="" className="product-shot box-border size-full p-1.5" loading="lazy" /> : <Icon name="bag" size={32} className="text-ink-300" />}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <a href={productUrl(l.handle)} className="text-base leading-[22px] font-extrabold text-ink-900 no-underline hover:text-ink-900 hover:underline">
                        {l.title}
                      </a>
                      {l.variantTitle && <span className="text-sm text-ink-500">{l.variantTitle}</span>}
                      {l.leadTime && <span className="text-[13px] font-bold text-success-700">{l.leadTime}</span>}
                      {notices[l.id] && <span role="status" className="text-[13px] font-bold text-sale-600">{notices[l.id]}</span>}
                      <button type="button" onClick={() => removeLine(l.id)} className="self-start border-0 bg-transparent px-0 py-1.5 text-[13px] font-semibold text-ink-700 underline">
                        Remove<span className="sr-only"> {l.title}</span>
                      </button>
                    </div>
                  </div>
                  <span className="text-[15px] text-ink-700">
                    <span className="sr-only">Price: </span>
                    {formatMoney(l.unitPrice)}
                  </span>
                  <QtyStepper line={l} />
                  <span className="text-right text-base font-extrabold">
                    <span className="sr-only">Total: </span>
                    {formatMoney(l.unitPrice * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-between gap-4 py-6">
              <a href={SHOP} className="text-[15px] font-bold">← Continue shopping</a>
              <span className="flex items-center gap-2.5 text-sm font-semibold text-brand-700">
                <Icon name="globe" size={18} />
                We ship across the US — shipping calculated at checkout
              </span>
            </div>
          </section>

          <aside aria-labelledby="sum-title" className="sticky top-6 flex max-w-[420px] flex-[1_1_360px] flex-col gap-[18px] rounded-panel bg-canvas p-7">
            <h2 id="sum-title" className="m-0 text-xl font-extrabold">Order summary</h2>
            <div className="[&_button[type=submit]]:h-12 [&_input]:h-12 [&_input]:bg-surface">
              <PromoForm id="cp-code" />
            </div>
            <dl className="m-0 flex flex-col gap-2.5 text-[15px]">
              <div className="flex justify-between"><dt className="text-ink-700">Subtotal</dt><dd className="m-0 font-bold">{formatMoney(sub)}</dd></div>
              {promo.applied && (
                <div className="flex justify-between text-success-700"><dt>Discount ({PROMO.percent}%)</dt><dd className="m-0 font-bold">−{formatMoney(promo.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-ink-700">Shipping</dt><dd className="m-0 text-ink-700">Calculated at checkout</dd></div>
              <div className="flex justify-between"><dt className="text-ink-700">Taxes</dt><dd className="m-0 text-ink-700">Calculated at checkout</dd></div>
              <div className="flex items-baseline justify-between border-t border-line-strong pt-3">
                <dt className="text-[17px] font-extrabold">Estimated total</dt>
                <dd className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">{formatMoney(total)}</dd>
              </div>
            </dl>
            <a href={PAGES.checkout} className="flex h-[60px] items-center justify-center gap-2.5 rounded-[14px] bg-brand-600 text-[17px] font-extrabold text-white no-underline hover:bg-brand-700 hover:text-white">
              <Icon name="lock" size={18} stroke={2.2} />
              Secure checkout
            </a>
            <ul aria-label="Accepted payment methods" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {PAYMENTS.map((p) => (
                <li key={p} className="flex h-[26px] items-center rounded-sm border border-line bg-surface px-2 text-[11px] font-extrabold">{p}</li>
              ))}
            </ul>
            <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-line-strong p-0 pt-4 text-sm text-ink-700">
              <li className="flex items-center gap-2.5"><Icon name="return" size={18} className="text-brand-600" />Easy returns within 7 days</li>
              <li className="flex items-center gap-2.5">
                <Icon name="phone" size={18} className="text-brand-600" />
                Questions? <a href={STORE.phoneHref} className="font-bold">{STORE.phone}</a>
              </li>
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}

/** /cart: full table on desktop, the cart panel (as in CartMobile) below lg. */
export default function CartPage({ upsells }: { upsells: Upsell[] }) {
  const hydrated = useHydrated();
  return (
    <>
      <div className="lg:hidden">
        <h1 className="sr-only">Your cart</h1>
        {hydrated ? <CartPanel mode="page" upsells={upsells} titleId="page-cart-title" /> : <Skeleton />}
      </div>
      <div className="hidden lg:block">
        <Desktop ready={hydrated} />
      </div>
    </>
  );
}
