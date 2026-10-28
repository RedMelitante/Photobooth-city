import { useEffect, useRef, useState } from 'react';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import Icon from '@/components/react/Icon';
import { PAGES } from '@/lib/routes';
import { STRIPE_APPEARANCE, STRIPE_FONTS, getStripe, methodLabel } from '@/lib/stripe';
import { DeclinedAlert, Spinner, linkBtn } from './ui';
import type { Declined } from './PaymentStep';

export type StripeResult =
  | { status: 'paid'; paymentIntent: string; label: string }
  | { status: 'failed'; message: string };

interface Props {
  clientSecret: string;
  email: string;
  /** called right before Stripe may leave the site (Affirm, Klarna, 3-D Secure) */
  beforeRedirect: (provider: string) => void;
  onResult: (r: StripeResult) => void;
  declined: Declined;
  paying: boolean;
  setPaying: (v: boolean) => void;
  onBack: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

/**
 * Stripe Payment Element: cards, Apple Pay, Google Pay, Affirm and Klarna,
 * whichever are enabled on the Stripe account. Card data goes straight to
 * Stripe; the PaymentIntent belongs to the Medusa cart's payment session.
 */
export default function StripePayment(p: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [ready, setReady] = useState(false);
  const [method, setMethod] = useState('card');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let element: StripePaymentElement | null = null;
    let live = true;
    getStripe().then((s) => {
      if (!live || !s || !mount.current) {
        if (!s) setLoadError('Payments couldn’t load. Check your connection and refresh the page.');
        return;
      }
      const els = s.elements({ clientSecret: p.clientSecret, appearance: STRIPE_APPEARANCE, fonts: STRIPE_FONTS });
      element = els.create('payment', {
        layout: { type: 'tabs', defaultCollapsed: false },
        defaultValues: { billingDetails: { email: p.email, address: { country: 'US' } } },
      });
      element.on('ready', () => setReady(true));
      element.on('change', (e) => setMethod(e.value.type));
      element.mount(mount.current);
      setStripe(s);
      setElements(els);
    });
    return () => {
      live = false;
      element?.destroy();
    };
  }, [p.clientSecret, p.email]);

  const pay = async () => {
    if (!stripe || !elements) return;
    p.setPaying(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      p.setPaying(false);
      return; // the Payment Element shows field errors itself
    }
    const label = methodLabel(method);
    p.beforeRedirect(label);
    const returnUrl = new URL(`${PAGES.checkoutReturn}/`, window.location.origin);
    returnUrl.searchParams.set('provider', label);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: p.clientSecret,
      redirect: 'if_required',
      confirmParams: { return_url: returnUrl.toString() },
    });
    if (error) {
      p.onResult({ status: 'failed', message: error.message ?? 'Your payment was declined.' });
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture' || paymentIntent.status === 'processing')) {
      p.onResult({ status: 'paid', paymentIntent: paymentIntent.id, label });
    } else {
      p.onResult({ status: 'failed', message: 'Your payment wasn’t completed. Try again or choose another method.' });
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-col gap-1">
        <h2 ref={p.headingRef} tabIndex={-1} className="m-0 text-xl font-extrabold outline-none lg:text-[22px]">Payment</h2>
        <p className="m-0 text-[13px] text-ink-700 lg:text-sm">All transactions are secure and encrypted.</p>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[14px] border border-line p-4 lg:gap-4 lg:p-5">
        {p.declined?.kind === 'paylater' && (
          <DeclinedAlert>
            <strong>Your {p.declined.provider} application wasn’t completed.</strong> No payment was taken and your cart is saved. Choose another payment method, or try again.
          </DeclinedAlert>
        )}
        {p.declined?.kind === 'error' && <DeclinedAlert>{p.declined.message}</DeclinedAlert>}
        {loadError && <DeclinedAlert>{loadError}</DeclinedAlert>}
        {!ready && !loadError && (
          <div className="flex h-24 items-center justify-center" aria-hidden="true">
            <Spinner />
          </div>
        )}
        <div ref={mount} />
      </div>

      <button
        type="button"
        onClick={pay}
        disabled={p.paying || !ready}
        aria-busy={p.paying}
        className="flex h-14 items-center justify-center gap-2 rounded-lg bg-brand-600 text-base font-extrabold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-80 lg:h-[60px] lg:gap-2.5 lg:rounded-[14px] lg:text-[17px]"
      >
        {p.paying ? <Spinner size={20} light /> : <Icon name="lock" size={18} stroke={2.2} />}
        {p.paying ? 'Processing…' : 'Pay now'}
      </button>
      <p className="m-0 text-center text-xs leading-[18px] text-ink-500 lg:text-[13px] lg:leading-[19px]">
        Payments are processed securely by Stripe. Your card details never touch our servers.
        <span className="hidden lg:inline">
          {' '}By paying you agree to our <a href={PAGES.terms}>Terms</a> and <a href={PAGES.refund}>Refund Policy</a>.
        </span>
      </p>
      <button type="button" onClick={p.onBack} className={`${linkBtn} hidden self-start text-[15px] lg:block`}>
        ← Return to shipping
      </button>
    </div>
  );
}
