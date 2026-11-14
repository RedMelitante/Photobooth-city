import { useState } from 'react';
import Icon from './Icon';
import { addLine } from '@/lib/cart';
import type { CartLine } from '@/lib/types';

/** Single-variant items add straight to the cart and open the drawer. */
export default function QuickAdd({ line, block = false }: { line: Omit<CartLine, 'quantity'>; block?: boolean }) {
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
        'flex items-center justify-center gap-1.5 font-extrabold transition-colors duration-150 ' +
        (block ? 'h-11 w-full rounded-md text-sm ' : 'h-[34px] rounded-sm px-3 text-xs ') +
        (added ? 'bg-success-700 text-white' : 'bg-cyan-400 text-ink-950 hover:bg-cyan-300')
      }
    >
      {added && <Icon name="check" size={14} stroke={2.6} />}
      {added ? 'Added' : 'Quick add'}
    </button>
  );
}
