import { medusaEnabled } from './medusa';

/**
 * Braintree (cards + PayPal in one Drop-in) through the backend's Braintree
 * provider. Turned on with PUBLIC_BRAINTREE_ENABLED=true once the backend has
 * its BRAINTREE_* keys; it then replaces the Stripe / PayPal payment options.
 */
export const braintreeEnabled = medusaEnabled && import.meta.env.PUBLIC_BRAINTREE_ENABLED === 'true';

/**
 * PayPal inside the Drop-in. Needs a PayPal account linked in the Braintree control
 * panel (Settings → Processing → PayPal) or the button shows a developer error, so it
 * stays off until PUBLIC_BRAINTREE_PAYPAL=true.
 */
export const braintreePayPal = braintreeEnabled && import.meta.env.PUBLIC_BRAINTREE_PAYPAL === 'true';

export const BRAINTREE_PROVIDER = 'pp_braintree_braintree';

export interface DropinInstance {
  requestPaymentMethod: () => Promise<{ nonce: string; type: string; details?: Record<string, unknown>; deviceData?: string }>;
  isPaymentMethodRequestable: () => boolean;
  clearSelectedPaymentMethod: () => void;
  on: (event: 'paymentMethodRequestable' | 'noPaymentMethodRequestable' | 'paymentOptionSelected', cb: (e: unknown) => void) => void;
  teardown: () => Promise<void>;
}
interface DropinNamespace {
  create: (opts: Record<string, unknown>) => Promise<DropinInstance>;
}

const DROPIN_SRC = 'https://js.braintreegateway.com/web/dropin/1.44.1/js/dropin.min.js';
let sdk: Promise<DropinNamespace> | null = null;

export function loadDropin(): Promise<DropinNamespace> {
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = DROPIN_SRC;
    s.async = true;
    s.onload = () => {
      const ns = (window as unknown as { braintree?: { dropin?: DropinNamespace } }).braintree?.dropin;
      if (ns) resolve(ns);
      else reject(new Error('Braintree did not load'));
    };
    s.onerror = () => {
      sdk = null;
      reject(new Error('Braintree could not load'));
    };
    document.head.appendChild(s);
  });
  return sdk;
}
