import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/react/Icon';
import { loadDropin, type DropinInstance } from '@/lib/braintree';
import { formatMoney } from '@/lib/money';
import { DeclinedAlert, Spinner, linkBtn, primaryBtn } from './ui';
import type { Declined } from './PaymentStep';

interface Props {
  clientToken: string;
  /** cents */
  total: number;
  /** hands the nonce to the backend and completes the order; throws with a message on failure */
  onPay: (nonce: string, label: string, deviceData?: string) => Promise<void>;
  declined: Declined;
  paying: boolean;
  setPaying: (v: boolean) => void;
  onBack: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

/** Braintree's client token says which environment it belongs to. */
function isSandbox(token: string): boolean {
  try {
    return JSON.parse(atob(token)).environment === 'sandbox';
  } catch {
    return false;
  }
}

/** Braintree Drop-in: card fields and the PayPal button, hosted by Braintree. */
export default function BraintreePayment(p: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [dropin, setDropin] = useState<DropinInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let instance: DropinInstance | null = null;
    setDropin(null);
    loadDropin()
      .then((ns) => {
        if (!live || !mount.current) return null;
        mount.current.innerHTML = '';
        return ns.create({
          authorization: p.clientToken,
          container: mount.current,
          card: { cardholderName: { required: false } },
          paypal: { flow: 'checkout', amount: (p.total / 100).toFixed(2), currency: 'USD', buttonStyle: { color: 'gold', shape: 'rect', size: 'responsive' } },
          vaultManager: false,
        });
      })
      .then((inst) => {
        if (!inst) return;
        if (!live) {
          void inst.teardown();
          return;
        }
        instance = inst;
        setDropin(inst);
      })
      .catch(() => live && setLoadError('Payments couldn’t load. Check your connection and refresh the page.'));
    return () => {
      live = false;
      void instance?.teardown().catch(() => {});
    };
  }, [p.clientToken, p.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async () => {
    if (!dropin || p.paying) return;
    setError(null);
    let payload;
    try {
      payload = await dropin.requestPaymentMethod();
    } catch {
      setError('Check your card details, or choose PayPal.');
      return;
    }
    p.setPaying(true);
    try {
      const label = payload.type === 'PayPalAccount' ? 'PayPal' : `${String(payload.details?.cardType ?? 'Card')} ending ${String(payload.details?.lastFour ?? '')}`.trim();
      await p.onPay(payload.nonce, label, payload.deviceData);
    } catch (e) {
      // The nonce is spent; the buyer re-enters their details.
      dropin.clearSelectedPaymentMethod();
      p.setPaying(false);
      setError((e as Error).message);
    }
  };

  const message = error ?? (p.declined?.kind === 'error' ? p.declined.message : null);

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 ref={p.headingRef} tabIndex={-1} className="m-0 text-xl font-extrabold outline-none lg:text-[22px]">Payment</h2>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500">
          <Icon name="lock" size={14} /> Secured by Braintree, a PayPal service
        </span>
      </div>
      {isSandbox(p.clientToken) && (
        <p role="note" className="m-0 rounded-md border-[1.5px] border-cyan-400 bg-cyan-50 px-4 py-3 text-sm leading-5 text-ink-950">
          <strong>Sandbox mode.</strong> No real money moves. Test card 4111 1111 1111 1111, any future date, any CVV; or PayPal with a sandbox buyer account.
        </p>
      )}
      {message && (
        <DeclinedAlert>
          {message} {/charged|taken/i.test(message) ? 'Your cart is saved.' : 'No payment was taken and your cart is saved.'}
        </DeclinedAlert>
      )}
      {loadError ? (
        <DeclinedAlert>{loadError}</DeclinedAlert>
      ) : (
        <div className="relative min-h-[120px]">
          <div ref={mount} />
          {!dropin && (
            <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading secure payment">
              <Spinner />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col-reverse items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between">
        <button type="button" onClick={p.onBack} className={`${linkBtn} self-center text-[15px] lg:self-auto`}>← Return to shipping</button>
        <button type="button" onClick={pay} disabled={!dropin || p.paying} className={`${primaryBtn} lg:min-w-[240px]`}>
          {p.paying ? <Spinner size={22} light /> : <Icon name="lock" size={18} />}
          {p.paying ? 'Placing your order…' : `Pay ${formatMoney(p.total)}`}
        </button>
      </div>
    </div>
  );
}
