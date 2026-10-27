// Medusa v2 Store API client. Everything Medusa-specific in the storefront
// goes through here. When PUBLIC_MEDUSA_BACKEND_URL is unset the site runs on
// the bundled catalog and local adapters instead (see README).

const BASE = (import.meta.env.PUBLIC_MEDUSA_BACKEND_URL ?? '').replace(/\/$/, '');
const KEY = import.meta.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';

export const medusaEnabled = !!(BASE && KEY);

/** Stripe is used when the storefront has a publishable key; otherwise Medusa's system provider (dev). */
export const paymentProviderId = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'pp_stripe_stripe' : 'pp_system_default';

const TOKEN_KEY = 'pbc.medusa.token';

export function authToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class MedusaError extends Error {
  constructor(
    public status: number,
    message: string,
    public type?: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** send the customer's bearer token (default: when one exists) */
  auth?: boolean | string;
}

export async function medusa<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!BASE) throw new MedusaError(0, 'Medusa backend is not configured');
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { 'x-publishable-api-key': KEY };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const token = typeof opts.auth === 'string' ? opts.auth : opts.auth !== false && typeof window !== 'undefined' ? authToken() : null;
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new MedusaError(res.status, data.message ?? res.statusText, data.type);
  return data as T;
}

/** "CA" -> "us-ca"; Puerto Rico is its own country in Medusa. */
export function toMedusaAddress(a: { state: string; country?: string }) {
  if (a.state === 'PR') return { country_code: 'pr', province: undefined };
  return { country_code: 'us', province: a.state ? `us-${a.state.toLowerCase()}` : undefined };
}

/** "us-ca" -> "CA" */
export function fromMedusaProvince(province?: string | null, country?: string | null): string {
  if (country === 'pr') return 'PR';
  return (province ?? '').replace(/^us-/i, '').toUpperCase();
}

let regionId: string | null = null;

/** The store has one region (United States + Puerto Rico, USD). */
export async function getRegionId(): Promise<string> {
  if (regionId) return regionId;
  const configured = import.meta.env.PUBLIC_MEDUSA_REGION_ID;
  if (configured) return (regionId = configured);
  const { regions } = await medusa<{ regions: { id: string }[] }>('/store/regions', { query: { limit: 1 } });
  if (!regions[0]) throw new MedusaError(0, 'No region configured in Medusa');
  return (regionId = regions[0].id);
}

/** Medusa amounts are decimal dollars; the storefront works in integer cents. */
export const toCents = (amount: number | null | undefined) => Math.round((amount ?? 0) * 100);
