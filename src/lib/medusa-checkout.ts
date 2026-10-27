// Places the order in Medusa: contact + address -> shipping method ->
// payment session -> complete. Card details never reach this code; with
// Stripe configured the Payment Element confirms the PaymentIntent before
// `completeOrder()` runs (see README, "Stripe").
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

export class CheckoutError extends Error {}

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

export async function completeOrder(input: { email: string; address: OrderAddress; shipping: string }): Promise<PlacedOrder> {
  try {
    const cartId = await backendCartId();
    const path = `/store/carts/${cartId}`;
    const address = medusaAddress(input.address);
    await medusa(path, { body: { email: input.email, shipping_address: address, billing_address: address } });

    const option = await chooseShipping(cartId, input.shipping);
    await medusa(`${path}/shipping-methods`, { body: { option_id: option.id } });

    const { payment_collection } = await medusa<{ payment_collection: { id: string } }>('/store/payment-collections', {
      body: { cart_id: cartId },
    });
    await medusa(`/store/payment-collections/${payment_collection.id}/payment-sessions`, {
      body: { provider_id: paymentProviderId },
    });

    const res = await medusa<{ type: 'order' | 'cart'; order?: any; error?: { message: string } }>(`${path}/complete`, { method: 'POST' });
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
      shipName: option.name,
    };
  } catch (e) {
    if (e instanceof CheckoutError) throw e;
    if (e instanceof MedusaError && /inventory|stock/i.test(e.message)) {
      throw new CheckoutError('Something in your cart just sold out. Review your cart and try again.');
    }
    throw new CheckoutError(`We couldn't place your order (${(e as Error).message}). Nothing was charged.`);
  }
}
