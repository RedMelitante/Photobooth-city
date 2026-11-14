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

  return (
    <a href="/cart" onClick={onClick} aria-label={label} className="relative flex size-11 items-center justify-center rounded-md text-[#F6F8F8] hover:bg-ink-800 hover:text-[#F6F8F8]">
      <Icon name="bag" size={variant === 'mobile' ? 22 : 20} />
      {n > 0 && (
        <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-xs bg-cyan-400 px-[5px] text-[11px] font-extrabold text-ink-950">{n}</span>
      )}
    </a>
  );
}
