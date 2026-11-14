// v2 product card for islands. Same markup and classes as src/components/ProductCard.astro.
import QuickAdd from '@/components/react/QuickAdd';
import Icon from '@/components/react/Icon';
import { formatShort, priceLabel } from '@/lib/money';
import { sized } from '@/lib/product';
import { productUrl } from '@/lib/routes';
import type { CardProduct } from '@/lib/collection';

interface Props {
  product: CardProduct;
  /** eager-load the first image (above the fold) */
  eager?: boolean;
  badge?: 'new';
  className?: string;
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const badgeCls = 'rounded-xs px-[7px] py-[3px] font-mono text-[10px] font-bold tracking-[0.08em] uppercase';
const shot = 'product-shot absolute inset-0 size-full px-[9%] pt-[13%] pb-[7%]';

export default function ProductCardReact({ product: p, eager = false, badge, className }: Props) {
  const href = productUrl(p.handle);
  const sale = p.sale && p.available;
  const soldOut = !p.available;
  const [img1, img2] = p.images;

  return (
    <article
      className={cx(
        'group/card flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-[#D9E1E0] bg-surface text-ink-900 transition-colors duration-150 focus-within:border-ink-900 hover:border-ink-900',
        className,
      )}
    >
      <a href={href} aria-label={p.title} className="relative flex aspect-square items-center justify-center bg-tile transition-colors duration-150 group-hover/card:bg-tile-hover">
        {img1 && (
          <img
            src={sized(img1.url, 600)}
            alt={p.title}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            width="600"
            height="600"
            className={cx(shot, 'transition-[transform,opacity] duration-200', soldOut && 'opacity-45', img2 ? 'group-hover/card:opacity-0' : 'group-hover/card:scale-105')}
          />
        )}
        {img2 && (
          <img
            src={sized(img2.url, 600)}
            alt=""
            loading="lazy"
            decoding="async"
            width="600"
            height="600"
            className={cx(shot, 'opacity-0 transition-opacity duration-150 group-hover/card:opacity-100')}
          />
        )}
        <span className="absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-1.5">
          <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[#2B464E] uppercase">{p.cat ?? ''}</span>
          <span className="flex gap-1">
            {sale && <span className={cx(badgeCls, 'bg-sale-600 text-white')}>Sale</span>}
            {badge === 'new' && <span className={cx(badgeCls, 'bg-cyan-400 text-ink-950')}>New</span>}
            {soldOut && <span className={cx(badgeCls, 'bg-ink-900 text-white')}>Sold out</span>}
          </span>
        </span>
      </a>
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pt-3.5 pb-4">
        <a href={href} className="text-h4 font-extrabold text-pretty text-ink-900 no-underline group-hover/card:underline hover:text-ink-900">
          {p.title}
        </a>
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className={cx('text-sm font-extrabold', sale ? 'text-sale-600' : 'text-teal-700')}>
            {priceLabel(p.minPrice, p.maxPrice)} <span className="text-[9px] font-bold tracking-[0.04em]">USD</span>
          </span>
          {sale && p.compareAtPrice && <s className="text-[13px] text-ink-500">{formatShort(p.compareAtPrice)}</s>}
        </div>
        <div className="mt-auto flex min-h-9 flex-wrap items-center justify-between gap-2 pt-2.5">
          <a href={href} className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink-900 no-underline hover:text-ink-900">
            {p.line ? 'View product' : 'View options'}
            <Icon name="arrow-right" size={13} stroke={2.6} className="transition-transform duration-150 group-hover/card:translate-x-0.5" />
          </a>
          {soldOut ? <span className="text-xs font-bold text-ink-500">Sold out</span> : p.line && <QuickAdd line={p.line} />}
        </div>
      </div>
    </article>
  );
}
