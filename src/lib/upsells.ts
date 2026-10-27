import { getProduct } from './catalog';
import { toCartLine } from './product';
import type { Upsell } from '@/components/react/CartPanel';

// Cart drawer cross-sells: when the first product is in the cart, offer the second.
const PAIRS: [when: string, offer: string][] = [
  ['ring-roamer-10-5-v2-app-controlled', 'ring-roamer-wall-mount-bracket'],
  ['ring-roamer-sapphire-pro-ipad-mirror-photobooth', 'ring-roamer-wall-mount-bracket'],
  ['mini-ring-roamer', 'roamer-stand'],
  ['roamer-stand', '12v-rechargeable-battery-pack'],
];

export function cartUpsells(): Upsell[] {
  return PAIRS.flatMap(([when, offer]) => {
    const w = getProduct(when);
    const p = getProduct(offer);
    if (!w || !p || !p.available) return [];
    const v = p.variants.find((x) => x.available) ?? p.variants[0];
    const short = w.title.replace(/ Photo Booth.*$| \|.*$/, '');
    return [{ when, line: toCartLine(p, v), label: `Pairs with ${short}` }];
  });
}
