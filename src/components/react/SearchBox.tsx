import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { priceLabel } from '@/lib/money';
import { loadSearchIndex, searchCatalog, type SearchIndex } from '@/lib/search';

interface Props {
  variant: 'desktop' | 'mobile';
  initialQuery?: string;
}

/** Header search with predictive results after 2 characters. */
export default function SearchBox({ variant, initialQuery = ''}: Props) {
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLFormElement>(null);
  const listId = useId();
  const m = variant === 'mobile';

  const ensureIndex = () => {
    if (!index) void loadSearchIndex().then(setIndex);
  };

  const qTrim = q.trim();
  const live = qTrim.length >= 2;
  const results = useMemo(() => (index && live ? searchCatalog(index, q) : null), [index, q, live]);
  const products = results?.products.slice(0, 6) ?? [];
  const cats = results?.collections.slice(0, 4) ?? [];
  const showPanel = open && live && !!results;
  const searchHref = `/search?q=${encodeURIComponent(qTrim)}`;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => setActive(-1), [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showPanel || !products.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(products.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      window.location.href = `/products/${products[active].h}`;
    }
  };

  return (
    <form ref={rootRef} role="search" action="/search" method="get" className="relative flex w-full">
      <Icon name="search" size={18} stroke={2.2} className={'pointer-events-none absolute left-4 text-[#87949A] ' + (m ? 'top-[13px]' : 'top-[14px]')} />
      <input
        type="search"
        name="q"
        role="combobox"
        aria-label="Search products"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showPanel}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          ensureIndex();
          setOpen(true);
        }}
        onKeyDown={onKey}
        data-header-search
        placeholder="Search booths, printers, backdrops…"
        className={
          'w-full border border-line-dark-strong bg-ink-950 text-[#F6F8F8] placeholder:text-[#87949A] ' +
          (m ? 'h-11 rounded-sm pr-12 pl-11 text-base' : 'h-[46px] rounded-md pr-4 pl-11 text-[15px]')
        }
      />
      {m && (
        <button type="submit" aria-label="Search" className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-sm bg-cyan-400 text-ink-950">
          <Icon name="search" size={16} stroke={2.4} />
        </button>
      )}

      {showPanel && (
        <div
          id={listId}
          className={
            'absolute z-60 flex flex-col gap-1 rounded-card border border-line bg-surface p-2 text-left text-ink-900 shadow-menu ' +
            (m ? '-inset-x-1 top-[52px]' : 'inset-x-0 top-[54px]')
          }
        >
          {products.length > 0 && (
            <>
              <span className="eyebrow px-2.5 pt-2 pb-1 text-ink-500">Products</span>
              <ul role="listbox" aria-label="Products">
                {products.map((r, i) => (
                  <li key={r.h} role="option" id={`${listId}-${i}`} aria-selected={i === active}>
                    <a
                      href={`/products/${r.h}`}
                      className={'flex min-h-14 items-center gap-3 rounded-md px-2.5 py-1.5 text-ink-900 no-underline hover:bg-paper hover:text-ink-900 ' + (i === active ? 'bg-paper' : '')}
                    >
                      <span className="size-12 flex-none overflow-hidden rounded-sm bg-tile">
                        {r.img && <img src={r.img} alt="" className="product-shot size-full p-[3px]" loading="lazy" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm leading-[19px] font-bold">{r.t}</span>
                        <span className={'text-[13px] font-extrabold ' + (r.cmp ? 'text-sale-600' : 'text-teal-700')}>{priceLabel(r.min, r.max)}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {cats.length > 0 && (
            <>
              <span className="eyebrow px-2.5 pt-2 pb-1 text-ink-500">Categories</span>
              <div className="flex flex-wrap gap-1.5 px-2.5 pb-1.5">
                {cats.map((c) => (
                  <a key={c.h} href={`/collections/${c.h}`} className="flex h-[34px] items-center rounded-sm border border-line-strong px-3 text-xs font-extrabold text-ink-900 no-underline hover:border-ink-900 hover:text-ink-900">
                    {c.t}
                  </a>
                ))}
              </div>
            </>
          )}
          {!products.length && !cats.length && <p className="px-2.5 py-3.5 text-sm text-ink-700">No products match “{qTrim}”.</p>}
          <a href={searchHref} className="mt-0.5 flex min-h-12 items-center justify-between border-t border-line px-2.5 text-sm font-extrabold text-ink-900 no-underline hover:text-ink-900">
            See all results for “{qTrim}” <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </form>
  );
}
