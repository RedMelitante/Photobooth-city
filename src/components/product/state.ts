import { atom } from 'nanostores';
import type { Product } from '@/lib/types';

/** Selected variant id, shared by the buy box and "Frequently bought together". */
export const $variantId = atom<string | null>(null);

/** The fields the client islands need (keeps body copy out of the island props). */
export type ClientProduct = Pick<Product, 'id' | 'handle' | 'title' | 'images' | 'options' | 'variants' | 'leadTime' | 'available' | 'minPrice' | 'compareAtPrice'>;

export function toClientProduct(p: Product): ClientProduct {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    images: p.images.slice(0, 1),
    options: p.options,
    variants: p.variants,
    leadTime: p.leadTime,
    available: p.available,
    minPrice: p.minPrice,
    compareAtPrice: p.compareAtPrice,
  };
}

/** Default selection: the first available variant (or the first one). */
export function defaultVariant(p: Pick<Product, 'variants'>) {
  return p.variants.find((v) => v.available) ?? p.variants[0];
}

/** Shopify-style numeric id for ?variant= (accepts both forms when reading). */
export const variantParam = (id: string) => id.replace(/^variant_/, '');
