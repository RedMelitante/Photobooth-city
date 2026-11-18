import { medusaEnabled } from './medusa';

/** Public PayPal REST app client id (sandbox or live). The secret lives only on the backend. */
export const paypalClientId: string = import.meta.env.PUBLIC_PAYPAL_CLIENT_ID ?? '';

/** PayPal Checkout through the backend's PayPal provider (pp_paypal_paypal). */
export const paypalEnabled = medusaEnabled && !!paypalClientId;

export const PAYPAL_PROVIDER = 'pp_paypal_paypal';

export interface PayPalButtonsInstance {
  render: (el: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
  isEligible: () => boolean;
}
export interface PayPalNamespace {
  Buttons: (opts: {
    style?: Record<string, unknown>;
    fundingSource?: string;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsInstance;
}

let sdk: Promise<PayPalNamespace> | null = null;

/** Loads PayPal's JS SDK once (intent=authorize matches the backend's AUTHORIZE orders). */
export function loadPayPal(): Promise<PayPalNamespace> {
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const q = new URLSearchParams({
      'client-id': paypalClientId,
      currency: 'USD',
      intent: 'authorize',
      components: 'buttons',
      // Cards go through Stripe on this site; PayPal shows PayPal (and Pay Later / Venmo where eligible).
      'disable-funding': 'card',
    });
    s.src = `https://www.paypal.com/sdk/js?${q}`;
    s.async = true;
    s.dataset.namespace = 'paypal';
    s.onload = () => {
      const pp = (window as unknown as { paypal?: PayPalNamespace }).paypal;
      if (pp) resolve(pp);
      else reject(new Error('PayPal did not load'));
    };
    s.onerror = () => {
      sdk = null;
      reject(new Error('PayPal could not load'));
    };
    document.head.appendChild(s);
  });
  return sdk;
}
