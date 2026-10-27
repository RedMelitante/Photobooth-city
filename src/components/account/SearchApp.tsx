import { useEffect, useMemo, useRef, useState } from 'react';
import { loadSearchIndex, searchCatalog, tokenize, type SearchIndex } from '@/lib/search';
import { STORE } from '@/lib/commerce';
import { collectionUrl } from '@/lib/routes';
import type { CartLine } from '@/lib/types';
import ProductCardReact, { type CardProduct } from './ProductCardReact';

export interface SiteEntry {
  t: string;
  /** description (pages only) */
  d?: string;
  img?: string;
  h: string;
}

export interface ProductExtras {
  image2?: string;
  line?: Omit<CartLine, 'quantity'>;
}

interface Props {
  articles: SiteEntry[];
  pages: SiteEntry[];
  /** handle -> hover image / quick-add line (not in the slim search index) */
  extras: Record<string, ProductExtras>;
  popular: string[];
  fallback: { t: string; h: string }[];
}

const TABS = ['Products', 'Articles', 'Pages'] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, [string, string]> = { Products: ['product', 'products'], Articles: ['article', 'articles'], Pages: ['page', 'pages'] };
type Sort = 'rel' | 'low' | 'high';

/** Same rule as the catalog search: every token must appear; title hits rank higher. */
function score(toks: string[], hay: string, title: string): number {
  let sc = 0;
  for (const t of toks) {
    if (!hay.includes(t)) return 0;
    sc += title.includes(t) ? 3 : 1;
    if (title.startsWith(t)) sc += 2;
  }
  return sc;
}

function searchEntries(list: SiteEntry[], toks: string[]) {
  if (!toks.length) return [];
  return list
    .map((e) => ({ e, sc: score(toks, `${e.t} ${e.d ?? ''}`.toLowerCase(), e.t.toLowerCase()) }))
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.e);
}

function readQuery(): string {
  try {
    return new URLSearchParams(window.location.search).get('q') ?? '';
  } catch {
    return '';
  }
}

