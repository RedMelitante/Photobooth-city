import type { CartLine, Product, ProductVariant } from './types';

export function toCartLine(p: Product, v: ProductVariant): Omit<CartLine, 'quantity'> {
  return {
    id: v.id,
    handle: p.handle,
    title: p.title,
    variantTitle: p.variants.length > 1 ? v.title : '',
    image: p.images[0]?.url ?? '',
    unitPrice: v.price,
    compareAtPrice: v.compareAtPrice,
  };
}

/** Variant matching a full option selection. */
export function findVariant(p: Product, sel: Record<string, string>): ProductVariant | undefined {
  return p.variants.find((v) => p.options.every((o) => v.options[o.name] === sel[o.name]));
}

/** Is there any available variant if this option value is picked (others kept)? */
export function valueAvailable(p: Product, sel: Record<string, string>, name: string, value: string): boolean {
  const next = { ...sel, [name]: value };
  return p.variants.some((v) => v.available && p.options.every((o) => v.options[o.name] === next[o.name]));
}

/** Shopify CDN images take a width parameter; local images pass through. */
export function sized(url: string, width: number): string {
  if (!url.includes('cdn.shopify.com')) return url;
  const u = new URL(url);
  u.searchParams.set('width', String(width));
  return u.toString();
}
