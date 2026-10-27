import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import CartPanel, { type Upsell } from './CartPanel';
import { $cartOpen, closeCart } from '@/lib/cart';

/** Slides in from the right (220 ms); scrim + Esc close; focus moves to the title and is trapped. */
export default function CartDrawer({ upsells }: { upsells: Upsell[] }) {
  const open = useStore($cartOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('#drawer-cart-title')?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      returnFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/55" onClick={closeCart} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-cart-title"
        className="absolute inset-y-0 right-0 w-full max-w-[440px] animate-drawer-in overflow-y-auto bg-surface shadow-drawer"
      >
        <CartPanel upsells={upsells} titleId="drawer-cart-title" />
      </div>
    </div>
  );
}
