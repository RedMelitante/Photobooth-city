import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/react/Icon';
import ProductCardReact from './ProductCardReact';
import FilterSheet from './FilterSheet';
import { STORE } from '@/lib/commerce';
import { formatShort } from '@/lib/money';
import {
  EMPTY_FILTERS,
  PAGE_SIZE,
  PRICE_RANGES,
  SORTS,
  activeCount,
  applyFilters,
  inRange,
  parseQuery,
  toQuery,
  type CardProduct,
  type FilterState,
  type PriceRangeId,
  type SortId,
} from '@/lib/collection';

interface Props {
  products: CardProduct[];
}

const dollars = (n: number) => formatShort(n * 100);
const parseDollars = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return v.trim() === '' || !Number.isFinite(n) ? null : Math.round(n);
};

/**
 * Filtering / sorting grid for a collection. The first page renders statically
 * (SSR); on the client the URL query (?price, ?min, ?max, ?stock, ?sale, ?sort,
 * ?page) is read and kept in sync with history.replaceState, no reload.
 */
export default function CollectionBrowser({ products }: Props) {
  const [s, setS] = useState<FilterState>(EMPTY_FILTERS);
  const [sheet, setSheet] = useState(false);
  const ready = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusFrom = useRef<number | null>(null);

  // Read the URL once mounted (keeps SSR markup = page 1, unfiltered).
  useEffect(() => {
    setS(parseQuery(window.location.search));
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    const url = window.location.pathname + toQuery(s) + window.location.hash;
    if (url !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [s]);

  const update = useCallback((patch: Partial<FilterState>) => setS((prev) => ({ ...prev, ...patch, page: 1 })), []);
  const togglePrice = useCallback(
    (id: PriceRangeId) => setS((prev) => ({ ...prev, page: 1, price: prev.price.includes(id) ? prev.price.filter((x) => x !== id) : [...prev.price, id] })),
    [],
  );
  const clearAll = useCallback(() => setS((prev) => ({ ...EMPTY_FILTERS, sort: prev.sort })), []);
  const closeSheet = useCallback(() => setSheet(false), []);

  const list = useMemo(() => applyFilters(products, s), [products, s]);
  const shown = list.slice(0, s.page * PAGE_SIZE);
  const hasNext = shown.length < list.length;
  const saleCount = products.filter((p) => p.sale).length;
  const ceiling = Math.ceil(Math.max(0, ...products.map((p) => p.minPrice)) / 100);
  const nActive = activeCount(s);

  // After "Load more", move focus to the first newly shown card.
  useEffect(() => {
    if (focusFrom.current == null || !gridRef.current) return;
    const card = gridRef.current.children[focusFrom.current] as HTMLElement | undefined;
    card?.querySelector<HTMLElement>('a')?.focus();
    focusFrom.current = null;
  }, [s.page]);

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...s.price.map((id) => ({ key: id, label: PRICE_RANGES.find((r) => r.id === id)!.label, remove: () => togglePrice(id) })),
  ];
  if (s.min != null || s.max != null) {
    chips.push({ key: 'range', label: `${dollars(s.min ?? 0)} – ${dollars(s.max ?? ceiling)}`, remove: () => update({ min: null, max: null }) });
  }
  if (s.stock) chips.push({ key: 'stock', label: 'In stock', remove: () => update({ stock: false }) });
  if (s.sale) chips.push({ key: 'sale', label: 'On sale', remove: () => update({ sale: false }) });

  const empty = list.length === 0;
  const noProducts = products.length === 0;
  const countWord = list.length === 1 ? 'product' : 'products';

  return (
    <div>
      {/* Mobile: sticky Filter + Sort bar */}
      {!noProducts && (
      <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2.5 border-y border-line bg-surface px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-haspopup="dialog"
          aria-expanded={sheet}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-ink-900 text-sm font-bold text-white hover:bg-ink-950"
        >
          <Icon name="filter" size={18} stroke={2.2} />
          Filter
          {nActive > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-flash-400 px-1.5 text-xs font-extrabold text-ink-950">
              <span className="sr-only">(</span>
              {nActive}
              <span className="sr-only"> active)</span>
            </span>
          )}
        </button>
        <label className="relative flex flex-1">
          <span className="sr-only">Sort by</span>
          <SortSelect value={s.sort} onChange={(sort) => update({ sort })} mobile />
        </label>
      </div>
      )}

      <div className={noProducts ? 'pt-2 lg:pt-8' : 'pt-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:pt-8 xl:grid-cols-[280px_minmax(0,1fr)]'}>
        {/* Desktop filter sidebar */}
        {!noProducts && (
        <aside aria-label="Filters" className="hidden flex-col lg:flex">
          <div className="flex items-center justify-between pb-4">
            <h2 className="m-0 text-lg font-extrabold">Filters</h2>
            {nActive > 0 && (
              <button type="button" onClick={clearAll} className="border-0 bg-transparent py-2 text-sm font-bold text-brand-600 underline hover:text-brand-700">
                Clear all
              </button>
            )}
          </div>

          <fieldset className="m-0 flex flex-col gap-3 border-0 border-t border-line px-0 py-5">
            <legend className="float-left w-full pb-1 text-[15px] font-extrabold">Price</legend>
            <MinMax min={s.min} max={s.max} ceiling={ceiling} onCommit={(min, max) => update({ min, max })} />
            {PRICE_RANGES.map((r) => (
              <label key={r.id} className="flex min-h-8 cursor-pointer items-center gap-3 text-[15px]">
                <input type="checkbox" checked={s.price.includes(r.id)} onChange={() => togglePrice(r.id)} className="m-0 size-5 accent-brand-600" />
                <span className="flex-1">{r.label}</span>
                <span className="text-[13px] text-ink-500">{products.filter((p) => inRange(p, r.id)).length}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="m-0 flex flex-col gap-3.5 border-0 border-y border-line px-0 py-5">
            <legend className="float-left w-full pb-1 text-[15px] font-extrabold">Availability &amp; deals</legend>
            <div className="flex min-h-8 items-center justify-between gap-3 text-[15px]">
              <span id="cp-stock-l">In stock only</span>
              <Switch on={s.stock} labelledBy="cp-stock-l" onToggle={() => update({ stock: !s.stock })} />
            </div>
            <div className="flex min-h-8 items-center justify-between gap-3 text-[15px]">
              <span id="cp-sale-l">
                On sale <span className="text-[13px] text-ink-500">({saleCount})</span>
              </span>
              <Switch on={s.sale} labelledBy="cp-sale-l" onToggle={() => update({ sale: !s.sale })} />
            </div>
          </fieldset>

          <a href={STORE.phoneHref} className="mt-6 flex flex-col gap-1.5 rounded-card bg-canvas p-5 text-ink-900 no-underline hover:bg-tile hover:text-ink-900">
            <span className="text-[15px] font-extrabold">Not sure what fits?</span>
            <span className="text-sm leading-5 text-ink-700">
              Call an expert: <strong className="text-brand-600">{STORE.phone}</strong>
            </span>
          </a>
        </aside>
        )}

        {/* Results */}
        <section aria-label="Products" className="min-w-0">
          <div className={'mb-3.5 flex-wrap items-center justify-between gap-4 lg:mb-4 ' + (noProducts ? 'sr-only' : 'flex')}>
            <p role="status" className="m-0 text-sm text-ink-700 lg:text-[15px]">
              <strong className="text-ink-900">{list.length}</strong> {countWord}
            </p>
            {!noProducts && (
              <label className="hidden items-center gap-2.5 text-sm font-bold text-ink-700 lg:flex">
                Sort by
                <span className="relative flex">
                  <SortSelect value={s.sort} onChange={(sort) => update({ sort })} />
                </span>
              </label>
            )}
          </div>

          {chips.length > 0 && (
            <ul aria-label="Active filters" className="m-0 mb-4 flex list-none flex-wrap gap-2 p-0 lg:mb-5">
              {chips.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={c.remove}
                    aria-label={`Remove filter ${c.label}`}
                    className="flex h-9 items-center gap-2 rounded-full border-0 bg-ink-900 pr-3 pl-3.5 text-[13px] font-bold text-white hover:bg-ink-950"
                  >
                    {c.label}
                    <Icon name="close" size={14} stroke={2.6} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!empty && (
            <div ref={gridRef} className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(min(230px,100%),1fr))] lg:gap-x-6 lg:gap-y-10">
              {shown.map((p, i) => (
                <ProductCardReact key={p.handle} product={p} eager={i < 4} />
              ))}
            </div>
          )}

          {empty && (
            <div className="flex flex-col items-center gap-3 rounded-card bg-canvas px-6 py-14 text-center lg:py-16">
              <span className="text-lg font-extrabold">{noProducts ? 'Nothing listed here right now' : 'No products match these filters'}</span>
              <span className="max-w-[460px] text-[15px] leading-[23px] text-ink-700">
                {noProducts
                  ? 'This collection has no products online at the moment. Call us and an expert will tell you what is available.'
                  : 'Try removing a filter to see more.'}
              </span>
              {nActive > 0 && (
                <button type="button" onClick={clearAll} className="h-11 rounded-md border-[1.5px] border-ink-900 bg-surface px-5 font-bold text-ink-900 hover:bg-ink-900 hover:text-white">
                  Clear all filters
                </button>
              )}
              {nActive === 0 && (
                <a href={STORE.phoneHref} className="flex h-12 items-center rounded-lg bg-ink-900 px-5 font-extrabold text-white no-underline hover:bg-ink-950 hover:text-white">
                  Call {STORE.phone}
                </a>
              )}
            </div>
          )}

          {!empty && (
            <div className="mt-9 flex flex-col items-center gap-3 lg:mt-14 lg:gap-3.5">
              <p className="m-0 text-[13px] text-ink-700 lg:text-sm">
                Showing {shown.length} of {list.length} {countWord}
              </p>
              <div aria-hidden="true" className="h-1 w-[200px] overflow-hidden rounded-full bg-line lg:w-[240px]">
                <div className="h-full bg-ink-900 transition-[width] duration-200" style={{ width: `${Math.round((shown.length / list.length) * 100)}%` }} />
              </div>
              {hasNext && (
                <a
                  href={toQuery(s, s.page + 1)}
                  rel="next"
                  onClick={(e) => {
                    e.preventDefault();
                    focusFrom.current = shown.length;
                    setS((prev) => ({ ...prev, page: prev.page + 1 }));
                  }}
                  className="flex h-13 w-full items-center justify-center rounded-lg border-[1.5px] border-ink-900 bg-surface px-8 text-[15px] font-extrabold text-ink-900 no-underline hover:bg-ink-900 hover:text-white sm:w-auto"
                >
                  Load more products
                </a>
              )}
            </div>
          )}
        </section>
      </div>

      <FilterSheet
        open={sheet}
        onClose={closeSheet}
        state={s}
        togglePrice={togglePrice}
        update={update}
        clearAll={clearAll}
        saleCount={saleCount}
        resultCount={list.length}
      />
    </div>
  );
}

function SortSelect({ value, onChange, mobile = false }: { value: SortId; onChange: (v: SortId) => void; mobile?: boolean }) {
  return (
    <>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortId)}
        className={
          'h-11 appearance-none rounded-md border-[1.5px] border-line-strong bg-surface pr-10 text-sm text-ink-900 hover:border-ink-900 ' +
          (mobile ? 'w-full pl-3 font-bold' : 'pl-3.5 font-semibold')
        }
      >
        {SORTS.map((o) => (
          <option key={o.id} value={o.id}>
            {mobile && o.id === 'featured' ? 'Sort: Featured' : o.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={16} stroke={2.2} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-900" />
    </>
  );
}

function Switch({ on, onToggle, labelledBy }: { on: boolean; onToggle: () => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={onToggle}
      className={
        'relative flex h-[26px] w-11 flex-none rounded-full border-0 p-[3px] transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[""] ' +
        (on ? 'justify-end bg-brand-600' : 'justify-start bg-line-strong')
      }
    >
      <span className="size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(11,16,32,0.3)]" />
    </button>
  );
}

/** Free-form Min / Max price inputs (whole dollars); apply on blur or Enter. */
function MinMax({ min, max, ceiling, onCommit }: { min: number | null; max: number | null; ceiling: number; onCommit: (min: number | null, max: number | null) => void }) {
  const fmt = (v: number | null, fallback: number) => dollars(v ?? fallback).replace(/\.00$/, '');
  const [lo, setLo] = useState(fmt(min, 0));
  const [hi, setHi] = useState(fmt(max, ceiling));

  useEffect(() => setLo(fmt(min, 0)), [min]);
  useEffect(() => setHi(fmt(max, ceiling)), [max, ceiling]);

  const commit = () => {
    let a = parseDollars(lo);
    let b = parseDollars(hi);
    if (a != null && b != null && a > b) [a, b] = [b, a];
    const nextMin = a == null || a <= 0 ? null : a;
    const nextMax = b == null || b >= ceiling ? null : b;
    if (nextMin === min && nextMax === max) {
      setLo(fmt(min, 0));
      setHi(fmt(max, ceiling));
      return;
    }
    onCommit(nextMin, nextMax);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };
  const input =
    'h-11 w-full min-w-0 rounded-md border-[1.5px] border-line-strong bg-surface px-3 text-[15px] font-normal text-ink-900 hover:border-ink-500';

  return (
    <div className="flex items-center gap-2">
      <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-ink-500">
        Min
        <input type="text" inputMode="numeric" value={lo} onChange={(e) => setLo(e.target.value)} onBlur={commit} onKeyDown={onKey} className={input} />
      </label>
      <span aria-hidden="true" className="pt-[18px] text-ink-500">
        –
      </span>
      <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-ink-500">
        Max
        <input type="text" inputMode="numeric" value={hi} onChange={(e) => setHi(e.target.value)} onBlur={commit} onKeyDown={onKey} className={input} />
      </label>
    </div>
  );
}
