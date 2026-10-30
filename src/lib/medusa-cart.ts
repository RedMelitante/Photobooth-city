// Mirrors the local cart (src/lib/cart.ts) into a Medusa cart. The local
// cart stays the UI's source of truth so updates are instant; each change is
// queued here and reconciled against the backend in order.
import { PROMO } from './commerce';
import { getRegionId, medusa, MedusaError } from './medusa';
import type { CartLine } from './types';

const CART_ID_KEY = 'pbc.medusa.cart';

type ConflictHandler = (variantId: string, acceptedQuantity: number) => void;
let conflictHandler: ConflictHandler = () => {};
/** cart.ts registers here to hear about quantities the backend refused. */
export function onStockConflict(fn: ConflictHandler) {
  conflictHandler = fn;
}

const isStockError = (e: unknown) => e instanceof MedusaError && /inventory|stock|quantity/i.test(e.message);

interface MCart {
  id: string;
  completed_at: string | null;
  item_subtotal: number;
  items: { id: string; variant_id: string; quantity: number }[];
  promotions: { code: string }[];
}

const CART_FIELDS = 'id,completed_at,item_subtotal,*items,*promotions';

function storedId(): string | null {
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string | null) {
  try {
    if (id) localStorage.setItem(CART_ID_KEY, id);
    else localStorage.removeItem(CART_ID_KEY);
  } catch {
    /* ignore */
  }
}

async function getOrCreateCart(): Promise<MCart> {
  const id = storedId();
  if (id) {
    try {
      const { cart } = await medusa<{ cart: MCart }>(`/store/carts/${id}`, { query: { fields: CART_FIELDS } });
      if (!cart.completed_at) return cart;
    } catch (e) {
      if (!(e instanceof MedusaError) || e.status !== 404) throw e;
    }
  }
  const { cart } = await medusa<{ cart: MCart }>('/store/carts', {
    body: { region_id: await getRegionId() },
    query: { fields: CART_FIELDS },
  });
  storeId(cart.id);
  return cart;
}

async function reconcile(lines: CartLine[], code: string | null): Promise<string> {
  let cart = await getOrCreateCart();
  const path = `/store/carts/${cart.id}`;
  const q = { fields: CART_FIELDS };
  const want = new Map(lines.map((l) => [l.id, l.quantity]));

  for (const item of cart.items) {
    const qty = want.get(item.variant_id);
    if (qty === undefined) {
      await medusa(`${path}/line-items/${item.id}`, { method: 'DELETE' });
    } else if (qty !== item.quantity) {
      try {
        ({ cart } = await medusa<{ cart: MCart }>(`${path}/line-items/${item.id}`, { body: { quantity: qty }, query: q }));
      } catch (e) {
        if (!isStockError(e)) throw e;
        conflictHandler(item.variant_id, item.quantity);
      }
    }
  }
  const have = new Set(cart.items.map((i) => i.variant_id));
  for (const l of lines) {
    if (!have.has(l.id)) {
      // Largest quantity the backend accepts, down from what was asked.
      let accepted = 0;
      for (let n = l.quantity; n >= 1 && !accepted; n--) {
        try {
          ({ cart } = await medusa<{ cart: MCart }>(`${path}/line-items`, { body: { variant_id: l.id, quantity: n }, query: q }));
          accepted = n;
        } catch (e) {
          if (!isStockError(e)) throw e;
        }
      }
      if (accepted !== l.quantity) conflictHandler(l.id, accepted);
    }
  }
  ({ cart } = await medusa<{ cart: MCart }>(path, { query: q }));

  // The customer's saved code applies once the order qualifies (Medusa drops
  // it again on its own if the subtotal falls below the minimum).
  const applied = cart.promotions.some((p) => p.code === PROMO.code);
  const eligible = cart.item_subtotal * 100 >= PROMO.minSubtotal;
  if (code && eligible && !applied) {
    await medusa(`${path}/promotions`, { body: { promo_codes: [code] } });
  } else if (applied && !code) {
    await medusa(`${path}/promotions`, { method: 'DELETE', body: { promo_codes: [PROMO.code] } });
  }
  return cart.id;
}

let queue: Promise<string | null> = Promise.resolve(null);

/** Queue a reconcile of the given cart state; resolves to the Medusa cart id. */
export function syncMedusaCart(lines: CartLine[], code: string | null): Promise<string | null> {
  queue = queue
    .catch(() => null)
    .then(() => reconcile(lines, code))
    .catch((e) => {
      console.warn('[cart] Medusa sync failed', e);
      return null;
    });
  return queue;
}

/** Wait for pending syncs, then return the cart id (syncing once more if needed). */
export async function flushMedusaCart(lines: CartLine[], code: string | null): Promise<string> {
  await queue.catch(() => null);
  const id = await reconcile(lines, code);
  return id;
}

/** After an order is placed the cart is spent; the next change starts a new one. */
export function forgetMedusaCart() {
  storeId(null);
}

/** Attach the current guest cart to the customer who just logged in. */
export async function transferMedusaCart(): Promise<void> {
  const id = storedId();
  if (!id) return;
  try {
    await medusa(`/store/carts/${id}/customer`, { method: 'POST' });
  } catch {
    /* cart already completed or owned: a fresh one is created on next change */
  }
}
