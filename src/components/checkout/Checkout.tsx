import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import Icon from '@/components/react/Icon';
import { $cart, $promo, $subtotal, clearCart } from '@/lib/cart';
import { confirmPayment, type CardInput, type PayMethod } from '@/lib/checkout-payments';
import {
  STEPS,
  formatAddress,
  initialProgress,
  loadOrder,
  loadProgress,
  newOrderNumber,
  rememberInfo,
  saveOrder,
  savePending,
  saveProgress,
  type Address,
  type CheckoutProgress,
  type OrderSnapshot,
  type StepId,
} from '@/lib/checkout-session';
import { US_STATES, estimateTax, promoState, shippingOptions } from '@/lib/commerce';
import { formatMoney } from '@/lib/money';
import { PAGES, collectionUrl } from '@/lib/routes';
import Confirmed from './Confirmed';
import { SummaryAside, SummaryBar, type SummaryData } from './OrderSummary';
import PaymentStep, { type Declined } from './PaymentStep';
import { Checkbox, Field, Optional, linkBtn, primaryBtn } from './ui';
import * as V from './validate';

type FormStep = Exclude<StepId, 'confirmed'>;
const LABEL: Record<StepId, string> = { address: 'Address', shipping: 'Shipping', payment: 'Payment', confirmed: 'Done' };
const idx = (s: StepId) => STEPS.indexOf(s);

type AddrKey = keyof Address;
type FieldKey = 'email' | AddrKey;
const ADDRESS_ORDER: FieldKey[] = ['email', 'first', 'last', 'line1', 'city', 'state', 'zip', 'phone'];

function fieldError(p: CheckoutProgress, k: FieldKey): V.Msg {
  if (k === 'email') return V.email(p.email);
  return V.ADDRESS_RULES[k]?.(p.address[k]) ?? null;
}
const addressValid = (p: CheckoutProgress) => ADDRESS_ORDER.every((k) => !fieldError(p, k));

const EXPRESS = [
  { label: 'Apple Pay', method: 'Apple Pay', cls: 'border-0 bg-black text-white' },
  { label: 'Google Pay', method: 'Google Pay', cls: 'border-[1.5px] border-line-strong bg-surface text-ink-900' },
  { label: 'Link', method: 'Card', cls: 'border-0 bg-[#00D66F] text-ink-950' },
  { label: 'PayPal', method: 'PayPal', cls: 'border-0 bg-[#FFC439] text-[#003087]' },
] as const;

function Skeleton() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row" aria-busy="true">
      <div className="h-[60px] border-b border-line bg-canvas lg:hidden" />
      <div className="flex flex-1 justify-end px-4 pt-5 lg:pt-10 lg:pr-16 lg:pl-10">
        <div className="flex w-full max-w-[660px] flex-col gap-4">
          <span className="sr-only">Loading checkout…</span>
          <div className="h-8 w-2/3 animate-pulse rounded-md bg-chip" />
          <div className="h-[52px] animate-pulse rounded-md bg-chip" />
          <div className="h-[52px] animate-pulse rounded-md bg-chip" />
          <div className="h-[52px] animate-pulse rounded-md bg-chip" />
        </div>
      </div>
      <div className="hidden border-l border-line bg-canvas lg:block lg:w-[420px]" />
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-12 lg:px-10 lg:py-20">
      <section aria-labelledby="empty-title" className="flex flex-col items-center gap-4 rounded-hero bg-canvas px-6 pt-16 pb-20 text-center">
        <h1 id="empty-title" className="m-0 font-display text-[28px] leading-[1.1] font-bold tracking-[-0.02em] lg:text-[32px]">Your cart is empty</h1>
        <a href={collectionUrl('ipad-booths')} className={`${primaryBtn} px-7`}>Continue shopping</a>
        <a href={PAGES.cart} className="text-[15px] font-bold">← Return to cart</a>
      </section>
    </div>
  );
}

