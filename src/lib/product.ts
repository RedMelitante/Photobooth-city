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
    maxQuantity: v.maxQuantity ?? null,
    leadTime: leadTimeLabel(p.leadTime),
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

/**
 * Shopify's lead-time snippets are uneven ("ships in " with nothing after,
 * lower case, duplicated phrases). Returns a clean sentence-case label, or ''
 * when there is nothing useful to show.
 */
export function leadTimeLabel(raw: string | undefined): string {
  const t = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!/\d/.test(t)) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Largest quantity allowed in the cart for a line (20 is the store-wide cap). */
export function lineCap(maxQuantity: number | null | undefined): number {
  return Math.min(20, maxQuantity ?? 20);
}
