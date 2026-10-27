// Customer account adapter — MOCK.
//
// There is no backend yet, so this module fakes customer auth with
// localStorage. Every function is async and returns plain data so the pages
// can switch to Medusa v2 customer auth by replacing the bodies only:
//
//   login          -> sdk.auth.login('customer', 'emailpass', { email, password })
//   register       -> sdk.auth.register('customer', 'emailpass', …) + sdk.store.customer.create(…)
//   reset          -> sdk.auth.resetPassword('customer', 'emailpass', { identifier: email })
//   logout         -> sdk.auth.logout()
//   getCustomer    -> sdk.store.customer.retrieve()
//   updateCustomer -> sdk.store.customer.update(…)
//   listOrders     -> sdk.store.order.list()
//   listAddresses / saveAddress / deleteAddress -> sdk.store.customer.*Address(…)
//
// The mock never stores passwords. Log in succeeds for any valid email with a
// password of 8+ characters.

export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  acceptsMarketing: boolean;
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export type OrderStatus = 'processing' | 'shipped' | 'delivered';

export interface OrderLine {
  title: string;
  variantTitle: string;
  handle: string;
  /** catalog variant id, used for "Buy again" */
  variantId: string;
  image: string;
  /** cents */
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  displayId: string;
  /** ISO date */
  createdAt: string;
  status: OrderStatus;
  statusLabel: string;
  /** 0–3: Confirmed, Shipped, Delivered steps completed */
  step: number;
  /** cents */
  total: number;
  itemCount: number;
  lines: OrderLine[];
  trackingUrl?: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; field?: 'email' | 'password' | 'firstName' | 'lastName' };

const SESSION_KEY = 'pbc.account.session';
const PROFILES_KEY = 'pbc.account.profiles';
const ADDRESSES_KEY = 'pbc.account.addresses';

// ── validation (shared by the forms) ─────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Enter your email address.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address, like you@yourbusiness.com.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Enter your password.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

// ── storage helpers ──────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the session just won't persist */
  }
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const norm = (email: string) => email.trim().toLowerCase();

/** "jordan.rivera@…" -> "Jordan" when we know nothing else about the customer. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0].split(/[._+-]/)[0] ?? '';
  return local ? local[0].toUpperCase() + local.slice(1).toLowerCase() : '';
}

// ── auth ─────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<Result<Customer>> {
  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, error: emailErr, field: 'email' };
  const pwErr = validatePassword(password);
  if (pwErr) return { ok: false, error: pwErr, field: 'password' };
  await delay();
  const profiles = read<Record<string, Customer>>(PROFILES_KEY, {});
  const customer: Customer = profiles[norm(email)] ?? {
    email: email.trim(),
    firstName: nameFromEmail(email),
    lastName: '',
    acceptsMarketing: true,
  };
  write(SESSION_KEY, customer);
  return { ok: true, data: customer };
}

export async function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptsMarketing: boolean;
}): Promise<Result<Customer>> {
  const emailErr = validateEmail(input.email);
  if (emailErr) return { ok: false, error: emailErr, field: 'email' };
  const pwErr = validatePassword(input.password);
  if (pwErr) return { ok: false, error: pwErr, field: 'password' };
  await delay();
  const profiles = read<Record<string, Customer>>(PROFILES_KEY, {});
  if (profiles[norm(input.email)]) {
    return { ok: false, error: 'An account with this email already exists. Log in instead.', field: 'email' };
  }
  const customer: Customer = {
    email: input.email.trim(),
    firstName: input.firstName.trim() || nameFromEmail(input.email),
    lastName: input.lastName.trim(),
    acceptsMarketing: input.acceptsMarketing,
  };
  profiles[norm(customer.email)] = customer;
  write(PROFILES_KEY, profiles);
  write(SESSION_KEY, customer);
  return { ok: true, data: customer };
}

/** Request a password-reset email. Always "succeeds" for a valid address (no account enumeration). */
export async function reset(email: string): Promise<Result<null>> {
  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, error: emailErr, field: 'email' };
  await delay();
  return { ok: true, data: null };
}

export async function logout(): Promise<void> {
  write(SESSION_KEY, null);
}

/** The signed-in customer, or null. Client only. */
export async function getCustomer(): Promise<Customer | null> {
  if (typeof window === 'undefined') return null;
  return read<Customer | null>(SESSION_KEY, null);
}

