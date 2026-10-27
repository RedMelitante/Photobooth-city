import QuickAdd from '@/components/react/QuickAdd';
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

/** React twin of ProductCard.astro (same markup and classes) for use inside islands. */
export default function ProductCardReact({ product: p, eager = false, badge, className }: Props) {
  const href = productUrl(p.handle);
  const sale = p.sale && p.available;
  const soldOut = !p.available;
  const [img1, img2] = p.images;

  return (
    <article className={cx('group/card flex h-full min-w-0 flex-col gap-3.5 text-ink-900', className)}>
      <a
        href={href}
        aria-label={p.title}
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-card bg-canvas transition-[background-color,box-shadow] duration-150 group-hover/card:bg-[#F1F1EC] group-hover/card:shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
      >
        {img1 && (
          <img
            src={sized(img1.url, 600)}
            alt={p.title}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            width="600"
            height="600"
            className={cx(
              'product-shot absolute inset-0 size-full p-[6%] transition-[transform,opacity] duration-200',
              soldOut && 'opacity-45',
              img2 ? 'group-hover/card:opacity-0' : 'group-hover/card:scale-105',
            )}
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
            className="product-shot absolute inset-0 size-full p-[6%] opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
          />
        )}
        <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {sale && <span className="rounded-full bg-sale-600 px-2.5 py-1 text-xs font-extrabold tracking-[0.02em] text-white">Sale</span>}
          {badge === 'new' && <span className="rounded-full bg-flash-400 px-2.5 py-1 text-xs font-extrabold tracking-[0.02em] text-ink-950">New</span>}
          {soldOut && <span className="rounded-full bg-ink-900 px-2.5 py-1 text-xs font-extrabold tracking-[0.02em] text-white">Sold out</span>}
        </span>
      </a>
      <div className="flex flex-1 flex-col gap-1.5">
        <a href={href} className="text-[15px] leading-[21px] font-bold text-ink-900 no-underline group-hover/card:underline hover:text-ink-900">
          {p.title}
        </a>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={cx('text-base font-extrabold', sale ? 'text-sale-600' : 'text-ink-900')}>{priceLabel(p.minPrice, p.maxPrice)}</span>
          {sale && p.compareAtPrice && <s className="text-sm text-ink-500">{formatShort(p.compareAtPrice)}</s>}
        </div>
      </div>
      {soldOut ? (
        <button type="button" disabled className="h-11 w-full cursor-not-allowed rounded-md border border-dashed border-line-strong bg-canvas text-sm font-bold text-ink-500">
          Sold out
        </button>
      ) : p.line ? (
        <QuickAdd line={p.line} />
      ) : (
        <a
          href={href}
          className="flex h-11 w-full items-center justify-center rounded-md border-[1.5px] border-line-strong bg-surface text-sm font-bold text-ink-900 no-underline transition-colors duration-150 group-hover/card:border-ink-900 group-hover/card:bg-ink-900 group-hover/card:text-white"
        >
          View options
        </a>
      )}
    </article>
  );
}
