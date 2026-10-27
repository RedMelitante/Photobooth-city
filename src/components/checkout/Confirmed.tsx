import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/react/Icon';
import type { OrderSnapshot } from '@/lib/checkout-session';
import { STORE } from '@/lib/commerce';
import { PAGES } from '@/lib/routes';
import { primaryBtn } from './ui';

const STATUS = [
  ['Confirmed', 'Today'],
  ['Shipped', 'Within 3–5 days'],
  ['Delivered', 'Tracking by email'],
] as const;

export default function Confirmed({ order }: { order: OrderSnapshot }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const [password, setPassword] = useState('');
  const a = order.address;

  useEffect(() => h1.current?.focus(), []);

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    // Medusa: POST /auth/customer/emailpass/register, then link the order.
    window.location.assign(`${PAGES.register}?email=${encodeURIComponent(order.email)}`);
  };

  return (
    <div className="flex flex-col gap-5 lg:gap-7 lg:pt-4">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-[18px]">
        <span className="flex size-14 flex-none items-center justify-center rounded-full bg-success-700 text-white lg:size-16">
          <Icon name="check" size={30} stroke={2.8} />
        </span>
        <div className="flex flex-col gap-1.5 lg:gap-1">
          <span className="text-[13px] font-bold text-ink-500 lg:text-sm">Order {order.number}</span>
          <h1 ref={h1} tabIndex={-1} className="m-0 font-display text-[32px] leading-[1.05] font-extrabold tracking-[-0.03em] outline-none lg:text-[40px]">
            Thank you, {a.first}!
          </h1>
        </div>
      </div>
      <p className="m-0 text-[15px] leading-6 text-ink-700 lg:text-[17px] lg:leading-[27px]">
        Your order is confirmed. We’ve emailed your receipt to {order.email} and we’ll send tracking as soon as it ships.
      </p>

      <ol aria-label="Order status" className="m-0 flex list-none flex-col gap-3.5 rounded-[14px] border border-line p-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:rounded-card lg:p-6">
        {STATUS.map(([label, when], i) => (
          <li key={label} className="flex items-center gap-3 lg:flex-col lg:items-stretch lg:gap-2">
            <span
              aria-hidden="true"
              className={`size-3 flex-none rounded-full lg:h-1.5 lg:w-auto ${i === 0 ? 'bg-success-700' : 'border-2 border-line-strong lg:border-0 lg:bg-line'}`}
            />
            <strong className="flex-1 text-sm lg:flex-none lg:text-[15px]">
              {label}
              {i === 0 && <span className="sr-only"> (current)</span>}
            </strong>
            <span className="text-[13px] text-ink-500">{when}</span>
          </li>
        ))}
      </ol>

      <dl className="m-0 flex flex-col gap-3.5 rounded-[14px] border border-line p-4 text-sm leading-5 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5 lg:rounded-card lg:p-6 lg:leading-[21px]">
        <div className="order-1 lg:order-none">
          <dt className="font-extrabold lg:mb-1">Contact</dt>
          <dd className="m-0 break-words text-ink-700">{order.email}</dd>
        </div>
        <div className="order-4 lg:order-none">
          <dt className="font-extrabold lg:mb-1">Payment</dt>
          <dd className="m-0 text-ink-700">{order.payment}</dd>
        </div>
        <div className="order-2 lg:order-none">
          <dt className="font-extrabold lg:mb-1">Shipping address</dt>
          <dd className="m-0 text-ink-700">
            {a.first} {a.last}
            {a.company && (
              <>
                <br />
                {a.company}
              </>
            )}
            <br />
            {a.line1}
            {a.line2 && `, ${a.line2}`}
            <br />
            {a.city}, {a.state} {a.zip}
          </dd>
        </div>
        <div className="order-3 lg:order-none">
          <dt className="font-extrabold lg:mb-1">Shipping method</dt>
          <dd className="m-0 text-ink-700">{order.shipName}</dd>
        </div>
      </dl>

      <form onSubmit={createAccount} className="flex flex-col gap-2.5 rounded-[14px] bg-canvas p-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-3 lg:rounded-card lg:p-6">
        <div className="flex flex-col gap-1 lg:basis-full">
          <strong className="text-[15px] lg:text-base">Save your details for faster reorders</strong>
          <span className="hidden text-sm text-ink-700 lg:block">Create an account to track this order and check out in one step next time.</span>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-bold lg:flex-[1_1_260px]">
          Create a password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="box-border h-[52px] w-full rounded-md border-[1.5px] border-line-strong bg-surface px-3 text-base font-normal lg:px-3.5"
          />
        </label>
        <button type="submit" className="h-[52px] rounded-md bg-ink-900 px-[22px] text-[15px] font-extrabold text-white hover:bg-ink-950">
          Create account
        </button>
      </form>

      <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-4">
        <a href={PAGES.home} className={`${primaryBtn} px-7`}>
          Continue shopping
        </a>
        <a href={STORE.phoneHref} className="self-center p-2 text-sm font-bold text-ink-900 lg:p-0 lg:text-[15px]">
          Need help? Call {STORE.phone}
        </a>
      </div>
    </div>
  );
}