export async function updateCustomer(patch: Partial<Omit<Customer, 'email'>> & { email?: string }): Promise<Result<Customer>> {
  const current = await getCustomer();
  if (!current) return { ok: false, error: 'Your session has ended. Log in again.' };
  if (patch.email !== undefined) {
    const emailErr = validateEmail(patch.email);
    if (emailErr) return { ok: false, error: emailErr, field: 'email' };
  }
  await delay(250);
  const next: Customer = { ...current, ...patch, email: (patch.email ?? current.email).trim() };
  const profiles = read<Record<string, Customer>>(PROFILES_KEY, {});
  delete profiles[norm(current.email)];
  profiles[norm(next.email)] = next;
  write(PROFILES_KEY, profiles);
  write(SESSION_KEY, next);
  return { ok: true, data: next };
}

// ── orders ───────────────────────────────────────────────────────

// SAMPLE DATA: the two orders from the Account design board (variant ids are
// the catalog variants matching each line's price). Replace with
// sdk.store.order.list() once Medusa is connected.
const SAMPLE_ORDERS: Order[] = [
  {
    id: 'order_sample_1001',
    displayId: '#PBC1001',
    createdAt: '2026-10-21',
    status: 'processing',
    statusLabel: 'Processing · ships in 3–5 days',
    step: 1,
    total: 166800,
    itemCount: 3,
    lines: [
      {
        title: 'Ring Roamer Photo Booth for iPad',
        variantTitle: 'Black / Aluminum / 11-inch iPad Pro M4',
        handle: 'ring-roamer-10-5-v2-app-controlled',
        variantId: 'variant_41219940319314',
        image: '/images/design/0a2f0b5e068aaf3643bdef1597361669.webp',
        unitPrice: 96200,
        quantity: 1,
      },
      {
        title: 'Roamer Stand by Photobooth City',
        variantTitle: '',
        handle: 'roamer-stand',
        variantId: 'variant_42508707168338',
        image: '/images/design/c3f35de68387512a58667250f967d60f.webp',
        unitPrice: 49900,
        quantity: 1,
      },
      {
        title: '12V Rechargeable Battery Pack',
        variantTitle: '',
        handle: '12v-rechargeable-battery-pack',
        variantId: 'variant_40146211078226',
        image: '/images/design/1d40bc8a7b5d324c5eea0d84063b0f0f.webp',
        unitPrice: 10700,
        quantity: 1,
      },
    ],
  },
  {
    id: 'order_sample_1000',
    displayId: '#PBC1000',
    createdAt: '2026-09-08',
    status: 'delivered',
    statusLabel: 'Delivered',
    step: 3,
    total: 4100,
    itemCount: 1,
    lines: [
      {
        title: 'Camera Hot Shoe',
        variantTitle: '',
        handle: 'camera-hot-shoe-1',
        variantId: 'variant_40564365000786',
        image: '/images/design/36b62a40f07a63459b86b5250ff39644.webp',
        unitPrice: 2100,
        quantity: 1,
      },
    ],
  },
];

export async function listOrders(): Promise<Order[]> {
  const c = await getCustomer();
  return c ? SAMPLE_ORDERS : [];
}

// ── addresses ────────────────────────────────────────────────────

// SAMPLE DATA: the default address from the Account design board, shown
// until the customer saves their own.
const SAMPLE_ADDRESS: Address = {
  id: 'addr_sample',
  firstName: 'Jordan',
  lastName: 'Rivera',
  company: 'Rivera Events',
  address1: '1234 Sample Street',
  city: 'Las Vegas',
  province: 'NV',
  postalCode: '89101',
  country: 'United States',
  isDefault: true,
};

export async function listAddresses(): Promise<Address[]> {
  return read<Address[]>(ADDRESSES_KEY, [SAMPLE_ADDRESS]);
}

export async function saveAddress(addr: Omit<Address, 'id'> & { id?: string }): Promise<Address[]> {
  await delay(200);
  let list = await listAddresses();
  const saved: Address = { ...addr, id: addr.id ?? `addr_${Date.now().toString(36)}` };
  if (saved.isDefault || !list.length) {
    saved.isDefault = true;
    list = list.map((a) => ({ ...a, isDefault: false }));
  }
  const i = list.findIndex((a) => a.id === saved.id);
  if (i >= 0) list[i] = saved;
  else list.push(saved);
  write(ADDRESSES_KEY, list);
  return list;
}

export async function deleteAddress(id: string): Promise<Address[]> {
  let list = (await listAddresses()).filter((a) => a.id !== id);
  if (list.length && !list.some((a) => a.isDefault)) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
  write(ADDRESSES_KEY, list);
  return list;
}
