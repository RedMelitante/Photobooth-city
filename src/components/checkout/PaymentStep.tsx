import { useRef, useState } from 'react';
import Icon from '@/components/react/Icon';
import { PAY_METHODS, cardBrand, type CardInput, type PayMethod } from '@/lib/checkout-payments';
import type { BillingAddress } from '@/lib/checkout-session';
import { US_STATES } from '@/lib/commerce';
import { PAGES } from '@/lib/routes';
import { DeclinedAlert, Field, Spinner, linkBtn } from './ui';
import * as V from './validate';

export type Declined = { kind: 'paylater'; provider: string } | { kind: 'card' } | { kind: 'error'; message: string } | null;

interface Props {
  pay: PayMethod;
  setPay: (m: PayMethod) => void;
  billingSame: boolean;
  setBillingSame: (v: boolean) => void;
  billing: BillingAddress;
  setBilling: (b: BillingAddress) => void;
  /** shipping ZIP, prefilled into the card ZIP */
  shipZip: string;
  declined: Declined;
  paying: boolean;
  onPay: (card?: CardInput) => void;
  onBack: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

const walletWhere = (m: PayMethod) =>
  m === 'PayPal' ? 'the PayPal window' : m === 'Pay later' ? 'the Affirm or Klarna window, where you pick a monthly or pay-in-4 plan' : `the ${m} sheet`;

type CardKey = keyof CardInput;
type BillKey = keyof BillingAddress;

export default function PaymentStep(p: Props) {
  const [card, setCard] = useState<CardInput>({ number: '', expiry: '', cvc: '', zip: p.shipZip });
  const [cardTouched, setCardTouched] = useState<Partial<Record<CardKey, boolean>>>({});
  const [billTouched, setBillTouched] = useState<Partial<Record<BillKey, boolean>>>({});
  const root = useRef<HTMLDivElement>(null);
  const digits = card.number.replace(/\D/g, '');
  const amex = cardBrand(digits) === 'Amex';

  const cardRule: Record<CardKey, (v: string) => V.Msg> = {
    number: V.cardNumber,
    expiry: V.expiry,
    cvc: (v) => V.cvc(v, amex),
    zip: V.zip,
  };
  const cardErr = (k: CardKey) => (cardTouched[k] ? cardRule[k](card[k]) : null);
  const billErr = (k: BillKey) => (billTouched[k] ? V.BILLING_RULES[k](p.billing[k]) : null);

  const submit = () => {
    const cardKeys: CardKey[] = p.pay === 'Card' ? ['number', 'expiry', 'cvc', 'zip'] : [];
    const billKeys: BillKey[] = p.billingSame ? [] : ['line1', 'city', 'state', 'zip'];
    const badCard = cardKeys.filter((k) => cardRule[k](card[k]));
    const badBill = billKeys.filter((k) => V.BILLING_RULES[k](p.billing[k]));
    if (badCard.length || badBill.length) {
      setCardTouched(Object.fromEntries(cardKeys.map((k) => [k, true])));
      setBillTouched(Object.fromEntries(billKeys.map((k) => [k, true])));
      const first = badCard.length ? `pay-${badCard[0]}` : `bill-${badBill[0]}`;
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`#${first}`)?.focus());
      return;
    }
    p.onPay(p.pay === 'Card' ? card : undefined);
  };

  const cardInput = (k: CardKey, label: React.ReactNode, extra: React.InputHTMLAttributes<HTMLInputElement>, className = '') => (
    <Field id={`pay-${k}`} label={label} error={cardErr(k)} className={className}>
      {(a) => (
        <input
          {...a}
          {...extra}
          type="text"
          value={card[k]}
          onChange={(e) => {
            const v = e.target.value;
            const next = k === 'number' ? V.formatCard(v) : k === 'expiry' ? V.formatExpiry(v, card.expiry) : k === 'cvc' ? v.replace(/\D/g, '').slice(0, 4) : v;
            setCard({ ...card, [k]: next });
          }}
          onBlur={() => setCardTouched({ ...cardTouched, [k]: true })}
          className={`${a.className} ${extra.className ?? ''}`}
        />
      )}
    </Field>
  );

  const billInput = (k: BillKey, label: string, auto: string) => (
    <Field id={`bill-${k}`} label={label} error={billErr(k)}>
      {(a) =>
        k === 'state' ? (
          <select
            {...a}
            autoComplete={auto}
            value={p.billing.state}
            onChange={(e) => p.setBilling({ ...p.billing, state: e.target.value })}
            onBlur={() => setBillTouched({ ...billTouched, state: true })}
            className={`${a.className} px-2.5`}
          >
            <option value="">Select</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        ) : (
          <input
            {...a}
            type="text"
            autoComplete={auto}
            inputMode={k === 'zip' ? 'numeric' : undefined}
            value={p.billing[k]}
            onChange={(e) => p.setBilling({ ...p.billing, [k]: e.target.value })}
            onBlur={() => setBillTouched({ ...billTouched, [k]: true })}
          />
        )
      }
    </Field>
  );

  const radio = (same: boolean, label: string) => {
    const on = p.billingSame === same;
    return (
      <label
        className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg px-4 text-[15px] font-semibold ${on ? 'border-2 border-brand-600 bg-brand-50' : 'border-[1.5px] border-line'}`}
      >
        <input type="radio" name="bill" checked={on} onChange={() => p.setBillingSame(same)} className="m-0 size-5 accent-brand-600" />
        {label}
      </label>
    );
  };

  return (
    <div ref={root} className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-col gap-1">
        <h2 ref={p.headingRef} tabIndex={-1} className="m-0 text-xl font-extrabold outline-none lg:text-[22px]">Payment</h2>
        <p className="m-0 text-[13px] text-ink-700 lg:text-sm">All transactions are secure and encrypted.</p>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[14px] border border-line p-4 lg:gap-4 lg:p-5">
        <p role="note" className="m-0 rounded-lg border-[1.5px] border-flash-400 bg-flash-100 px-4 py-3 text-sm leading-5 text-ink-950">
          <strong>Test checkout.</strong> Payments aren't connected yet, so no card is charged. Use any card number; 4000 0000 0000 0002 shows a decline.
        </p>
        {p.declined?.kind === 'paylater' && (
          <DeclinedAlert>
            <strong>Your {p.declined.provider} application wasn’t completed.</strong> No payment was taken and your cart is saved. Choose another payment method, or try Pay later again.
          </DeclinedAlert>
        )}
        {p.declined?.kind === 'error' && <DeclinedAlert>{p.declined.message}</DeclinedAlert>}
        {p.declined?.kind === 'card' && (
          <DeclinedAlert>
            <strong>Your card was declined.</strong> No payment was taken and your cart is saved. Try another card, or choose another payment method.
          </DeclinedAlert>
        )}

        <div role="tablist" aria-label="Payment method" hidden={PAY_METHODS.length < 2} className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-2.5 lg:overflow-visible lg:p-0">
          {PAY_METHODS.map((m) => {
            const on = p.pay === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                id={`tab-${m}`}
                aria-selected={on}
                aria-controls="pay-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => p.setPay(m)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                  const i = PAY_METHODS.indexOf(m) + (e.key === 'ArrowRight' ? 1 : -1);
                  const next = PAY_METHODS[(i + PAY_METHODS.length) % PAY_METHODS.length];
                  p.setPay(next);
                  requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
                }}
                className={`flex h-12 flex-none flex-col items-start justify-center gap-1 rounded-md border-2 bg-surface px-4 text-sm font-extrabold whitespace-nowrap lg:h-16 lg:px-3.5 lg:py-2.5 ${on ? 'border-brand-600 text-brand-600' : 'border-line text-ink-900'}`}
              >
                <Icon name="card" size={20} className="hidden lg:block" />
                {m}
              </button>
            );
          })}
        </div>

        <div id="pay-panel" role="tabpanel" aria-labelledby={`tab-${p.pay}`}>
          {p.pay === 'Card' ? (
            <div className="flex flex-col gap-3.5">
              <Field id="pay-number" label="Card number" error={cardErr('number')}>
                {(a) => (
                  <span className="relative flex">
                    <input
                      {...a}
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 1234 1234 1234"
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: V.formatCard(e.target.value) })}
                      onBlur={() => setCardTouched({ ...cardTouched, number: true })}
                      className={`${a.className} lg:pr-[150px]`}
                    />
                    <span aria-hidden="true" className="absolute top-3.5 right-2.5 hidden gap-1 lg:flex">
                      {['VISA', 'MC', 'AMEX'].map((b) => (
                        <span key={b} className="flex h-6 items-center rounded-[4px] border border-line px-1.5 text-[10px] font-extrabold">{b}</span>
                      ))}
                    </span>
                  </span>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                {cardInput('expiry', <>Expiration<span className="hidden lg:inline"> date</span></>, { autoComplete: 'cc-exp', placeholder: 'MM / YY', inputMode: 'numeric' })}
                {cardInput('cvc', <><span className="lg:hidden">CVC</span><span className="hidden lg:inline">Security code</span></>, { autoComplete: 'cc-csc', placeholder: 'CVC', inputMode: 'numeric' })}
              </div>
              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3">
                <div className="hidden min-w-0 flex-col gap-1.5 lg:flex">
                  <label htmlFor="pay-country" className="text-[13px] font-bold">Country</label>
                  <select id="pay-country" disabled className="box-border h-[52px] w-full rounded-md border-[1.5px] border-line-strong bg-surface px-2.5 text-base text-ink-900 opacity-100">
                    <option>United States</option>
                  </select>
                </div>
                {cardInput('zip', 'ZIP', { autoComplete: 'postal-code', inputMode: 'numeric' })}
              </div>
            </div>
          ) : (
            <p className="m-0 rounded-md bg-canvas p-5 text-sm leading-[21px] text-ink-700">
              After you select <strong>Pay now</strong>, you’ll confirm the payment in {walletWhere(p.pay)}.
            </p>
          )}
        </div>
      </div>

      <fieldset className="m-0 hidden flex-col gap-2 border-0 p-0 lg:flex">
        <legend className="p-0 pb-2.5 text-base font-extrabold">Billing address</legend>
        {radio(true, 'Same as shipping address')}
        {radio(false, 'Use a different billing address')}
      </fieldset>
      <label className="flex min-h-8 items-center gap-2.5 text-sm lg:hidden">
        <input type="checkbox" checked={p.billingSame} onChange={(e) => p.setBillingSame(e.target.checked)} className="m-0 size-5 accent-brand-600" />
        Billing address same as shipping
      </label>
      {!p.billingSame && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-line p-4 lg:p-5">
          {billInput('line1', 'Address', 'billing address-line1')}
          {billInput('city', 'City', 'billing address-level2')}
          <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
            {billInput('state', 'State', 'billing address-level1')}
            {billInput('zip', 'ZIP code', 'billing postal-code')}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={p.paying}
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
