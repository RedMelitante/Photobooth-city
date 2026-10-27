/**
 * Store rules copied from Shopify (Oct 27, 2026). The storefront mirrors
 * these in src/lib/commerce.ts so totals render before the API answers;
 * change both together.
 */

export const STORE_DETAILS = {
  name: "Photobooth City",
  storefront_url: "https://photoboothcity.com",
  support_phone: "1 (888) 312-4449",
  support_email: "info@photoboothcity.com",
  support_hours: "Mon–Fri, 10 AM–6 PM (PT)",
  address: "3827 Wacker Dr., Mira Loma CA 91752, United States",
  order_prefix: "#PBC",
}

/** FLASHSALE2026: 7% off orders with a $3,500+ item subtotal. */
export const FLASH_SALE = {
  code: "FLASHSALE2026",
  percent: 7,
  minSubtotal: 3500,
}

type Rule = { attribute: string; operator: "gt" | "gte" | "lt" | "lte" | "eq"; value: number }

/**
 * Economy · 5–8 business days, contiguous US:
 * $0–50 $20 · $51–499 $50 · $500–1,800 $100 · $1,800+ $200
 */
export const ECONOMY_TIERS: { amount: number; rules?: Rule[] }[] = [
  { amount: 20 },
  {
    amount: 50,
    rules: [
      { attribute: "item_total", operator: "gt", value: 50 },
      { attribute: "item_total", operator: "lt", value: 500 },
    ],
  },
  {
    amount: 100,
    rules: [
      { attribute: "item_total", operator: "gte", value: 500 },
      { attribute: "item_total", operator: "lte", value: 1800 },
    ],
  },
  {
    amount: 200,
    rules: [
      { attribute: "item_total", operator: "gt", value: 1800 },
      { attribute: "item_total", operator: "lt", value: 100000000 },
    ],
  },
]

/**
 * California sales tax. Shopify collects tax in California only. This is
 * the Mira Loma (Jurupa Valley) combined rate; for destination-based rates,
 * install a tax provider (e.g. Stripe Tax) on the US tax region.
 */
export const CA_TAX_RATE = 8.75

/** 48 contiguous states + DC (Economy ships here; HI/AK/PR use carrier rates). */
export const CONTIGUOUS_STATES = [
  "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
  "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

/** Starting stock for each available variant (Shopify doesn't track these). */
export const STOCK_PER_AVAILABLE_VARIANT = 25
