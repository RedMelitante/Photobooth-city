// Collection page helpers shared by the static page (build time) and the
// filtering island (browser). Keep this file free of `@/lib/catalog` imports
// so the catalog JSON never ships to the client.
import { toCartLine } from './product';
import type { CartLine, Product } from './types';

/** The slim product shape a card needs (serialised into island props). */
export interface CardProduct {
  handle: string;
  title: string;
  /** cents */
  minPrice: number;
  /** cents */
  maxPrice: number;
  /** cents */
  compareAtPrice: number | null;
  available: boolean;
  /** compare-at above the price */
  sale: boolean;
  /** first two images (hover swap) */
  images: { url: string; alt: string }[];
  /** set for single-variant items -> Quick add */
  line: Omit<CartLine, 'quantity'> | null;
  /** merchandised position (Featured sort) */
  rank: number;
}

export function toCardProduct(p: Product, rank = 0): CardProduct {
  return {
    handle: p.handle,
    title: p.title,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    compareAtPrice: p.compareAtPrice,
    available: p.available,
    sale: !!p.compareAtPrice && p.compareAtPrice > p.minPrice,
    images: p.images.slice(0, 2).map((i) => ({ url: i.url, alt: i.alt })),
    line: p.variants.length === 1 ? toCartLine(p, p.variants[0]) : null,
    rank,
  };
}

/** Price buckets from the CollectionPage template (cents, inclusive). */
export const PRICE_RANGES = [
  { id: 'under-500', label: 'Under $500', min: 0, max: 49_999 },
  { id: '500-1500', label: '$500 – $1,500', min: 50_000, max: 150_000 },
  { id: '1500-3000', label: '$1,500 – $3,000', min: 150_001, max: 300_000 },
  { id: 'over-3000', label: 'Over $3,000', min: 300_001, max: Number.MAX_SAFE_INTEGER },
] as const;

export type PriceRangeId = (typeof PRICE_RANGES)[number]['id'];

export const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'low', label: 'Price: low to high' },
  { id: 'high', label: 'Price: high to low' },
  { id: 'az', label: 'Name: A to Z' },
] as const;

export type SortId = (typeof SORTS)[number]['id'];

export const PAGE_SIZE = 24;

export interface FilterState {
  price: PriceRangeId[];
  /** custom range, whole dollars (null = open) */
  min: number | null;
  max: number | null;
  stock: boolean;
  sale: boolean;
  sort: SortId;
  page: number;
}

export const EMPTY_FILTERS: FilterState = { price: [], min: null, max: null, stock: false, sale: false, sort: 'featured', page: 1 };

export function inRange(p: CardProduct, id: PriceRangeId): boolean {
  const r = PRICE_RANGES.find((x) => x.id === id);
  return !!r && p.minPrice >= r.min && p.minPrice <= r.max;
}

export function applyFilters(all: CardProduct[], s: FilterState): CardProduct[] {
  let list = all.filter((p) => {
    if (s.sale && !p.sale) return false;
    if (s.stock && !p.available) return false;
    if (s.price.length && !s.price.some((id) => inRange(p, id))) return false;
    if (s.min != null && p.minPrice < s.min * 100) return false;
    if (s.max != null && p.minPrice > s.max * 100) return false;
    return true;
  });
  if (s.sort === 'low') list = list.slice().sort((a, b) => a.minPrice - b.minPrice || a.rank - b.rank);
  else if (s.sort === 'high') list = list.slice().sort((a, b) => b.minPrice - a.minPrice || a.rank - b.rank);
  else if (s.sort === 'az') list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
  else list = list.slice().sort((a, b) => a.rank - b.rank);
  return list;
}

/** URL query <-> filter state (?price=under-500,500-1500&min=&max=&stock=1&sale=1&sort=low&page=2) */
export function parseQuery(search: string): FilterState {
  const q = new URLSearchParams(search);
  const ids = PRICE_RANGES.map((r) => r.id) as string[];
  const num = (k: string) => {
    const v = q.get(k);
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const sort = q.get('sort');
  const page = Number(q.get('page'));
  return {
    price: (q.get('price') ?? '').split(',').filter((x): x is PriceRangeId => ids.includes(x)),
    min: num('min'),
    max: num('max'),
    stock: q.get('stock') === '1',
    sale: q.get('sale') === '1',
    sort: SORTS.some((x) => x.id === sort) ? (sort as SortId) : 'featured',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function toQuery(s: FilterState, page = s.page): string {
  const q = new URLSearchParams();
  if (s.price.length) q.set('price', s.price.join(','));
  if (s.min != null) q.set('min', String(s.min));
  if (s.max != null) q.set('max', String(s.max));
  if (s.stock) q.set('stock', '1');
  if (s.sale) q.set('sale', '1');
  if (s.sort !== 'featured') q.set('sort', s.sort);
  if (page > 1) q.set('page', String(page));
  const str = q.toString().replace(/%2C/g, ',');
  return str ? `?${str}` : '';
}

export function activeCount(s: FilterState): number {
  return s.price.length + (s.min != null || s.max != null ? 1 : 0) + (s.stock ? 1 : 0) + (s.sale ? 1 : 0);
}
