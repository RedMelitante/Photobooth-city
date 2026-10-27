// Client-side catalog search (same scoring as the design prototype):
// every token must match; title hits outrank keyword hits; prefix bonus.
import type { SearchEntry } from './catalog';

export interface SearchIndex {
  products: SearchEntry[];
  collections: { h: string; t: string }[];
}

let pending: Promise<SearchIndex> | null = null;

export function loadSearchIndex(): Promise<SearchIndex> {
  pending ??= fetch('/search-index.json').then((r) => r.json() as Promise<SearchIndex>);
  return pending;
}

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9$]+/)
    .filter(Boolean)
    .map((t) => (t.length > 3 ? t.replace(/s$/, '') : t));
}

function score(toks: string[], hay: string, title: string): number {
  let sc = 0;
  for (const t of toks) {
    if (!hay.includes(t)) return 0;
    sc += title.includes(t) ? 3 : 1;
    if (title.startsWith(t)) sc += 2;
  }
  return sc;
}

export function searchCatalog(index: SearchIndex, q: string) {
  const toks = tokenize(q);
  if (!toks.length) return { products: [], collections: [] };
  const products = index.products
    .map((p) => ({ p, sc: score(toks, `${p.t} ${p.k}`.toLowerCase(), p.t.toLowerCase()) }))
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.p);
  const collections = index.collections.filter((c) => score(toks, c.t.toLowerCase(), c.t.toLowerCase()) > 0);
  return { products, collections };
}
