// Customer accounts on Medusa v2 (emailpass auth + Store API). account.ts
// delegates here when Medusa is configured; shapes match account.ts.
import type { Address, Customer, Order, OrderStatus, Result } from './account';
import { STORE } from './commerce';
import { transferMedusaCart } from './medusa-cart';
import { fromMedusaProvince, medusa, MedusaError, setAuthToken, toCents, toMedusaAddress } from './medusa';

interface MCustomer {
  email: string;
  first_name: string | null;
  last_name: string | null;
  metadata: Record<string, unknown> | null;
}

interface MAddress {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address_1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string | null;
  is_default_shipping: boolean;
}

const toCustomer = (c: MCustomer): Customer => ({
  email: c.email,
  firstName: c.first_name ?? '',
  lastName: c.last_name ?? '',
  acceptsMarketing: c.metadata?.accepts_marketing !== false,
});

const toAddress = (a: MAddress): Address => ({
  id: a.id,
  firstName: a.first_name ?? '',
  lastName: a.last_name ?? '',
  company: a.company ?? '',
  address1: a.address_1 ?? '',
  city: a.city ?? '',
  province: fromMedusaProvince(a.province, a.country_code),
  postalCode: a.postal_code ?? '',
  country: a.country_code === 'pr' ? 'Puerto Rico' : 'United States',
  isDefault: a.is_default_shipping,
});

async function authenticate(email: string, password: string): Promise<string> {
  const { token } = await medusa<{ token: string }>('/auth/customer/emailpass', { body: { email, password }, auth: false });
  setAuthToken(token);
  await transferMedusaCart();
  return token;
}

export async function login(email: string, password: string): Promise<Result<Customer>> {
  try {
    await authenticate(email.trim(), password);
    const c = await getCustomer();
    if (!c) return { ok: false, error: 'We couldn’t find a customer account for this login.', field: 'email' };
    return { ok: true, data: c };
  } catch (e) {
    if (e instanceof MedusaError && e.status === 401) {
      return { ok: false, error: 'Incorrect email or password.', field: 'password' };
    }
    return { ok: false, error: 'We couldn’t log you in right now. Try again in a moment.' };
  }
}

export async function register(input: { firstName: string; lastName: string; email: string; password: string; acceptsMarketing: boolean }): Promise<Result<Customer>> {
  const email = input.email.trim();
  try {
    const { token } = await medusa<{ token: string }>('/auth/customer/emailpass/register', {
      body: { email, password: input.password },
      auth: false,
    });
    await medusa('/store/customers', {
      body: {
        email,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        metadata: { accepts_marketing: input.acceptsMarketing },
      },
      auth: token,
    });
    return login(email, input.password);
  } catch (e) {
    if (e instanceof MedusaError && (e.status === 401 || /exist/i.test(e.message))) {
      return { ok: false, error: 'An account with this email already exists. Log in instead.', field: 'email' };
    }
    return { ok: false, error: 'We couldn’t create your account right now. Try again in a moment.' };
  }
}

export async function reset(email: string): Promise<Result<null>> {
  try {
    await medusa('/auth/customer/emailpass/reset-password', { body: { identifier: email.trim() }, auth: false });
  } catch {
    /* same answer either way: no account enumeration */
  }
  return { ok: true, data: null };
}

export async function logout(): Promise<void> {
  setAuthToken(null);
}

export async function getCustomer(): Promise<Customer | null> {
  try {
    const { customer } = await medusa<{ customer: MCustomer }>('/store/customers/me');
    return toCustomer(customer);
  } catch (e) {
    if (e instanceof MedusaError && e.status === 401) setAuthToken(null);
    return null;
  }
}

export async function updateCustomer(patch: Partial<Customer>): Promise<Result<Customer>> {
  const current = await getCustomer();
  if (!current) return { ok: false, error: 'Your session has ended. Log in again.' };
  if (patch.email && patch.email.trim().toLowerCase() !== current.email.toLowerCase()) {
    return { ok: false, error: `To change your login email, contact us at ${STORE.email}.`, field: 'email' };
  }
  const { customer } = await medusa<{ customer: MCustomer }>('/store/customers/me', {
    body: {
      first_name: patch.firstName ?? current.firstName,
      last_name: patch.lastName ?? current.lastName,
      metadata: { accepts_marketing: patch.acceptsMarketing ?? current.acceptsMarketing },
    },
  });
  return { ok: true, data: toCustomer(customer) };
}

const STATUS: Record<string, [OrderStatus, string, number]> = {
  delivered: ['delivered', 'Delivered', 3],
  shipped: ['shipped', 'Shipped', 2],
  partially_shipped: ['shipped', 'Partially shipped', 2],
  partially_delivered: ['shipped', 'Partially delivered', 2],
};

export async function listOrders(): Promise<Order[]> {
  try {
    const { orders } = await medusa<{ orders: any[] }>('/store/orders', {
      query: {
        fields: 'id,display_id,created_at,total,fulfillment_status,*items,*fulfillments,*fulfillments.labels',
        order: '-created_at',
        limit: 50,
      },
    });
    return orders.map((o) => {
      const [status, statusLabel, step] = STATUS[o.fulfillment_status] ?? ['processing', 'Processing', 1];
      const label = (o.fulfillments ?? []).flatMap((f: any) => f.labels ?? []).find((l: any) => l.tracking_url);
      return {
        id: o.id,
        displayId: `${STORE.orderPrefix}${o.display_id}`,
        createdAt: o.created_at,
        status,
        statusLabel,
        step,
        total: toCents(o.total),
        itemCount: o.items.reduce((a: number, i: any) => a + i.quantity, 0),
        trackingUrl: label?.tracking_url,
        lines: o.items.map((i: any) => ({
          title: i.product_title ?? i.title,
          variantTitle: i.variant_title && i.variant_title !== 'Default Title' ? i.variant_title : '',
          handle: i.product_handle ?? '',
          variantId: i.variant_id ?? '',
          image: i.thumbnail ?? '',
          unitPrice: toCents(i.unit_price),
          quantity: i.quantity,
        })),
      };
    });
  } catch {
    return [];
  }
}

export async function listAddresses(): Promise<Address[]> {
  try {
    const { addresses } = await medusa<{ addresses: MAddress[] }>('/store/customers/me/addresses', { query: { limit: 50 } });
    return addresses.map(toAddress);
  } catch {
    return [];
  }
}

export async function saveAddress(addr: Omit<Address, 'id'> & { id?: string }): Promise<Address[]> {
  const body = {
    first_name: addr.firstName,
    last_name: addr.lastName,
    company: addr.company || undefined,
    address_1: addr.address1,
    city: addr.city,
    postal_code: addr.postalCode,
    is_default_shipping: addr.isDefault,
    is_default_billing: addr.isDefault,
    ...toMedusaAddress({ state: addr.province }),
  };
  const path = addr.id ? `/store/customers/me/addresses/${addr.id}` : '/store/customers/me/addresses';
  await medusa(path, { body });
  return listAddresses();
}

export async function deleteAddress(id: string): Promise<Address[]> {
  await medusa(`/store/customers/me/addresses/${id}`, { method: 'DELETE' });
  return listAddresses();
}