export default function SearchApp({ articles, pages, extras, popular, fallback }: Props) {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sort, setSort] = useState<Sort>('rel');
  const [tab, setTab] = useState<Tab>('Products');
  const [tabPicked, setTabPicked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ?q= is read on the client only (the page is static), after hydration.
  useEffect(() => {
    setQ(readQuery());
    setMounted(true);
    void loadSearchIndex().then(setIndex);
    const onPop = () => setQ(readQuery());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Keep the URL shareable as the query changes.
  useEffect(() => {
    if (!mounted) return;
    const url = new URL(window.location.href);
    const v = q.trim();
    if ((url.searchParams.get('q') ?? '') === v) return;
    if (v) url.searchParams.set('q', v);
    else url.searchParams.delete('q');
    try {
      window.history.replaceState(null, '', url);
    } catch {
      /* ignore */
    }
  }, [q, mounted]);

  const toks = useMemo(() => tokenize(q), [q]);
  const qTrim = q.trim();
  const loading = mounted && !index && toks.length > 0;

  const { products, cats } = useMemo(() => {
    if (!index || !toks.length) return { products: [] as CardProduct[], cats: [] as { h: string; t: string }[] };
    const r = searchCatalog(index, q);
    const list = [...r.products];
    if (sort === 'low') list.sort((a, b) => a.min - b.min);
    else if (sort === 'high') list.sort((a, b) => b.min - a.min);
    return {
      products: list.map<CardProduct>((p) => ({
        handle: p.h,
        title: p.t,
        minPrice: p.min,
        maxPrice: p.max,
        compareAtPrice: p.cmp,
        available: p.av,
        image: p.img,
        image2: extras[p.h]?.image2,
        line: extras[p.h]?.line,
      })),
      cats: r.collections.slice(0, 6),
    };
  }, [index, q, toks, sort, extras]);

  const arts = useMemo(() => searchEntries(articles, toks), [articles, toks]);
  const pgs = useMemo(() => searchEntries(pages, toks), [pages, toks]);
  const counts: Record<Tab, number> = { Products: products.length, Articles: arts.length, Pages: pgs.length };
  const active: Tab = tabPicked ? tab : (TABS.find((t) => counts[t] > 0) ?? 'Products');
  const n = counts[active];
  const label = LABEL[active];

  const changeQ = (v: string) => {
    setQ(v);
    setTabPicked(false);
  };

  const title = !toks.length
    ? 'Search Photobooth City'
    : loading
      ? `Searching for “${qTrim}”…`
      : `${n} ${n === 1 ? label[0] : label[1]} for “${qTrim}”`;

  const ready = mounted && !loading;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-14 lg:px-10 lg:pt-12 lg:pb-24">
      <form
        role="search"
        action="/search"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          inputRef.current?.blur();
        }}
        className="flex max-w-[760px] flex-col gap-2.5"
      >
        <label htmlFor="sq" className="text-sm font-bold text-ink-700">
          Search
        </label>
        <div className="relative flex">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="pointer-events-none absolute top-[19px] left-5 text-ink-900" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            id="sq"
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search booths, printers, backdrops…"
            value={q}
            onChange={(e) => changeQ(e.target.value)}
            className="box-border h-[60px] w-full rounded-full border-2 border-ink-900 bg-surface pr-14 pl-[54px] text-lg font-semibold text-ink-900 placeholder:font-medium placeholder:text-ink-500 lg:pr-40 [&::-webkit-search-cancel-button]:hidden"
          />
          {q.length > 0 && (
            <button
              type="button"
              onClick={() => {
                changeQ('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border-0 bg-chip text-ink-900 hover:bg-line lg:right-[116px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
          <button type="submit" className="absolute top-1.5 right-1.5 hidden h-12 items-center rounded-full border-0 bg-brand-600 px-5 text-[15px] font-extrabold text-white hover:bg-brand-700 lg:flex">
            Search
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
          Popular:
          {popular.map((t) => (
            <button key={t} type="button" onClick={() => changeQ(t)} className="flex h-8 items-center rounded-full border-0 bg-chip px-3 text-[13px] font-bold text-ink-900 hover:bg-line">
              {t}
            </button>
          ))}
        </div>
      </form>

      <h1 role="status" className="mt-7 mb-3 font-display text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere] lg:mt-12 lg:mb-5 lg:text-[44px]">
        {title}
      </h1>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3.5 border-b border-line">
        <div role="tablist" aria-label="Result types" className="flex max-w-full gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const on = active === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="search-results"
                onClick={() => {
                  setTab(t);
                  setTabPicked(true);
                }}
                className={
                  '-mb-px h-[52px] flex-none border-0 border-b-[3px] bg-transparent px-4 text-[15px] font-extrabold transition-colors ' +
                  (on ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-900')
                }
              >
                {t} <span className="font-semibold text-ink-500">({ready ? counts[t] : 0})</span>
              </button>
            );
          })}
        </div>
        {active === 'Products' && products.length > 1 && (
          <label className="flex items-center gap-2 pb-2 text-sm font-bold text-ink-700">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 rounded-md border-[1.5px] border-line-strong bg-surface px-3 text-sm font-semibold text-ink-900"
            >
              <option value="rel">Relevance</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        )}
      </div>

      <div id="search-results" role="tabpanel" aria-label={active}>
        {active === 'Products' && cats.length > 0 && (
          <ul aria-label="Matching categories" className="-mt-2 mb-6 flex list-none flex-wrap gap-2 p-0">
            {cats.map((c) => (
              <li key={c.h}>
                <a href={collectionUrl(c.h)} className="flex h-10 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-bold text-ink-900 no-underline transition-colors hover:border-ink-900 hover:text-ink-900">
                  {c.t} <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] lg:gap-x-6 lg:gap-y-10" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="aspect-square animate-pulse rounded-card bg-canvas" />
            ))}
          </div>
        )}

        {ready && active === 'Products' && products.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] lg:gap-x-6 lg:gap-y-10">
            {products.map((p, i) => (
              <ProductCardReact key={p.handle} product={p} eager={i < 4} />
            ))}
          </div>
        )}

        {ready && active === 'Articles' && arts.length > 0 && (
          <ul className="m-0 flex max-w-[860px] list-none flex-col gap-3 p-0">
            {arts.map((a) => (
              <li key={a.t}>
                <a href={a.h} className="flex items-center gap-4 rounded-card border border-line p-4 text-ink-900 no-underline transition-colors hover:border-ink-900 hover:text-ink-900">
                  {a.img && <img src={a.img} alt="" loading="lazy" className="h-16 w-24 flex-none rounded-md bg-tile object-cover" />}
                  <span className="flex flex-col gap-1">
                    <span className="text-xs font-extrabold tracking-[0.08em] text-brand-600 uppercase">Blog</span>
                    <strong className="text-base leading-[22px]">{a.t}</strong>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {ready && active === 'Pages' && pgs.length > 0 && (
          <ul className="m-0 flex max-w-[860px] list-none flex-col gap-3 p-0">
            {pgs.map((a) => (
              <li key={a.t}>
                <a href={a.h} className="flex flex-col gap-1 rounded-card border border-line px-[18px] py-4 text-ink-900 no-underline transition-colors hover:border-ink-900 hover:text-ink-900">
                  <span className="text-xs font-extrabold tracking-[0.08em] text-brand-600 uppercase">Page</span>
                  <strong className="text-base leading-[22px]">{a.t}</strong>
                  <span className="text-sm leading-5 text-ink-700">{a.d}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {ready && n === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-panel bg-canvas px-6 py-10 text-center">
            <strong className="text-lg [overflow-wrap:anywhere]">{toks.length ? `No ${label[1]} match “${qTrim}”` : 'Type something to search'}</strong>
            <span className="text-[15px] text-ink-700">Check the spelling, try a shorter word, or browse a popular category.</span>
            <div className="flex flex-wrap justify-center gap-2">
              {fallback.map((c) => (
                <a key={c.t} href={c.h} className="flex h-11 items-center rounded-lg bg-ink-900 px-4 text-sm font-bold text-white no-underline hover:bg-ink-950 hover:text-white">
                  {c.t}
                </a>
              ))}
            </div>
            <a href={STORE.phoneHref} className="flex min-h-11 items-center text-sm font-bold">
              Or call an expert: {STORE.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
