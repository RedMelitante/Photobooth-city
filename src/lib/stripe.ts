import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import { medusaEnabled } from './medusa';

const KEY = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/** Real payments: Stripe's Payment Element through Medusa's Stripe provider. */
export const stripeEnabled = medusaEnabled && !!KEY;

let promise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  promise ??= loadStripe(KEY);
  return promise;
}

/** Payment Element styled with the storefront's design tokens. */
export const STRIPE_APPEARANCE: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#1F3FD1',
    colorText: '#141B2D',
    colorTextSecondary: '#394257',
    colorTextPlaceholder: '#5B6376',
    colorDanger: '#C2183B',
    colorBackground: '#FFFFFF',
    fontFamily: 'Manrope, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSizeBase: '16px',
    borderRadius: '10px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1.5px solid #CDD1D9', boxShadow: 'none', padding: '14px' },
    '.Input:focus': { borderColor: '#1F3FD1', boxShadow: '0 0 0 4px #DDE4FF' },
    '.Label': { fontSize: '13px', fontWeight: '700', color: '#141B2D' },
    '.Tab': { border: '2px solid #E4E6EB', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#1F3FD1', color: '#1F3FD1' },
  },
};

export const STRIPE_FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap' }];

/** Stripe payment method type -> the name customers know. */
export function methodLabel(type: string | undefined): string {
  switch (type) {
    case 'affirm':
      return 'Affirm';
    case 'klarna':
      return 'Klarna';
    case 'apple_pay':
      return 'Apple Pay';
    case 'google_pay':
      return 'Google Pay';
    case 'link':
      return 'Link';
    default:
      return 'Card';
  }
}
