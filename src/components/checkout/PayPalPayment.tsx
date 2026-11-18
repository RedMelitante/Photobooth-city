import { useEffect, useRef, useState } from 'react';
import { loadPayPal } from '@/lib/paypal';
import { DeclinedAlert, Spinner } from './ui';
import type { Declined } from './PaymentStep';

interface Props {
  /** PayPal order created by the backend for this cart's total */
  orderId: string;
  /** buyer approved in PayPal: complete the Medusa cart (authorizes the order) */
  onApproved: () => Promise<void>;
  declined: Declined;
  paying: boolean;
  setPaying: (v: boolean) => void;
}

/** PayPal's own buttons for the backend's order. Approval opens PayPal in a popup. */
export default function PayPalPayment({ orderId, onApproved, declined, paying, setPaying }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    let live = true;
    let buttons: { close: () => Promise<void> } | null = null;
    setReady(false);
    setError(null);
    loadPayPal()
      .then((paypal) => {
        if (!live || !mount.current) return;
        mount.current.innerHTML = '';
        const b = paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
          createOrder: async () => orderId,
          onApprove: async () => {
            setCancelled(false);
            setPaying(true);
            await onApproved();
          },
          onCancel: () => setCancelled(true),
          onError: () => {
            setPaying(false);
            setError('PayPal couldn’t finish the payment. No money was taken; try again or pay by card.');
          },
        });
        buttons = b;
        return b.render(mount.current).then(() => live && setReady(true));
      })
      .catch(() => live && setError('PayPal couldn’t load. Check your connection, or pay by card.'));
    return () => {
      live = false;
      void buttons?.close().catch(() => {});
    };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3.5">
      {declined?.kind === 'error' && <DeclinedAlert>{declined.message}</DeclinedAlert>}
      {error && <DeclinedAlert>{error}</DeclinedAlert>}
      <p className="m-0 text-sm leading-5 text-ink-700">
        {cancelled ? 'You closed PayPal before paying. Your cart is saved; choose PayPal again when you’re ready.' : 'You’ll log in to PayPal in a pop-up window to approve the payment, then come back here to your confirmation.'}
      </p>
      <div className="relative min-h-[56px]">
        <div ref={mount} aria-busy={!ready} className={paying ? 'pointer-events-none opacity-50' : ''} />
        {(!ready || paying) && !error && (
          <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label={paying ? 'Placing your order' : 'Loading PayPal'}>
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
}
