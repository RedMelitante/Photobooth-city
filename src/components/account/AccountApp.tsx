import { useEffect, useRef, useState } from 'react';
import { getCustomer, listOrders, logout, type Customer, type Order } from '@/lib/account';
import { STORE } from '@/lib/commerce';
import { PAGES } from '@/lib/routes';
import type { CartLine } from '@/lib/types';
import { useHydrated } from '@/lib/useHydrated';
import AccountAddresses from './AccountAddresses';
import AccountDetails from './AccountDetails';
import AccountOrders from './AccountOrders';

const TABS = ['Orders', 'Addresses', 'Account details'] as const;
type Tab = (typeof TABS)[number];
const TAB_HASH: Record<Tab, string> = { Orders: 'orders', Addresses: 'addresses', 'Account details': 'details' };

interface Props {
  reorder: Record<string, Omit<CartLine, 'quantity'>>;
}

export default function AccountApp({ reorder }: Props) {
  const hydrated = useHydrated();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<Tab>('Orders');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const c = await getCustomer();
      if (!alive) return;
      if (!c) {
        window.location.replace(PAGES.login);
        return;
      }
      setCustomer(c);
      setOrders(await listOrders());
      const fromHash = TABS.find((t) => `#${TAB_HASH[t]}` === window.location.hash);
      if (fromHash) setTab(fromHash);
      setChecked(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pick = (t: Tab) => {
    setTab(t);
    try {
      window.history.replaceState(null, '', `#${TAB_HASH[t]}`);
    } catch {
      /* ignore */
    }
  };

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + TABS.length) % TABS.length;
    pick(TABS[n]);
    tabRefs.current[n]?.focus();
  };

  const signOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
    window.location.href = PAGES.login;
  };

  const ready = hydrated && checked && !!customer;
  const name = customer?.firstName?.trim();

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-14 lg:px-10 lg:pt-12 lg:pb-24">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 lg:mb-10">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-ink-500">My account</span>
          <h1 className="m-0 font-display text-[34px] leading-none font-extrabold tracking-[-0.035em] lg:text-[52px]">
            {ready ? (name ? `Hi, ${name}` : 'Hi there') : <span className="inline-block h-[0.9em] w-[5em] animate-pulse rounded-md bg-chip align-middle" aria-label="Loading account" />}
          </h1>
        </div>
        <a href={PAGES.login} onClick={signOut} className="flex min-h-11 items-center text-sm font-bold text-ink-700 underline hover:text-ink-900">
          Log out
        </a>
      </header>

      <div className="flex flex-wrap items-start gap-5 lg:gap-10">
        <nav aria-label="Account sections" className="min-w-0 flex-[1_1_100%] lg:flex-[0_0_240px]">
          <ul role="tablist" className="m-0 flex list-none gap-1.5 overflow-x-auto p-0 lg:flex-col">
            {TABS.map((t, i) => {
              const on = tab === t;
              return (
                <li key={t} role="presentation" className="flex-none">
                  <button
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`acct-tab-${TAB_HASH[t]}`}
                    aria-selected={on}
                    aria-controls="acct-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => pick(t)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={
                      'min-h-12 w-full rounded-lg border-0 px-4 text-left text-[15px] font-extrabold whitespace-nowrap transition-colors ' +
                      (on ? 'bg-ink-900 text-white' : 'bg-chip text-ink-900 hover:bg-line')
                    }
                  >
                    {t}
                  </button>
                </li>
              );
            })}
          </ul>
          <a
            href={STORE.phoneHref}
            className="mt-5 hidden flex-col gap-1 rounded-card bg-ink-950 p-[18px] text-white no-underline hover:text-white lg:flex"
          >
            <strong className="text-[15px]">Help with an order?</strong>
            <span className="text-sm text-ink-200">{STORE.phone}</span>
          </a>
        </nav>

        <section id="acct-panel" role="tabpanel" aria-labelledby={`acct-tab-${TAB_HASH[tab]}`} className="min-w-0 flex-[999_1_640px]">
          {!ready ? (
            <div className="flex flex-col gap-3.5" aria-busy="true">
              <span className="h-7 w-28 animate-pulse rounded-md bg-chip" />
              <span className="h-[78px] animate-pulse rounded-[18px] bg-canvas" />
              <span className="h-[78px] animate-pulse rounded-[18px] bg-canvas" />
            </div>
          ) : tab === 'Orders' ? (
            <AccountOrders orders={orders} reorder={reorder} />
          ) : tab === 'Addresses' ? (
            <AccountAddresses />
          ) : (
            <AccountDetails customer={customer} onSaved={setCustomer} />
          )}
        </section>
      </div>
    </div>
  );
}
