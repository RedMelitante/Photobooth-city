// Store rules copied from the Shopify store (see the design's admin boards):
// FLASHSALE2026, Economy shipping tiers, California-only tax, US-only region.
// The Medusa backend holds the real rules (backend/apps/backend/src/lib/store-config.ts
// seeds Promotions, Shipping Options and Tax Regions); this mirror lets totals
// render before the API answers. Change both together.

export const PROMO = {
  code: 'FLASHSALE2026',
  percent: 7,
  /** cents */
  minSubtotal: 350_000,
} as const;

export function isPromoCode(code: string): boolean {
  return code.trim().toUpperCase() === PROMO.code;
}

export interface PromoState {
  /** discount actually applied, cents */
  discount: number;
  /** code saved but subtotal below the minimum */
  pending: boolean;
  applied: boolean;
  /** cents still needed to unlock */
  needed: number;
  /** 0–100 progress toward the minimum */
  progress: number;
}

export function promoState(subtotal: number, codeSaved: boolean): PromoState {
  const eligible = subtotal >= PROMO.minSubtotal;
  const applied = codeSaved && eligible;
  return {
    applied,
    pending: codeSaved && !eligible && subtotal > 0,
    discount: applied ? Math.round((subtotal * PROMO.percent) / 100) : 0,
    needed: Math.max(0, PROMO.minSubtotal - subtotal),
    progress: Math.min(100, Math.round((subtotal / PROMO.minSubtotal) * 100)),
  };
}

/** Economy · 5–8 business days, contiguous US, priced by order value. */
export function economyRate(subtotal: number): number {
  const dollars = subtotal / 100;
  if (dollars <= 50) return 2_000;
  if (dollars < 500) return 5_000;
  if (dollars <= 1_800) return 10_000;
  return 20_000;
}

export interface ShippingOption {
  id: 'economy' | 'ups';
  name: string;
  detail: string;
  /** cents, null = live carrier rate */
  amount: number | null;
}

export function shippingOptions(subtotal: number, state: string): ShippingOption[] {
  const remote = ['HI', 'AK', 'PR'].includes(state);
  const ups: ShippingOption = {
    id: 'ups',
    name: remote ? 'UPS + USPS' : 'UPS',
    detail: 'Live UPS rates for your address, including faster services',
    amount: null,
  };
  if (remote) return [ups];
  return [{ id: 'economy', name: 'Economy', detail: '5–8 business days', amount: economyRate(subtotal) }, ups];
}

/**
 * Sales tax is collected in California only (Stripe Tax on the live store).
 * The rate here is an estimate for display; the backend's tax provider
 * returns the exact amount for the address.
 */
export const CA_ESTIMATED_RATE = 0.0875;

export function estimateTax(taxable: number, state: string): number {
  return state === 'CA' ? Math.round(taxable * CA_ESTIMATED_RATE) : 0;
}

export const US_STATES: [string, string][] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
  ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['PR', 'Puerto Rico'],
  ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
  ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

export const STORE = {
  name: 'Photobooth City',
  phone: '1 (888) 312-4449',
  phoneHref: 'tel:18883124449',
  email: 'info@photoboothcity.com',
  hours: 'Mon–Fri, 10 AM–6 PM (PT)',
  address: '3827 Wacker Dr., Mira Loma CA 91752',
  orderPrefix: '#PBC',
} as const;
