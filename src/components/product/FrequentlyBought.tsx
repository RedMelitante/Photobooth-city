import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { addLine } from '@/lib/cart';
import { formatMoney } from '@/lib/money';
import { sized } from '@/lib/product';
import type { CartLine, ProductVariant } from '@/lib/types';
import { $variantId } from './state';

type Line = Omit<CartLine, 'quantity'>;

interface Item {
  key: string;
  name: string;
  img: string;
  /** "From" price shown on the label (cheapest variant) */
  line: Line;
}

interface Props {
  main: { handle: string; title: string; img: string; variants: ProductVariant[]; multi: boolean };
  items: Item[];
}

/** Ring Roamer "Frequently bought together": this item (locked) + accessories. */
export default function FrequentlyBought({ main, items }: Props) {
  // render the default variant on the server and during hydration, then follow the buy box
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const storeVid = useStore($variantId);
  const vid = mounted ? storeVid : null;
  const v = main.variants.find((x) => x.id === vid) ?? main.variants.find((x) => x.available) ?? main.variants[0];
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.key, true])));

  const mainLine: Line = { id: v.id, handle: main.handle, title: main.title, variantTitle: main.multi ? v.title : '', image: main.img, unitPrice: v.price, compareAtPrice: v.compareAtPrice };
  const mainOk = v.available;
  const chosen = [...(mainOk ? [mainLine] : []), ...items.filter((i) => on[i.key]).map((i) => i.line)];
  const total = chosen.reduce((a, l) => a + l.unitPrice, 0);
  const [done, setDone] = useState(false);

  const addAll = () => {
    chosen.forEach((l, i) => addLine(l, 1, i === chosen.length - 1));
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  };

  const rows = [
    { key: 'main', id: 'fbt-main', tag: 'This item', name: main.title, img: main.img, price: formatMoney(v.price), checked: mainOk, locked: true, self: true },
    ...items.map((i) => ({ key: i.key, id: 'fbt-' + i.key, tag: 'Accessory', name: i.name, img: i.img, price: 'From ' + formatMoney(i.line.unitPrice), checked: !!on[i.key], locked: false, self: false })),
  ];

  const label = done ? 'Added to cart' : `Add ${chosen.length} to cart`;

  return (
    <div className="flex flex-wrap items-center gap-3.5 lg:gap-8">
      <ul className="m-0 grid flex-[999_1_640px] list-none grid-cols-1 gap-2.5 p-0 lg:grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] lg:gap-4">
        {rows.map((r) => (
          <li key={r.key} className={'flex items-center gap-3 rounded-[14px] border-2 bg-surface p-3 lg:gap-3.5 lg:rounded-card lg:p-3.5 ' + (r.checked ? 'border-brand-600' : 'border-transparent')}>
            <input
              type="checkbox"
              id={r.id}
              checked={r.checked}
              disabled={r.locked}
              onChange={() => !r.locked && setOn((s) => ({ ...s, [r.key]: !s[r.key] }))}
              className="m-0 size-[22px] flex-none accent-brand-600"
            />
            <span className="flex size-[72px] flex-none items-center justify-center overflow-hidden rounded-lg bg-canvas max-lg:hidden">
              {r.img && <img src={sized(r.img, 160)} alt="" width={72} height={72} loading="lazy" className="product-shot size-full p-1" />}
            </span>
            <label htmlFor={r.id} className="flex flex-1 cursor-pointer flex-col gap-0.5 lg:gap-1">
              <span className="text-xs font-bold text-ink-500 max-lg:hidden">{r.tag}</span>
              <span className="text-sm leading-[19px] font-bold lg:text-[15px] lg:leading-5">
                {r.name}
                {r.self && <span className="lg:hidden"> (this item)</span>}
              </span>
              <span className="text-sm font-extrabold lg:text-[15px]">{r.self && !r.checked ? 'Sold out in this configuration' : r.price}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-[1_1_260px]">
        <span className="text-sm text-ink-700 max-lg:hidden">Total for {chosen.length} items</span>
        <span className="text-[32px] font-extrabold tracking-[-0.02em] max-lg:hidden" aria-live="polite">
          {formatMoney(total)}
        </span>
        <button type="button" onClick={addAll} disabled={!chosen.length} className={'h-14 rounded-[14px] text-base font-extrabold text-white max-lg:hidden ' + (done ? 'bg-success-700' : 'bg-brand-600 hover:bg-brand-700')}>
          {label}
        </button>
        <button type="button" onClick={addAll} disabled={!chosen.length} className={'h-[52px] w-full rounded-lg text-[15px] font-extrabold text-white lg:hidden ' + (done ? 'bg-success-700' : 'bg-ink-900 hover:bg-ink-950')}>
          {done ? label : `${label} · ${formatMoney(total)}`}
        </button>
      </div>
    </div>
  );
}
