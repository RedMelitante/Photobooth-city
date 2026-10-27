// Checkout state that must survive a refresh or the pay-later redirect.
// Everything lives in sessionStorage (per tab, cleared when it closes); card
// numbers and CVCs are never stored.
import { STORE } from './commerce';
import type { CartLine } from './types';

export type StepId = 'address' | 'shipping' | 'payment' | 'confirmed';
export const STEPS: StepId[] = ['address', 'shipping', 'payment', 'confirmed'];

export interface Address {
  first: string;
  last: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface BillingAddress {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface CheckoutProgress {
  step: StepId;
  /** furthest step reached */
  reached: StepId;
  email: string;
  marketing: boolean;
  saveInfo: boolean;
  address: Address;
  ship: 'economy' | 'ups';
  pay: string;
  billingSame: boolean;
  billing: BillingAddress;
}

export interface OrderSnapshot {
  number: string;
  paymentIntent: string;
  lines: CartLine[];
  /** all cents */
  subtotal: number;
  discount: number;
  shipping: number | null;
  tax: number;
  total: number;
  shipName: string;
  email: string;
  address: Address;
  payment: string;
  createdAt: string;
}

/** Order built before a pay-later redirect; becomes an OrderSnapshot on return. */
export type PendingOrder = Omit<OrderSnapshot, 'number'> & { provider: string };

const K_PROGRESS = 'pbc.checkout.progress.v1';
const K_PENDING = 'pbc.checkout.pending.v1';
const K_ORDER = 'pbc.checkout.order.v1';
/** "Save this information for next time" (this device only) */
const K_SAVED = 'pbc.checkout.saved.v1';

function read<T>(store: 'session' | 'local', key: string): T | null {
  try {
    const s = store === 'session' ? sessionStorage : localStorage;
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(store: 'session' | 'local', key: string, value: unknown) {
  try {
    const s = store === 'session' ? sessionStorage : localStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota */
  }
}

export const emptyAddress = (): Address => ({ first: '', last: '', company: '', line1: '', line2: '', city: '', state: '', zip: '', phone: '' });

export function initialProgress(): CheckoutProgress {
  const saved = read<{ email: string; address: Address }>('local', K_SAVED);
  return {
    step: 'address',
    reached: 'address',
    email: saved?.email ?? '',
    marketing: true,
    saveInfo: !!saved,
    address: { ...emptyAddress(), ...saved?.address },
    ship: 'economy',
    pay: 'Card',
    billingSame: true,
    billing: { line1: '', city: '', state: '', zip: '' },
  };
}

export const loadProgress = (): CheckoutProgress | null => read<CheckoutProgress>('session', K_PROGRESS);
export const saveProgress = (p: CheckoutProgress | null) => write('session', K_PROGRESS, p);

export function rememberInfo(p: CheckoutProgress) {
  write('local', K_SAVED, p.saveInfo ? { email: p.email, address: p.address } : null);
}

export const loadPending = () => read<PendingOrder>('session', K_PENDING);
export const savePending = (o: PendingOrder | null) => write('session', K_PENDING, o);
export const loadOrder = () => read<OrderSnapshot>('session', K_ORDER);
export const saveOrder = (o: OrderSnapshot | null) => write('session', K_ORDER, o);

/** "#PBC" + 4 digits. Medusa returns the real display id on cart-complete. */
export function newOrderNumber(): string {
  return `${STORE.orderPrefix}${1000 + Math.floor(Math.random() * 9000)}`;
}

export function shortTitle(title: string): string {
  return title.replace(/ Photo ?Booth.*$| by Photobooth City.*$| \|.*$/i, '').trim() || title;
}

export function formatAddress(a: Address, withCountry = false): string {
  const street = [a.line1, a.line2].filter(Boolean).join(', ');
  return `${street}, ${a.city}, ${a.state} ${a.zip}${withCountry ? ', United States' : ''}`;
}
