// Catalog access. Pages call these at build time; the data comes from the
// bundled snapshot (src/data/catalog.json). To move to a live Medusa v2
// backend, swap the bodies for calls to /store/products and
// /store/collections — the signatures are the contract the pages rely on.
import data from '@/data/catalog.json';
import blobMap from '@/data/blob-map.json';
import type { Collection, Product } from './types';

const products = data.products as Product[];
const collections = data.collections as Collection[];

const byHandle = new Map(products.map((p) => [p.handle, p]));
const colByHandle = new Map(collections.map((c) => [c.handle, c]));

export function listProducts(): Product[] {
  return products;
}

export function getProduct(handle: string): Product | undefined {
  return byHandle.get(handle);
}

export function listCollections(): Collection[] {
  return collections;
}

export function getCollection(handle: string): Collection | undefined {
  return colByHandle.get(handle);
}

export function collectionProducts(handle: string): Product[] {
  const c = colByHandle.get(handle);
  if (!c) return [];
  return c.products.map((h) => byHandle.get(h)).filter((p): p is Product => !!p);
}

/** Collections a product appears in (for breadcrumbs, search keywords). */
export function collectionsFor(handle: string): Collection[] {
  return collections.filter((c) => c.products.includes(handle));
}

export function isOnSale(p: Product): boolean {
  return !!p.compareAtPrice && p.compareAtPrice > p.minPrice;
}

/** "You may also like": same primary collection first, then siblings. */
export function relatedProducts(p: Product, limit = 4): Product[] {
  const seen = new Set([p.handle]);
  const out: Product[] = [];
  for (const c of [getCollection(p.collection), ...collectionsFor(p.handle)]) {
    for (const h of c?.products ?? []) {
      const r = byHandle.get(h);
      if (r && !seen.has(h) && r.available) {
        seen.add(h);
        out.push(r);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/** Resolve an image id used in the design file ("/_blob/<id>") to a URL. */
export function designImage(id: string): string {
  const key = id.replace('/_blob/', '');
  return (blobMap as Record<string, string>)[key] ?? '';
}

/** Search index shipped to the client for predictive search. */
export interface SearchEntry {
  h: string;
  t: string;
  k: string;
  img: string;
  min: number;
  max: number;
  cmp: number | null;
  av: boolean;
}

export function searchIndex(): { products: SearchEntry[]; collections: { h: string; t: string }[] } {
  return {
    products: products.map((p) => ({
      h: p.handle,
      t: p.title,
      k: [p.kind, ...collectionsFor(p.handle).map((c) => c.title)].join(' '),
      img: p.images[0]?.url ?? '',
      min: p.minPrice,
      max: p.maxPrice,
      cmp: p.compareAtPrice,
      av: p.available,
    })),
    collections: collections.map((c) => ({ h: c.handle, t: c.title })),
  };
}
