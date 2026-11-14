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
    colorPrimary: '#295862',
    colorText: '#111416',
    colorTextSecondary: '#515C61',
    colorTextPlaceholder: '#5A666B',
    colorDanger: '#C2183B',
    colorBackground: '#FFFFFF',
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '5px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #CBD3D2', boxShadow: 'none', padding: '14px' },
    '.Input:focus': { borderColor: '#138A93', boxShadow: '0 0 0 3px rgba(19, 138, 147, 0.25)' },
    '.Label': { fontSize: '13px', fontWeight: '700', color: '#111416' },
    '.Tab': { border: '1px solid #DCE1DF', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#295862', color: '#295862' },
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
