import { useEffect, useState } from 'react';
import Icon from '@/components/react/Icon';
import { clearCart } from '@/lib/cart';
import { retrievePaymentIntent, type IntentStatus } from '@/lib/checkout-payments';
import { completeCart } from '@/lib/medusa-checkout';
import { getStripe, stripeEnabled } from '@/lib/stripe';
import { loadOrder, loadPending, newOrderNumber, saveOrder, savePending, saveProgress, shortTitle, type OrderSnapshot, type PendingOrder } from '@/lib/checkout-session';
import { STORE } from '@/lib/commerce';
import { formatMoney } from '@/lib/money';
import { PAGES } from '@/lib/routes';
import { Spinner } from './ui';

const CONFIRM_HREF = `${PAGES.checkout}?step=confirmed`;
const SLOW_MS = 20_000;

type Phase = 'processing' | 'approved';

/**
 * Pay-later / 3-D Secure return page. Reads the PaymentIntent, completes the
 * order once (idempotent on the payment_intent), then hands off to the
 * confirmation step via the sessionStorage order snapshot.
 */
export default function CheckoutReturn() {
  const [phase, setPhase] = useState<Phase>('processing');
  const [slow, setSlow] = useState(false);
  const [provider, setProvider] = useState('Affirm');
  const [recap, setRecap] = useState<PendingOrder | OrderSnapshot | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const intent = q.get('payment_intent') ?? '';
    const status = q.get('redirect_status');
    const pending = loadPending();
    const existing = loadOrder();
    const prov = q.get('provider') ?? pending?.provider ?? 'Affirm';
    setProvider(prov);
    setRecap(pending ?? (existing?.paymentIntent === intent ? existing : null));

    let live = true;
    const slowTimer = window.setTimeout(() => live && setSlow(true), SLOW_MS);

    // Stripe: ask Stripe for the real PaymentIntent status, then complete the
    // Medusa cart (idempotent: a refresh returns the same order).
    const readStatus = async (): Promise<IntentStatus> => {
      if (!stripeEnabled) return retrievePaymentIntent(intent, status);
      const secret = q.get('payment_intent_client_secret');
      const stripe = await getStripe();
      if (!stripe || !secret) return 'requires_payment_method';
      const { paymentIntent } = await stripe.retrievePaymentIntent(secret);
      return (paymentIntent?.status as IntentStatus) ?? 'requires_payment_method';
    };

    const waitForIntent = async (): Promise<IntentStatus> => {
      for (;;) {
        const s = await readStatus();
        if (s !== 'processing' || !stripeEnabled || !live) return s;
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    waitForIntent().then(async (s) => {
      if (!live) return;
      if ((s === 'succeeded' || s === 'requires_capture') && stripeEnabled) {
        const already = existing && existing.paymentIntent === intent;
        if (!already) {
          try {
            const placed = await completeCart();
            if (pending) {
              const { provider: p, ...rest } = pending;
              saveOrder({ ...rest, ...placed, paymentIntent: intent, payment: `${p}` });
            }
            savePending(null);
            saveProgress(null);
            clearCart({ orderPlaced: true });
          } catch {
            // Payment went through but the order didn't: the Stripe webhook
            // completes it on the backend; show the slow-path help.
            setSlow(true);
            return;
          }
        }
        setPhase('approved');
        window.setTimeout(() => live && window.location.replace(CONFIRM_HREF), 1000);
        return;
      }
      if (s === 'succeeded' || s === 'requires_capture') {
        // Never complete twice: a refresh after success reuses the stored order.
        // Medusa: POST /store/carts/:id/complete is idempotent server-side too.
        const already = existing && existing.paymentIntent === intent && !pending;
        if (!already && pending) {
          const { provider: _p, ...rest } = pending;
          saveOrder({ ...rest, number: newOrderNumber() });
          savePending(null);
          saveProgress(null);
          clearCart();
        }
        setPhase('approved');
        window.setTimeout(() => live && window.location.replace(CONFIRM_HREF), 1000);
      } else if (s === 'requires_payment_method' || s === 'canceled') {
        // Cart and checkout progress are kept; the payment step shows the alert.
        window.location.replace(`${PAGES.checkout}?step=payment&declined=${encodeURIComponent(prov)}`);
      }
    });
    return () => {
      live = false;
      window.clearTimeout(slowTimer);
    };
  }, []);

  const count = recap ? recap.lines.reduce((a, l) => a + l.quantity, 0) : 0;
  const names = recap ? recap.lines.map((l) => shortTitle(l.title)).join(', ') : '';

  return (
    <section aria-labelledby="ret-title" className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
      {phase === 'processing' ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-5">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-brand-50">
            <Spinner />
          </span>
          <h1 id="ret-title" className="m-0 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em] lg:text-[40px]">Finishing your order…</h1>
          <p className="m-0 text-[15px] leading-[1.55] text-ink-700 lg:text-[17px]">
            We’re confirming your <strong className="text-ink-900">{provider}</strong> payment. This usually takes a few seconds — please don’t close or refresh this page.
          </p>
        </div>
      ) : (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-5">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-success-50 text-success-700">
            <Icon name="check" size={36} stroke={3} />
          </span>
          <h1 id="ret-title" className="m-0 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em] lg:text-[40px]">Payment approved</h1>
          <p className="m-0 text-[15px] leading-[1.55] text-ink-700 lg:text-[17px]">{provider === 'Affirm' || provider === 'Klarna' ? `${provider} approved your plan.` : 'Your bank approved the payment.'} Taking you to your order confirmation…</p>
          <a href={CONFIRM_HREF} className="flex h-[52px] items-center justify-center rounded-lg bg-brand-600 px-6 text-[15px] font-extrabold text-white no-underline hover:bg-brand-700 hover:text-white">
            View order confirmation
          </a>
        </div>
      )}

      {recap && (
        <dl className="m-0 mt-2 flex w-full flex-col gap-2.5 rounded-card bg-canvas px-5 py-[18px] text-left text-sm">
          <div className="flex justify-between gap-3">
            <dt className="flex-none text-ink-700">Order</dt>
            <dd className="m-0 text-right font-bold">
              {count} {count === 1 ? 'item' : 'items'} · {names}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-700">Payment</dt>
            <dd className="m-0 font-bold">{provider === 'Affirm' || provider === 'Klarna' ? `Pay later · ${provider}` : provider}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line-strong pt-2.5">
            <dt className="font-extrabold">Total</dt>
            <dd className="m-0 font-extrabold">{formatMoney(recap.total)}</dd>
          </div>
        </dl>
      )}

      {phase === 'processing' && slow && (
        <p className="m-0 text-[13px] leading-[19px] text-ink-500">
          Taking longer than usual? Your order is safe. If it doesn’t confirm within a minute we’ll email you, or call{' '}
          <a href={STORE.phoneHref} className="font-bold">{STORE.phone}</a>.
        </p>
      )}
    </section>
  );
}
