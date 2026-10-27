import { useStore } from '@nanostores/react';
import Icon from './Icon';
import { $count, openCart } from '@/lib/cart';
import { useHydrated } from '@/lib/useHydrated';

/** Header cart trigger; links to /cart without JS, opens the drawer with it. */
export default function CartButton({ variant }: { variant: 'desktop' | 'mobile' }) {
  const count = useStore($count);
  const hydrated = useHydrated();
  const n = hydrated ? count : 0;
  const label = `Cart, ${n} ${n === 1 ? 'item' : 'items'}`;
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openCart();
  };

  if (variant === 'mobile') {
    return (
      <a href="/cart" onClick={onClick} aria-label={label} className="relative flex size-11 items-center justify-center rounded-md text-ink-900 hover:text-ink-900">
        <Icon name="bag" size={22} />
        {n > 0 && (
          <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-flash-400 px-[5px] text-[11px] font-extrabold text-ink-950">{n}</span>
        )}
      </a>
    );
  }
  return (
    <a href="/cart" onClick={onClick} aria-label={label} className="relative flex h-11 items-center gap-2 rounded-full bg-ink-900 px-4 text-sm font-bold text-white no-underline hover:bg-ink-950 hover:text-white">
      <Icon name="bag" size={20} />
      Cart
      <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-flash-400 px-1.5 text-xs font-extrabold text-ink-950">{n}</span>
    </a>
  );
}
