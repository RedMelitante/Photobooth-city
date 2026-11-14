// Search results card: adapts the search index shape to the shared v2 card.
import Card from '@/components/collection/ProductCardReact';
import type { CartLine } from '@/lib/types';

export interface CardProduct {
  handle: string;
  title: string;
  /** cents */
  minPrice: number;
  maxPrice: number;
  compareAtPrice: number | null;
  available: boolean;
  image?: string;
  /** hover image */
  image2?: string;
  /** set for single-variant products: Quick add instead of View options */
  line?: Omit<CartLine, 'quantity'>;
  cat?: string;
}

export default function ProductCardReact({ product: p, eager, badge, className }: { product: CardProduct; eager?: boolean; badge?: 'new'; className?: string }) {
  return (
    <Card
      eager={eager}
      badge={badge}
      className={className}
      product={{
        handle: p.handle,
        title: p.title,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
        compareAtPrice: p.compareAtPrice,
        available: p.available,
        sale: !!p.compareAtPrice && p.compareAtPrice > p.minPrice,
        images: [p.image, p.image2].filter((u): u is string => !!u).map((url) => ({ url, alt: p.title })),
        line: p.line ?? null,
        rank: 0,
        cat: p.cat,
      }}
    />
  );
}