export default function Checkout() {
  const cart = useStore($cart);
  const sub = useStore($subtotal);
  const promo = useStore($promo);

  const [p, setP] = useState<CheckoutProgress | null>(null);
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [declined, setDeclined] = useState<Declined>(null);
  const [paying, setPaying] = useState(false);
  const [express, setExpress] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Restore progress (sessionStorage) + read ?step= / ?declined= after mount,
  // so the server markup (skeleton) and the first client render match.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const qStep = q.get('step');
    const qDeclined = q.get('declined');
    const snapshot = loadOrder();
    let prog = loadProgress() ?? initialProgress();
    if (prog.step === 'confirmed') prog = { ...prog, step: 'address' };

    if (qStep === 'confirmed' && snapshot) {
      setOrder(snapshot);
    } else if (qStep === 'address' || qStep === 'shipping' || qStep === 'payment') {
      const step: FormStep = qStep !== 'address' && !addressValid(prog) ? 'address' : qStep;
      prog = { ...prog, step, reached: idx(step) > idx(prog.reached) ? step : prog.reached };
      if (qDeclined && step === 'payment') {
        setDeclined({ kind: 'paylater', provider: qDeclined });
        prog = { ...prog, pay: 'Card' };
      }
    }
    setP(prog);
    if (q.toString()) window.history.replaceState(null, '', snapshot && qStep === 'confirmed' ? '?step=confirmed' : PAGES.checkout);
  }, []);

  useEffect(() => {
    if (p && !order) saveProgress(p);
  }, [p, order]);

  const step: StepId = order ? 'confirmed' : (p?.step ?? 'address');

  // Move focus to the new step's heading (not on first paint).
  useEffect(() => {
    if (!p) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const state = p?.address.state ?? '';
  const options = useMemo(() => shippingOptions(sub, state), [sub, state]);
  const sel = options.find((o) => o.id === p?.ship) ?? options[0];

  if (!p) return <Skeleton />;
  if (!order && cart.lines.length === 0) return <EmptyCart />;

  const update = (patch: Partial<CheckoutProgress>) => setP((cur) => (cur ? { ...cur, ...patch } : cur));
  const setAddr = (k: AddrKey, v: string) => update({ address: { ...p.address, [k]: v } });
  const err = (k: FieldKey) => (touched[k] ? fieldError(p, k) : null);

  const goTo = (target: FormStep) => {
    if (idx(target) > idx('address') && !addressValid(p)) {
      setTouched(Object.fromEntries(ADDRESS_ORDER.map((k) => [k, true])));
      update({ step: 'address' });
      const first = ADDRESS_ORDER.find((k) => fieldError(p, k));
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`#f-${first}`)?.focus());
      return;
    }
    const reached = idx(target) > idx(p.reached) ? target : p.reached;
    update({ step: target, reached, ship: sel.id });
  };

  // ── Totals ──────────────────────────────────────────────
  const past = idx(step) >= idx('shipping');
  const discount = promo.discount;
  const shipAmt = past ? (sel.amount ?? 0) : 0;
  const tax = past ? estimateTax(sub - discount, state) : 0;
  const total = sub - discount + shipAmt + tax;

  const summary: SummaryData = order
    ? {
        lines: order.lines,
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        shipping: order.shipping == null ? 'Live rate' : formatMoney(order.shipping),
        shippingNote: order.shipping == null ? 'calculated by carrier' : undefined,
        tax: formatMoney(order.tax),
        promo: promoState(0, false),
        editable: false,
      }
    : {
        lines: cart.lines,
        subtotal: sub,
        discount,
        total,
        shipping: past ? (sel.amount == null ? 'Live rate' : formatMoney(sel.amount)) : 'Calculated at next step',
        shippingNote: past && sel.amount == null ? 'calculated by carrier' : undefined,
        tax: past ? formatMoney(tax) : 'Calculated at payment',
        promo,
        editable: true,
      };

  // ── Pay ─────────────────────────────────────────────────
  const pay = async (card?: CardInput) => {
    const method = p.pay as PayMethod;
    setPaying(true);
    setDeclined(null);
    const res = await confirmPayment({ method, amount: total, email: p.email, card, provider: 'Affirm' });
    const snap = {
      paymentIntent: '',
      lines: cart.lines,
      subtotal: sub,
      discount,
      shipping: sel.amount,
      tax,
      total,
      shipName: sel.name,
      email: p.email.trim(),
      address: p.address,
      payment: method,
      createdAt: new Date().toISOString(),
    };
    if (res.status === 'declined') {
      setPaying(false);
      setDeclined({ kind: 'card' });
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView({ block: 'center' }));
      return;
    }
    rememberInfo(p);
    if (res.status === 'redirect') {
      // Snapshot now; /checkout/return completes it and clears the cart.
      savePending({ ...snap, paymentIntent: res.paymentIntent, payment: 'Pay later · Affirm', provider: 'Affirm' });
      window.location.assign(res.url);
      return;
    }
    const done: OrderSnapshot = { ...snap, number: newOrderNumber(), paymentIntent: res.paymentIntent, payment: res.label };
    saveOrder(done);
    saveProgress(null);
    clearCart();
    setOrder(done);
    setPaying(false);
    window.history.replaceState(null, '', '?step=confirmed');
  };

  // ── Field helpers ───────────────────────────────────────
  const text = (k: FieldKey, label: React.ReactNode, attrs: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <Field id={`f-${k}`} label={label} error={err(k)} hint={hint}>
      {(a) => (
        <input
          {...a}
          type="text"
          {...attrs}
          value={k === 'email' ? p.email : p.address[k as AddrKey]}
          onChange={(e) => (k === 'email' ? update({ email: e.target.value }) : setAddr(k as AddrKey, e.target.value))}
          onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
        />
      )}
    </Field>
  );

  const stateSelect = (
    <Field id="f-state" label="State" error={err('state')}>
      {(a) => (
        <select
          {...a}
          autoComplete="address-level1"
          value={p.address.state}
          onChange={(e) => setAddr('state', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, state: true }))}
          className={`${a.className} px-2.5`}
        >
          <option value="">Select</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      )}
    </Field>
  );

  // ── Progress ────────────────────────────────────────────
  const cur = idx(step);
  const reachedIdx = idx(p.reached);
  const desktopSteps: { key: 'cart' | FormStep; n: number }[] = [
    { key: 'cart', n: 1 },
    { key: 'address', n: 2 },
    { key: 'shipping', n: 3 },
    { key: 'payment', n: 4 },
  ];

  const progress = (
    <>
      <nav aria-label="Checkout progress" className="hidden lg:block">
        <ol className="m-0 flex list-none items-center gap-2.5 p-0 text-sm font-bold">
          {desktopSteps.map((s, i) => {
            const si = s.key === 'cart' ? -1 : idx(s.key);
            const current = si === cur;
            const done = s.key === 'cart' || si < cur || (si < reachedIdx && !current);
            const locked = s.key !== 'cart' && si > reachedIdx;
            const label = s.key === 'cart' ? 'Cart' : LABEL[s.key];
            const dot = (
              <span
                className={`box-border flex size-7 items-center justify-center rounded-full border-2 text-[13px] font-extrabold ${
                  done ? 'border-success-700 bg-success-700 text-white' : current ? 'border-ink-900 bg-ink-900 text-white' : 'border-line-strong bg-surface text-ink-500'
                }`}
              >
                {done ? <Icon name="check" size={14} stroke={3.2} /> : s.n}
              </span>
            );
            const cls = `flex items-center gap-2 px-1 py-1.5 font-bold no-underline ${current || done ? 'text-ink-900 hover:text-ink-900' : 'text-ink-500'}`;
            return (
              <li key={s.key} className="flex items-center gap-2.5">
                {s.key === 'cart' ? (
                  <a href={PAGES.cart} className={cls}>
                    {dot}
                    {label}
                    <span className="sr-only">(completed)</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    aria-current={current ? 'step' : undefined}
                    onClick={() => !current && goTo(s.key as FormStep)}
                    className={`${cls} border-0 bg-transparent disabled:cursor-default`}
                  >
                    {dot}
                    {label}
                    {done && <span className="sr-only">(completed)</span>}
                  </button>
                )}
                {i < desktopSteps.length - 1 && <span aria-hidden="true" className={`h-0.5 w-10 rounded-sm ${done ? 'bg-success-700' : 'bg-line-strong'}`} />}
              </li>
            );
          })}
        </ol>
      </nav>
      <nav aria-label="Checkout progress" className="flex flex-col gap-1 lg:hidden">
        <span className="text-[13px] font-bold text-ink-700">
          Step {Math.min(cur + 1, 3)} of 3 · <span className="text-ink-900">{LABEL[step]}</span>
        </span>
        <ol className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
          {(['address', 'shipping', 'payment'] as FormStep[]).map((s) => {
            const si = idx(s);
            const current = si === cur;
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={si > reachedIdx}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`${LABEL[s]}${si < cur ? ' (completed)' : ''}`}
                  onClick={() => !current && goTo(s)}
                  className="flex h-6 w-full items-center border-0 bg-transparent p-0 disabled:cursor-default"
                >
                  <span className={`block h-1.5 w-full rounded-full ${si < cur ? 'bg-success-700' : current ? 'bg-ink-900' : 'bg-line'}`} />
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );

  // ── Review box (shipping + payment) ─────────────────────
  const shipPrice = sel.amount == null ? 'Live rate' : formatMoney(sel.amount);
  const reviewRow = (label: string, value: string, onChange: () => void, last = false) => (
    <div className={`flex gap-3 py-3.5 text-sm lg:gap-4 lg:py-4 ${last ? '' : 'border-b border-line'}`}>
      <dt className="flex-[0_0_64px] text-ink-500 lg:flex-[0_0_90px]">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 break-words">{value}</dd>
      <button type="button" onClick={onChange} className={`${linkBtn} text-sm`} aria-label={`Change ${label.toLowerCase()}`}>
        Change
      </button>
    </div>
  );
  const review = (
    <dl className="m-0 rounded-[14px] border border-line px-4 lg:px-5">
      {reviewRow('Contact', p.email, () => goTo('address'))}
      {reviewRow('Ship to', formatAddress(p.address, true), () => goTo('address'), step === 'shipping')}
      {step === 'payment' && reviewRow('Method', `${sel.name} · ${shipPrice}`, () => goTo('shipping'), true)}
    </dl>
  );

  // ── Steps ───────────────────────────────────────────────
  const addressStep = (
    <div className="flex flex-col gap-6 lg:gap-8">
      <section aria-labelledby="xp-title" className="flex flex-col gap-2.5 lg:gap-3">
        <h2 id="xp-title" className="m-0 text-center text-[13px] font-bold text-ink-700 lg:text-sm">Express checkout</h2>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {EXPRESS.map((x, i) => (
            <button
              key={x.label}
              type="button"
              aria-pressed={express === x.label}
              onClick={() => {
                setExpress(x.label);
                update({ pay: x.method });
              }}
              className={`h-[52px] rounded-md text-[15px] font-extrabold ${x.cls} ${i === 0 || i === 3 ? 'col-span-2 lg:col-span-1' : ''} ${express === x.label ? 'ring-[3px] ring-brand-600 ring-offset-2' : ''}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div aria-hidden="true" className="flex items-center gap-3 text-xs font-bold text-ink-500 lg:gap-3.5 lg:text-[13px]">
          <span className="h-px flex-1 bg-line" />
          OR
          <span className="h-px flex-1 bg-line" />
        </div>
      </section>

      <section aria-labelledby="ct-title" className="flex flex-col gap-3 lg:gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 id="ct-title" ref={heading} tabIndex={-1} className="m-0 text-xl font-extrabold outline-none lg:text-[22px]">Contact</h2>
          <a href={PAGES.login} className="text-[13px] font-bold lg:text-sm">
            <span className="hidden lg:inline">Have an account? </span>Log in
          </a>
        </div>
        {text('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'you@yourbusiness.com', inputMode: 'email' })}
        <Checkbox checked={p.marketing} onChange={(v) => update({ marketing: v })}>Email me flash sales and new arrivals</Checkbox>
      </section>

      <section aria-labelledby="sh-title" className="flex flex-col gap-3 lg:gap-3.5">
        <h2 id="sh-title" className="m-0 text-xl font-extrabold lg:text-[22px]">Shipping address</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-country" className="text-[13px] font-bold">Country / region</label>
          <select id="f-country" autoComplete="country-name" className="box-border h-[52px] w-full rounded-md border-[1.5px] border-line-strong bg-surface px-3 text-base text-ink-900 lg:px-3.5">
            <option value="US">United States</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
          {text('first', 'First name', { autoComplete: 'given-name' })}
          {text('last', 'Last name', { autoComplete: 'family-name' })}
        </div>
        <div className="hidden lg:block">
          <Field id="f-company" label={<>Company <Optional /></>}>
            {(a) => <input {...a} type="text" autoComplete="organization" value={p.address.company} onChange={(e) => setAddr('company', e.target.value)} />}
          </Field>
        </div>
        {text('line1', 'Address', { autoComplete: 'address-line1', placeholder: 'Street address' })}
        <Field id="f-line2" label={<>Apartment, suite<span className="hidden lg:inline">, etc.</span> <Optional /></>}>
          {(a) => <input {...a} type="text" autoComplete="address-line2" value={p.address.line2} onChange={(e) => setAddr('line2', e.target.value)} />}
        </Field>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
          <div className="col-span-2 lg:col-span-1">{text('city', 'City', { autoComplete: 'address-level2' })}</div>
          {stateSelect}
          {text('zip', 'ZIP code', { autoComplete: 'postal-code', inputMode: 'numeric' })}
        </div>
        {text('phone', 'Phone', { type: 'tel', autoComplete: 'tel' }, 'For delivery questions only')}
        <div className="hidden lg:block">
          <Checkbox checked={p.saveInfo} onChange={(v) => update({ saveInfo: v })}>Save this information for next time</Checkbox>
        </div>
      </section>

      <div className="flex flex-col-reverse items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between">
        <a href={PAGES.cart} className="self-center p-2 text-sm font-bold lg:self-auto lg:p-0 lg:text-[15px]">← Return to cart</a>
        <button type="button" onClick={() => goTo('shipping')} className={primaryBtn}>Continue to shipping</button>
      </div>
    </div>
  );

  const remote = options.length === 1;
  const shippingStep = (
    <div className="flex flex-col gap-3 lg:gap-5">
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0 lg:gap-2.5">
        <legend className="p-0 pb-3 lg:pb-3.5">
          <h2 ref={heading} tabIndex={-1} className="m-0 text-xl font-extrabold outline-none lg:text-[22px]">Shipping method</h2>
        </legend>
        {options.map((o) => {
          const on = o.id === sel.id;
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer items-center gap-3 rounded-[14px] border-2 p-4 lg:gap-3.5 lg:px-5 lg:py-[18px] ${on ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface'}`}
            >
              <input type="radio" name="ship" checked={on} onChange={() => update({ ship: o.id })} className="m-0 size-5 flex-none accent-brand-600" />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-extrabold lg:text-base">{o.name}</span>
                <span className="text-[13px] text-ink-700 lg:text-sm">{o.detail}</span>
              </span>
              <span className="flex flex-col items-end text-right">
                <span className="text-[15px] font-extrabold lg:text-base">{o.amount == null ? 'Live rate' : formatMoney(o.amount)}</span>
                {o.amount == null && <span className="text-xs text-ink-500">calculated by carrier</span>}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="m-0 flex gap-2.5 rounded-lg bg-brand-50 px-4 py-3.5 text-sm leading-5 font-semibold text-brand-700">
        <Icon name="truck" size={18} className="mt-px" />
        <span>
          Orders ship within 3–5 days from our Mira Loma, CA warehouse.
          {remote ? ' Hawaii, Alaska and Puerto Rico ship with UPS + USPS at live rates.' : ' Economy is $20–$200 depending on order value.'}
        </span>
      </p>
      <div className="flex items-center justify-between gap-4 pt-2 lg:pt-3">
        <button type="button" onClick={() => goTo('address')} className={`${linkBtn} hidden text-[15px] lg:block`}>← Return to address</button>
        <button type="button" onClick={() => goTo('payment')} className={`${primaryBtn} w-full lg:w-auto`}>Continue to payment</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[1440px] lg:flex-row">
      <SummaryBar d={summary} />
      <div ref={formRef} className="flex min-w-0 flex-1 justify-end px-4 pt-5 pb-10 lg:pt-10 lg:pr-16 lg:pb-20 lg:pl-10">
        <div className="flex w-full max-w-[660px] flex-col gap-6 lg:gap-8">
          {step !== 'confirmed' && <h1 className="sr-only">Checkout</h1>}
          {step !== 'confirmed' && progress}
          {step === 'address' && addressStep}
          {(step === 'shipping' || step === 'payment') && review}
          {step === 'shipping' && shippingStep}
          {step === 'payment' && (
            <PaymentStep
              headingRef={heading}
              pay={p.pay as PayMethod}
              setPay={(m) => update({ pay: m })}
              billingSame={p.billingSame}
              setBillingSame={(v) => update({ billingSame: v })}
              billing={p.billing}
              setBilling={(b) => update({ billing: b })}
              shipZip={p.address.zip}
              declined={declined}
              paying={paying}
              onPay={pay}
              onBack={() => goTo('shipping')}
            />
          )}
          {order && <Confirmed order={order} />}
        </div>
      </div>
      <SummaryAside d={summary} />
    </div>
  );
}
