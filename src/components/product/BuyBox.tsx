import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/react/Icon';
import { addLine } from '@/lib/cart';
import { PROMO, STORE } from '@/lib/commerce';
import { formatMoney, formatShort } from '@/lib/money';
import { findVariant, sized, toCartLine, valueAvailable } from '@/lib/product';
import { PAGES } from '@/lib/routes';
import type { Product, ProductVariant } from '@/lib/types';
import { $variantId, defaultVariant, variantParam, type ClientProduct } from './state';

interface Props {
  product: ClientProduct;
  kicker: string;
  lead: string;
  note: string;
  /** 'pdp' = the richer Ring Roamer design; 'template' = generic ProductPage */
  layout: 'pdp' | 'template';
  swatches?: Record<string, string>;
}

type Sel = Record<string, string>;

const optionsOf = (v: ProductVariant | undefined): Sel => ({ ...(v?.options ?? {}) });

export default function BuyBox({ product: p, kicker, lead, note, layout, swatches = {} }: Props) {
  const pdp = layout === 'pdp';
  const opts = useMemo(() => p.options.filter((o) => !(o.name === 'Title' && o.values.length === 1)), [p]);
  const [sel, setSel] = useState<Sel>(() => optionsOf(defaultVariant(p)));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [flash, setFlash] = useState(false);
  const [notify, setNotify] = useState<'closed' | 'open' | 'sent'>('closed');
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState(false);
  const [sticky, setSticky] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const variant = findVariant(p as Product, sel);
  const price = variant?.price ?? p.minPrice;
  const cmp = variant ? variant.compareAtPrice ?? 0 : p.compareAtPrice ?? 0;
  const sale = cmp > price;
  const exists = !!variant;
  const avail = !!variant?.available;
  const single = p.variants.length === 1;

  // ?variant= on load
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('variant');
    const v = q ? p.variants.find((x) => x.id === q || variantParam(x.id) === q) : undefined;
    if (v) setSel(optionsOf(v));
    $variantId.set((v ?? defaultVariant(p))?.id ?? null);
  }, [p]);

  // mobile sticky bar once the main CTA scrolls out of view (upwards)
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pick = (name: string, value: string) => {
    let next: Sel = { ...sel, [name]: value };
    if (!findVariant(p as Product, next)) {
      // keep the picked value; move the other options to the closest existing variant
      const score = (v: ProductVariant) => opts.reduce((a, o) => a + (v.options[o.name] === sel[o.name] ? 1 : 0), 0) + (v.available ? 0.5 : 0);
      const best = p.variants.filter((v) => v.options[name] === value).sort((a, b) => score(b) - score(a))[0];
      if (best) next = optionsOf(best);
    }
    setSel(next);
    setAdded(false);
    setNotify('closed');
    const v = findVariant(p as Product, next);
    if (v) {
      $variantId.set(v.id);
      const url = new URL(location.href);
      url.searchParams.set('variant', variantParam(v.id));
      history.replaceState(history.state, '', url);
    }
  };

  const add = () => {
    if (!variant || !variant.available) return;
    addLine(toCartLine(p as Product, variant), qty);
    setAdded(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 2200);
  };

  const openNotify = () => {
    setNotify('open');
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const submitNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailErr(true);
      return;
    }
    // No backend yet: a Medusa/Klaviyo back-in-stock subscription plugs in here.
    setNotify('sent');
  };

  const stockText = avail ? 'In stock' + (p.leadTime ? ' · ' + p.leadTime : '') : single ? 'Sold out' : exists ? 'Sold out in this configuration' : 'Unavailable in this configuration';
  const shortTitle = p.title.replace(/ Photo Booth.*$| \|.*$/, '');
  const stickyName = shortTitle + (opts[0] && sel[opts[0].name] ? ' · ' + sel[opts[0].name] : '');
  const thumb = p.images[0]?.url;

  const isUnavailable = (name: string, value: string) => !valueAvailable(p as Product, sel, name, value);

  return (
    <section aria-labelledby="pp-title" className={'flex min-w-0 flex-col ' + (pdp ? 'gap-5 lg:sticky lg:top-6 lg:gap-6' : 'gap-[22px]')}>
      {/* Title */}
      <div className={'flex flex-col ' + (pdp ? 'gap-2 lg:gap-3' : 'gap-3')}>
        <span className={'font-extrabold tracking-[0.1em] text-brand-600 uppercase ' + (pdp ? 'text-[11px] lg:text-xs' : 'text-xs')}>{kicker}</span>
        <h1 id="pp-title" className={'m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] text-balance lg:text-[40px] lg:leading-[1.05] ' + (pdp ? 'leading-[1.08]' : 'leading-[1.05]')}>
          {p.title}
        </h1>
        {lead && <p className={'m-0 text-base leading-6 text-ink-700 ' + (pdp ? 'max-lg:hidden' : '')}>{lead}</p>}
      </div>

      {/* Price */}
      <div className={'flex flex-col ' + (pdp ? 'gap-2 max-lg:-mt-3 lg:gap-2.5 lg:border-b lg:border-line lg:pb-6' : 'gap-2 border-b border-line pb-[22px]')}>
        <div className={'flex flex-wrap items-baseline ' + (pdp ? 'gap-x-2.5 gap-y-1 lg:gap-3' : 'gap-3')}>
          <span className={'font-extrabold tracking-[-0.02em] ' + (pdp ? 'text-[26px] lg:text-[32px] ' : 'text-[28px] lg:text-[32px] ') + (sale ? 'text-sale-600' : 'text-ink-900')} aria-live="polite">
            {sale && <span className="sr-only">Sale price </span>}
            {formatMoney(price)}
          </span>
          {sale && (
            <>
              <s className="text-lg text-ink-500">
                <span className="sr-only">Regular price </span>
                {formatMoney(cmp)}
              </s>
              <span className="rounded-sm bg-sale-50 px-2 py-[3px] text-[13px] font-extrabold text-sale-600">Save {formatMoney(cmp - price)}</span>
            </>
          )}
          {pdp && (
            <span className="text-[13px] text-ink-500 lg:text-sm">
              <span className="max-lg:hidden">USD · </span>Shipping calculated at checkout
            </span>
          )}
        </div>
        {!pdp && <span className="text-sm text-ink-500">USD · Shipping calculated at checkout</span>}
        {pdp && (
          <div className="flex items-center gap-2 self-stretch rounded-md bg-flash-100 px-2.5 py-2 text-[13px] leading-[18px] lg:gap-2.5 lg:self-start lg:px-3 lg:text-sm">
            <span className="flex-none rounded-sm bg-flash-400 px-1.5 py-0.5 text-[11px] font-extrabold text-ink-950 lg:px-2 lg:text-xs">
              FLASH<span className="max-lg:hidden"> SALE</span>
            </span>
            <span>
              <strong>
                {PROMO.percent}% off <span className="max-lg:hidden">orders </span>{formatShort(PROMO.minSubtotal)}+
              </strong>{' '}
              with code <strong className="lg:font-mono">{PROMO.code}</strong>
            </span>
          </div>
        )}
        <p className={'m-0 text-[13px] leading-[18px] text-ink-700 ' + (pdp ? 'mt-1.5' : '')}>
          Or pay over time with <strong className="text-ink-900">Affirm</strong> or <strong className="text-ink-900">Klarna</strong> at checkout. Subject to approval.
        </p>
      </div>

      {/* Options */}
      {opts.map((o) => {
        const cur = sel[o.name] ?? o.values[0];
        const kind = pdp ? (/^colou?r$/i.test(o.name) && o.values.every((v) => swatches[v]) ? 'swatch' : /faceplate/i.test(o.name) ? 'solid' : /ipad size/i.test(o.name) ? 'grid' : 'pill') : 'pill';
        const legendCls = 'p-0 pb-2.5 text-[15px] font-extrabold ' + (pdp ? 'max-lg:text-sm lg:pb-3' : '');
        const pills = o.values.map((v) => {
          const on = cur === v;
          const out = isUnavailable(o.name, v);
          const base = 'relative text-ink-900 transition-colors duration-150 ' + (out ? 'text-ink-500 ' : '');
          const label = out ? `${v} (sold out)` : undefined;
          if (kind === 'swatch')
            return (
              <button key={v} type="button" onClick={() => pick(o.name, v)} aria-pressed={on} aria-label={label} className={base + 'flex h-12 items-center gap-2.5 rounded-full border-2 bg-surface pr-[18px] pl-2 text-sm font-bold max-lg:flex-1 max-lg:pr-3 ' + (on ? 'border-ink-900' : 'border-line hover:border-line-strong')}>
                <span className="size-[30px] flex-none rounded-full shadow-[inset_0_0_0_1px_rgb(11_16_32/0.2)]" style={{ background: swatches[v] }} />
                <span className={out ? 'line-through' : ''}>{v}</span>
              </button>
            );
          if (kind === 'solid')
            return (
              <button key={v} type="button" onClick={() => pick(o.name, v)} aria-pressed={on} aria-label={label} className={base + 'min-h-12 rounded-lg border-2 px-5 text-sm font-bold max-lg:flex-1 max-lg:px-2.5 max-lg:py-1.5 max-lg:text-[13px] max-lg:leading-[17px] ' + (on ? 'border-ink-900 bg-ink-900 !text-white' : 'border-line-strong bg-surface hover:border-ink-900')}>
                <span className={out ? 'line-through' : ''}>{v}</span>
              </button>
            );
          if (kind === 'grid')
            return (
              <button key={v} type="button" onClick={() => pick(o.name, v)} aria-pressed={on} aria-label={label} className={base + 'min-h-14 rounded-lg border-2 px-3.5 py-2 text-left text-[13px] leading-[18px] font-semibold ' + (on ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface hover:border-line-strong') + (out ? ' border-dashed' : '')}>
                <span className={out ? 'line-through' : ''}>{v}</span>
              </button>
            );
          return (
            <button key={v} type="button" onClick={() => pick(o.name, v)} aria-pressed={on} aria-label={label} className={base + 'min-h-[46px] rounded-lg border-2 px-4 py-2 text-left text-sm leading-[18px] font-semibold ' + (on ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface hover:border-line-strong') + (out ? ' border-dashed' : '')}>
              <span className={out ? 'line-through decoration-ink-300' : ''}>{v}</span>
            </button>
          );
        });

        if (kind === 'grid')
          return (
            <div key={o.name}>
              <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0 max-lg:hidden">
                <legend className={legendCls + ' flex w-full justify-between'}>
                  {o.name}
                  <a href="#specs" className="text-[13px] font-bold">Which iPad do I have?</a>
                </legend>
                <div className="grid grid-cols-2 gap-2">{pills}</div>
              </fieldset>
              <label className="flex flex-col gap-2.5 text-sm font-extrabold lg:hidden">
                {o.name}
                <select value={cur} onChange={(e) => pick(o.name, e.target.value)} className="h-[52px] rounded-lg border-[1.5px] border-line-strong bg-surface px-3.5 text-[15px] font-semibold text-ink-900">
                  {o.values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                      {isUnavailable(o.name, v) ? ' — sold out' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );

        return (
          <fieldset key={o.name} className="m-0 flex min-w-0 flex-col border-0 p-0">
            <legend className={legendCls}>
              {o.name}
              <span className={kind === 'solid' ? 'max-lg:hidden' : ''}>
                : <span className="font-semibold text-ink-700">{cur}</span>
              </span>
            </legend>
            <div className={'flex gap-2 ' + (kind === 'pill' ? 'flex-wrap' : 'lg:flex-wrap lg:gap-2.5')}>{pills}</div>
          </fieldset>
        );
      })}

      {/* Stock */}
      <p className={'m-0 flex items-start gap-2.5 text-[15px] leading-5 font-bold ' + (pdp ? 'max-lg:text-sm ' : '') + (avail ? 'text-success-700' : 'text-sale-600')} aria-live="polite">
        <span aria-hidden="true" className={'mt-[5px] size-2.5 flex-none rounded-full ' + (avail ? 'bg-success-700 shadow-[0_0_0_4px_var(--color-success-50)]' : 'bg-sale-600')} />
        {stockText}
      </p>

      {/* Quantity + CTA */}
      <div ref={ctaRef} className={'flex ' + (pdp ? 'gap-2.5 lg:gap-3' : 'gap-3')}>
        <div role="group" aria-label="Quantity" className={'flex flex-none items-center rounded-[14px] border-[1.5px] border-line-strong ' + (pdp ? 'h-14 lg:h-[60px]' : 'h-[58px]')}>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity" className={'flex h-full items-center justify-center text-ink-900 disabled:text-ink-300 ' + (pdp ? 'w-11 lg:w-12' : 'w-[46px]')}>
            <Icon name="minus" size={18} stroke={2.4} />
          </button>
          <span aria-live="polite" className={'text-center font-extrabold ' + (pdp ? 'w-6 text-base lg:w-8 lg:text-[17px]' : 'w-7 text-[17px]')}>
            {qty}
          </span>
          <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} aria-label="Increase quantity" className={'flex h-full items-center justify-center text-ink-900 disabled:text-ink-300 ' + (pdp ? 'w-11 lg:w-12' : 'w-[46px]')}>
            <Icon name="plus" size={18} stroke={2.4} />
          </button>
        </div>
        {avail ? (
          <button type="button" onClick={add} className={'flex min-w-0 flex-1 items-center justify-center gap-2.5 rounded-[14px] font-extrabold text-white transition-colors duration-150 ' + (pdp ? 'h-14 text-base lg:h-[60px] lg:text-[17px] ' : 'h-[58px] text-base ') + (flash ? 'bg-success-700' : 'bg-brand-600 hover:bg-brand-700')}>
            <Icon name={flash ? 'check' : 'bag'} size={20} stroke={2.2} />
            {flash ? (
              'Added to cart'
            ) : (
              <span className="truncate">
                Add to cart<span className="max-sm:hidden"> · {formatMoney(price * qty)}</span>
              </span>
            )}
          </button>
        ) : exists ? (
          <button type="button" onClick={openNotify} aria-expanded={notify !== 'closed'} aria-controls="pp-notify" className={'min-w-0 flex-1 rounded-[14px] border-2 border-ink-900 bg-surface font-extrabold text-ink-900 hover:bg-ink-900 hover:text-white ' + (pdp ? 'h-14 text-base lg:h-[60px] lg:text-[17px]' : 'h-[58px] text-base')}>
            Notify me when available
          </button>
        ) : (
          <button type="button" disabled className={'min-w-0 flex-1 cursor-not-allowed rounded-[14px] border border-dashed border-line-strong bg-canvas font-bold text-ink-500 ' + (pdp ? 'h-14 lg:h-[60px]' : 'h-[58px]')}>
            Unavailable
          </button>
        )}
      </div>

      {!avail && exists && notify !== 'closed' && (
        <div id="pp-notify" className="-mt-2 rounded-card bg-canvas p-4">
          {notify === 'sent' ? (
            <p role="status" className="m-0 flex items-start gap-2.5 text-sm leading-5 text-ink-700">
              <Icon name="check" size={18} stroke={2.6} className="mt-px text-success-700" />
              <span>
                Thanks — we’ll email <strong className="text-ink-900">{email.trim()}</strong> when {single ? 'it' : 'this configuration'} is back in stock.
              </span>
            </p>
          ) : (
            <form onSubmit={submitNotify} noValidate className="flex flex-col gap-2">
              <label htmlFor="pp-notify-email" className="text-sm font-bold">
                Email me when {single ? 'it' : 'this configuration'} is back in stock
              </label>
              <div className="flex gap-2">
                <input
                  ref={emailRef}
                  id="pp-notify-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailErr(false);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={emailErr}
                  aria-describedby={emailErr ? 'pp-notify-err' : undefined}
                  className="h-12 min-w-0 flex-1 rounded-md border-[1.5px] border-line-strong bg-surface px-3.5 text-[15px] text-ink-900"
                />
                <button type="submit" className="h-12 flex-none rounded-md bg-ink-900 px-[18px] text-sm font-extrabold text-white hover:bg-ink-950">
                  Notify me
                </button>
              </div>
              {emailErr && (
                <span id="pp-notify-err" role="alert" className="text-[13px] font-semibold text-sale-600">
                  Enter a valid email address.
                </span>
              )}
            </form>
          )}
        </div>
      )}

      {added && avail && (
        <a href={PAGES.cart} className={'text-sm font-bold ' + (pdp ? '-mt-3' : '-mt-2')}>
          Added to your cart — view cart and checkout →
        </a>
      )}

      {note &&
        (pdp ? (
          <p className="m-0 -mt-1.5 flex items-center gap-2 text-[13px] text-ink-700 lg:-mt-2 lg:text-sm">
            <Icon name="info" size={16} className="text-ink-500 max-lg:hidden" />
            {note}
          </p>
        ) : (
          <p className="m-0 -mt-1.5 text-sm leading-5 text-ink-700">{note}</p>
        ))}

      {/* Reassurance */}
      <ul className={'m-0 grid list-none grid-cols-3 border-y border-line p-0 ' + (pdp ? 'gap-2 py-3.5 lg:gap-3 lg:py-[18px]' : 'gap-3 py-4')}>
        {(
          [
            ['globe', 'Ships across the US', ''],
            ['return', '7-day', ' returns'],
            ['lock', 'Secure payment', ''],
          ] as const
        ).map(([icon, a, b]) => (
          <li key={icon} className={'flex flex-col gap-1.5 text-[13px] leading-[18px] ' + (pdp ? 'max-lg:items-center max-lg:text-center max-lg:text-xs max-lg:leading-4 lg:items-start' : 'items-start')}>
            <Icon name={icon} size={22} className="text-brand-600" />
            <strong>
              {a}
              {icon === 'return' && <span className={pdp ? 'max-lg:hidden' : ''}> easy</span>}
              {b}
            </strong>
          </li>
        ))}
      </ul>

      {/* Help */}
      <div className="flex items-center gap-4 rounded-card bg-ink-950 px-5 py-[18px] text-white max-lg:hidden">
        <span className="flex size-12 flex-none items-center justify-center rounded-full bg-flash-400 text-ink-950">
          <Icon name="phone" size={22} stroke={2.2} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-base font-extrabold">Need help choosing?</span>
          <span className="text-sm text-ink-200">
            Call{' '}
            <a href={STORE.phoneHref} className="font-extrabold text-white hover:text-white">
              {STORE.phone}
            </a>{' '}
            and talk to an expert.
          </span>
        </span>
      </div>
      <a href={STORE.phoneHref} className="flex items-center gap-3.5 rounded-card bg-ink-950 p-4 text-white no-underline hover:text-white lg:hidden">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-flash-400 text-ink-950">
          <Icon name="phone" size={20} stroke={2.2} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">Need help choosing?</span>
          <span className="text-sm text-ink-200">Call {STORE.phone}</span>
        </span>
      </a>

      {/* Mobile sticky add-to-cart */}
      <div
        className={'fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-surface px-4 py-3 shadow-[0_-8px_24px_rgb(11_16_32/0.10)] transition-transform duration-200 ease-out lg:hidden ' + (sticky ? 'translate-y-0' : 'pointer-events-none translate-y-full')}
        aria-hidden={!sticky}
        inert={!sticky}
      >
        {thumb && (
          <span className="size-12 flex-none overflow-hidden rounded-md bg-canvas">
            <img src={sized(thumb, 120)} alt="" width={48} height={48} loading="lazy" className="product-shot size-full" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-bold">{stickyName}</span>
          <span className={'text-[15px] font-extrabold ' + (sale ? 'text-sale-600' : '')}>{formatMoney(price)}</span>
        </span>
        {avail ? (
          <button type="button" onClick={add} className={'flex h-12 flex-none items-center gap-2 rounded-lg px-5 text-[15px] font-extrabold text-white ' + (flash ? 'bg-success-700' : 'bg-brand-600 hover:bg-brand-700')}>
            {flash && <Icon name="check" size={16} stroke={2.6} />}
            {flash ? 'Added' : 'Add to cart'}
          </button>
        ) : exists ? (
          <button
            type="button"
            onClick={() => {
              ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              openNotify();
            }}
            className="h-12 flex-none rounded-lg border-2 border-ink-900 bg-surface px-4 text-sm font-extrabold text-ink-900"
          >
            Notify me
          </button>
        ) : (
          <span className="flex h-12 flex-none items-center rounded-lg bg-canvas px-4 text-sm font-bold text-ink-500">Unavailable</span>
        )}
      </div>
    </section>
  );
}
