// Homepage catalog (#lineup): search field, category chips and a product grid
// over every product. Cards are built at build time (catalogCards() in
// src/lib/home.ts); filtering runs here by each card's chip keys.
import { useMemo, useState } from 'react';
import ProductCardReact from '@/components/collection/ProductCardReact';
import Icon from '@/components/react/Icon';
import type { CatalogCard } from '@/lib/home';

interface Props {
  cards: CatalogCard[];
  chips: [string, string][];
  /** /search */
  searchHref: string;
  /** "Browse all N products" destination */
  allHref: string;
}

const FIRST = 12;
const MORE = 22;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export default function HomeCatalog({ cards, chips, searchHref, allHref }: Props) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [more, setMore] = useState(false);

  const query = q.trim().toLowerCase();
  const list = useMemo(() => {
    const toks = query.split(/\s+/).filter(Boolean);
    return cards.filter((p) => {
      if (cat !== 'all' && !p.keys.includes(cat)) return false;
      if (!toks.length) return true;
      const hay = `${p.title} ${p.cat ?? ''}`.toLowerCase();
      return toks.every((t) => hay.includes(t));
    });
  }, [cards, cat, query]);

  const browsing = cat === 'all' && !query;
  const limit = browsing ? (more ? MORE : FIRST) : list.length;
  const shown = list.slice(0, limit);
  const total = cards.length;

  return (
    <>
      <form role="search" className="relative mb-[22px] max-w-[460px]" onSubmit={(e) => e.preventDefault()}>
        <Icon name="search" size={16} stroke={2.2} className="absolute top-[15px] left-3.5 text-ink-500" />
        <label htmlFor="cat-q" className="sr-only">
          Search all products
        </label>
        <input
          id="cat-q"
          type="search"
          placeholder="Search booths, printers, lighting…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-[46px] w-full rounded-md border border-line-strong bg-surface pr-3.5 pl-10 text-[15px] text-ink-900 placeholder:text-ink-500"
        />
      </form>

      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3.5">
        <div
          role="group"
          aria-label="Filter by category"
          className="-mx-4 flex w-[calc(100%+2rem)] snap-row gap-2 px-4 lg:mx-0 lg:w-auto lg:flex-wrap lg:overflow-visible lg:px-0"
        >
          {chips.map(([k, t]) => {
            const on = k === cat;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setCat(k);
                  setMore(false);
                }}
                className={cx(
                  'h-9 flex-none rounded-sm border px-3.5 text-xs font-extrabold whitespace-nowrap transition-colors',
                  on ? 'border-ink-900 bg-ink-900 text-[#F6F8F8]' : 'border-line-strong bg-transparent text-ink-900 hover:border-ink-900',
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
        <span role="status" className="font-mono text-[10px] font-semibold tracking-[0.08em] text-ink-700 uppercase">
          Showing {shown.length} of {total} products
        </span>
      </div>

      {shown.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          {shown.map((p) => (
            <ProductCardReact key={p.handle} product={p} />
          ))}
        </div>
      )}

      {shown.length === 0 && (
        <p className="m-0 py-10 text-center text-[15px] text-ink-700">
          No products match “{q.trim()}” here.{' '}
          <a href={query ? `${searchHref}?q=${encodeURIComponent(q.trim())}` : searchHref} className="font-extrabold text-ink-900 hover:text-teal-700">
            Search the full store
          </a>
          .
        </p>
      )}

      {browsing && !more && list.length > FIRST && (
        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={() => setMore(true)}
            className="flex h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-[18px] text-[13px] font-extrabold text-ink-900 transition-colors hover:border-ink-900"
          >
            Load more products <Icon name="chevron-down" size={14} stroke={2.4} />
          </button>
        </div>
      )}

      {browsing && more && (
        <div className="mt-7 flex justify-center">
          <a
            href={allHref}
            className="flex h-11 items-center gap-2 rounded-md bg-ink-900 px-[18px] text-[13px] font-extrabold text-[#F6F8F8] no-underline transition-colors hover:bg-ink-800 hover:text-[#F6F8F8]"
          >
            Browse all {total} products →
          </a>
        </div>
      )}
    </>
  );
}
