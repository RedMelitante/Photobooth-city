// Places the order in Medusa: contact + address -> shipping method ->
// payment session -> complete.
//
// With Stripe (PUBLIC_STRIPE_PUBLISHABLE_KEY set) checkout runs in two halves:
// `prepareCheckout()` when the payment step opens (returns the PaymentIntent
// client secret for the Payment Element), then `completeCart()` once Stripe
// has confirmed the payment, in place or after a redirect (Affirm, Klarna,
// 3-D Secure). Without Stripe, `completeOrder()` does both in one go on
// Medusa's system provider (dev only).
import { backendCartId } from './cart';
import { medusa, MedusaError, paymentProviderId, toCents, toMedusaAddress } from './medusa';
import { STORE } from './commerce';

export interface OrderAddress {
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

export interface PlacedOrder {
  id: string;
  number: string;
  /** cents */
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shipName: string;
}

export interface PreparedCheckout {
  cartId: string;
  shipName: string;
  /** Stripe PaymentIntent client secret (Stripe mode only) */
  clientSecret: string | null;
  /** cents, as Medusa computed it */
  total: number;
}

export class CheckoutError extends Error {}

const CART_KEY = 'pbc.checkout.cart';

function medusaAddress(a: OrderAddress) {
  return {
    first_name: a.firstName,
    last_name: a.lastName,
    company: a.company || undefined,
    address_1: a.line1,
    address_2: a.line2 || undefined,
    city: a.city,
    postal_code: a.zip,
    phone: a.phone || undefined,
    ...toMedusaAddress({ state: a.state }),
  };
}

/** "economy" -> the Medusa option whose type code matches; falls back to the first offered. */
async function chooseShipping(cartId: string, wanted: string) {
  const { shipping_options } = await medusa<{ shipping_options: { id: string; name: string; type?: { code: string } }[] }>(
    '/store/shipping-options',
    { query: { cart_id: cartId } },
  );
  const option = shipping_options.find((o) => o.type?.code === wanted) ?? shipping_options[0];
  if (!option) {
    throw new CheckoutError(`We quote shipping to this address by phone. Call ${STORE.phone} and we'll finish your order.`);
  }
  return option;
}

function friendly(e: unknown): CheckoutError {
  if (e instanceof CheckoutError) return e;
  if (e instanceof MedusaError && /inventory|stock/i.test(e.message)) {
    return new CheckoutError('Something in your cart just sold out. Review your cart and try again.');
  }
  return new CheckoutError(`We couldn't place your order (${(e as Error).message}). Nothing was charged.`);
}

/** Address, shipping method and a payment session on the backend cart. */
export async function prepareCheckout(input: { email: string; address: OrderAddress; shipping: string }): Promise<PreparedCheckout> {
  try {
    const cartId = await backendCartId();
    const path = `/store/carts/${cartId}`;
    const address = medusaAddress(input.address);
    await medusa(path, { body: { email: input.email, shipping_address: address, billing_address: address } });

    const option = await chooseShipping(cartId, input.shipping);
    const { cart } = await medusa<{ cart: { total: number } }>(`${path}/shipping-methods`, { body: { option_id: option.id } });

    const { payment_collection } = await medusa<{ payment_collection: { id: string } }>('/store/payment-collections', {
      body: { cart_id: cartId },
    });
    const session = await medusa<{ payment_collection: { payment_sessions: { provider_id: string; data: { client_secret?: string } }[] } }>(
      `/store/payment-collections/${payment_collection.id}/payment-sessions`,
      { body: { provider_id: paymentProviderId } },
    );
    const s = session.payment_collection.payment_sessions.find((x) => x.provider_id === paymentProviderId);
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify({ cartId, shipName: option.name }));
    } catch {
      /* ignore */
    }
    return { cartId, shipName: option.name, clientSecret: s?.data?.client_secret ?? null, total: toCents(cart.total) };
  } catch (e) {
    throw friendly(e);
  }
}

/**
 * Turns the prepared cart into an order. Safe to call again after a redirect:
 * completing an already-completed cart returns the same order.
 */
export async function completeCart(prepared?: Pick<PreparedCheckout, 'cartId' | 'shipName'>): Promise<PlacedOrder> {
  let ref = prepared;
  if (!ref) {
    try {
      ref = JSON.parse(sessionStorage.getItem(CART_KEY) ?? 'null') ?? undefined;
    } catch {
      /* ignore */
    }
  }
  if (!ref) throw new CheckoutError('Your checkout session expired. Your cart is saved; please try again.');
  try {
    const res = await medusa<{ type: 'order' | 'cart'; order?: any; error?: { message: string } }>(`/store/carts/${ref.cartId}/complete`, {
      method: 'POST',
    });
    if (res.type !== 'order' || !res.order) {
      throw new CheckoutError(res.error?.message ?? 'Your payment could not be completed.');
    }
    const o = res.order;
    return {
      id: o.id,
      number: `${STORE.orderPrefix}${o.display_id}`,
      subtotal: toCents(o.item_subtotal),
      discount: toCents(o.discount_total),
      shipping: toCents(o.shipping_total),
      tax: toCents(o.tax_total),
      total: toCents(o.total),
      shipName: ref.shipName,
    };
  } catch (e) {
    throw friendly(e);
  }
}

/** System provider (no Stripe): prepare and complete in one step. */
export async function completeOrder(input: { email: string; address: OrderAddress; shipping: string }): Promise<PlacedOrder> {
  const prepared = await prepareCheckout(input);
  return completeCart(prepared);
}
