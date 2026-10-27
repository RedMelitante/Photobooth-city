// Client cart. Lines live in localStorage so the static site works on its
// own; every mutation goes through `sync()`, the single place a Medusa
// backend plugs in (POST /store/carts/:id/line-items etc.). Updates are
// optimistic: UI state changes first, the backend reconciles after.
import { atom, computed } from 'nanostores';
import type { CartLine } from './types';
import { promoState } from './commerce';

const KEY = 'pbc.cart.v1';

interface CartState {
  lines: CartLine[];
  /** promo code saved by the customer (applies once eligible) */
  code: string | null;
}

function load(): CartState {
  if (typeof localStorage === 'undefined') return { lines: [], code: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as CartState;
  } catch {
    /* private mode / corrupted */
  }
  return { lines: [], code: null };
}

export const $cart = atom<CartState>({ lines: [], code: null });
export const $cartOpen = atom(false);
export const $hydrated = atom(false);

if (typeof window !== 'undefined') {
  $cart.set(load());
  $hydrated.set(true);
  $cart.listen((s) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  });
  // keep tabs in step
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) $cart.set(load());
  });
}

export const $count = computed($cart, (s) => s.lines.reduce((a, l) => a + l.quantity, 0));
export const $subtotal = computed($cart, (s) => s.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0));
export const $promo = computed([$subtotal, $cart], (sub, s) => promoState(sub, !!s.code));

async function sync(_state: CartState): Promise<void> {
  // Medusa: mirror lines + promo code to the backend cart here.
}

function commit(next: CartState) {
  $cart.set(next);
  void sync(next);
}

export function addLine(line: Omit<CartLine, 'quantity'>, quantity = 1, open = true) {
  const s = $cart.get();
  const existing = s.lines.find((l) => l.id === line.id);
  const lines = existing
    ? s.lines.map((l) => (l.id === line.id ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l))
    : [...s.lines, { ...line, quantity }];
  commit({ ...s, lines });
  if (open) $cartOpen.set(true);
}

export function setQuantity(id: string, quantity: number) {
  const s = $cart.get();
  const q = Math.max(0, Math.min(20, quantity));
  commit({ ...s, lines: q === 0 ? s.lines.filter((l) => l.id !== id) : s.lines.map((l) => (l.id === id ? { ...l, quantity: q } : l)) });
}

export function removeLine(id: string) {
  setQuantity(id, 0);
}

export function saveCode(code: string | null) {
  commit({ ...$cart.get(), code });
}

export function clearCart() {
  commit({ lines: [], code: null });
}

export function openCart() {
  $cartOpen.set(true);
}

export function closeCart() {
  $cartOpen.set(false);
}
