// Payment adapter for the checkout island — a MOCK.
//
// The UI mirrors Stripe's Payment Element (Card, Apple Pay, Google Pay,
// PayPal, Pay later via Affirm / Klarna), but nothing here talks to Stripe.
// Replace the bodies of `confirmPayment()` and `retrievePaymentIntent()` with
// the real integration:
//   1. Medusa: POST /store/payment-collections + initiate the Stripe session
//      for the cart → returns the PaymentIntent client_secret.
//   2. Stripe.js: `stripe.confirmPayment({ elements, confirmParams: { return_url } })`.
//      Cards resolve in place; Affirm / Klarna / 3-D Secure leave the site
//      and come back to /checkout/return?payment_intent=…&redirect_status=….
//   3. Medusa: POST /store/carts/:id/complete (idempotent) → order.
// The shapes below are what the UI needs from that flow.

export type PayMethod = 'Card' | 'Apple Pay' | 'Google Pay' | 'PayPal' | 'Pay later';

// Only cards until the other methods are connected through Stripe and tested.
export const PAY_METHODS: PayMethod[] = ['Card'];

export interface CardInput {
  /** digits only */
  number: string;
  /** "MM / YY" */
  expiry: string;
  cvc: string;
  zip: string;
}

export interface ConfirmPaymentInput {
  method: PayMethod;
  /** cents */
  amount: number;
  email: string;
  card?: CardInput;
  /** pay-later provider (Stripe's affirm / klarna payment method types) */
  provider?: 'Affirm' | 'Klarna';
}

export type ConfirmPaymentResult =
  | { status: 'succeeded'; paymentIntent: string; label: string }
  | { status: 'declined'; code: 'card_declined'; message: string }
  | { status: 'redirect'; paymentIntent: string; url: string };

/** Stripe's "generic decline" test card. */
export const DECLINE_TEST_CARD = '4000000000000002';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mockIntent = () => `pi_mock_${Math.random().toString(36).slice(2, 10)}`;

export function cardBrand(digits: string): 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Card' {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  return 'Card';
}

/** Simulates `stripe.confirmPayment()`; always succeeds except the decline test card. */
export async function confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  await wait(900);
  if (input.method === 'Pay later') {
    const provider = input.provider ?? 'Affirm';
    // Real flow: Stripe redirects to the provider, which returns here.
    return {
      status: 'redirect',
      paymentIntent: 'pi_mock',
      url: `/checkout/return?payment_intent=pi_mock&redirect_status=succeeded&provider=${provider}`,
    };
  }
  if (input.method === 'Card') {
    const digits = (input.card?.number ?? '').replace(/\D/g, '');
    if (digits === DECLINE_TEST_CARD) {
      return { status: 'declined', code: 'card_declined', message: 'Your card was declined.' };
    }
    return { status: 'succeeded', paymentIntent: mockIntent(), label: `${cardBrand(digits) === 'Card' ? 'Card' : cardBrand(digits)} ending in ${digits.slice(-4)}` };
  }
  return { status: 'succeeded', paymentIntent: mockIntent(), label: input.method };
}

export type IntentStatus = 'succeeded' | 'requires_capture' | 'processing' | 'requires_payment_method' | 'canceled';

/**
 * Simulates `stripe.retrievePaymentIntent(clientSecret)` on the return page.
 * The mock answers from the `redirect_status` Stripe appends to the URL;
 * `redirect_status=processing` never settles so the slow path can be seen.
 */
export async function retrievePaymentIntent(_id: string, redirectStatus: string | null): Promise<IntentStatus> {
  await wait(1200);
  switch (redirectStatus) {
    case 'succeeded':
      return 'succeeded';
    case 'failed':
      return 'requires_payment_method';
    case 'canceled':
      return 'canceled';
    default:
      return new Promise(() => {}); // still processing; the webhook would finish the order
  }
}
