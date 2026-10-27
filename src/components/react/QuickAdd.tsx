import { useState } from 'react';
import Icon from './Icon';
import { addLine } from '@/lib/cart';
import type { CartLine } from '@/lib/types';

/** Single-variant items add straight to the cart and open the drawer. */
export default function QuickAdd({ line }: { line: Omit<CartLine, 'quantity'> }) {
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        addLine(line);
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
      }}
      className={
        'flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-bold text-white transition-colors duration-150 ' +
        (added ? 'bg-success-700' : 'bg-brand-600 hover:bg-brand-700')
      }
    >
      {added && <Icon name="check" size={16} stroke={2.6} />}
      {added ? 'Added to cart' : 'Quick add'}
    </button>
  );
}
