// Homepage content (v2), ported from the design canvas (Main.dc.html; the
// mobile layout is the same board with `mobile`). Products are resolved
// against the catalog by handle; copy that only exists in the design lives here.
import { SPOTLIGHT_ART, type SpotlightArt } from './spotlight-art';
import { cardCategory, collectionsFor, designImage, getProduct, listProducts } from './catalog';
import { toCardProduct, type CardProduct } from './collection';
import { priceLabel } from './money';
import { collectionUrl, PAGES, productUrl } from './routes';
import type { Product } from './types';

/** Resolve a catalog handle, failing the build loudly if it is missing. */
function product(handle: string): Product {
  const p = getProduct(handle);
  if (!p) throw new Error(`home: product "${handle}" not found in catalog`);
  return p;
}

export const GOOGLE_REVIEWS_URL =
  'https://www.google.com/maps/search/?api=1&query=Photobooth%20City&query_place_id=ChIJFf6rI_kzw4ARBfAy9F5YL3I';

export const RATING = { value: 4.5, count: 31 };

/** Social/OG image for the homepage (the rooftop event photo). */
export const HERO = {
  image: designImage('/_blob/14857a3940efb44a6a6c9c367dda1cfd'),
};

/* ------------------------------------------------------------------ Hero */

export interface SpotlightSlide {
  idx: string;
  type: string;
  name: string;
  href: string;
  price: string;
  art: SpotlightArt;
  alt: string;
  c1: string;
  c2: string;
}

// Cut-outs and copy from the client reference site (src/lib/spotlight-art.ts).
const SPOTLIGHT = [
  { handle: 'helio-v2-ipad-ringlight-photobooth', name: 'Helio Sport', type: 'iPad', art: 'helio', c1: 'Tilting halo head', c2: 'Aluminum enclosure', alt: 'Helio Sport booth with round halo light and white pedestal' },
  { handle: 'lumia-m-basic-led-photobooth-diy-shell', name: 'Lumia M Basic', type: 'DSLR', art: 'lumia', c1: 'Tilt-head shell', c2: 'LED edge lighting', alt: 'White Lumia M Basic booth with color LED edging' },
  { handle: '360-photobooth-27-32-39-inch-motorized-4-led-panel-bundle-package', name: 'Motorized 360 Bundle', type: '360°', art: 'orbit', c1: 'Rotating camera arm', c2: 'Motorized platform', alt: 'Motorized 360 booth platform with camera arm and ring light' },
] as const;

export function spotlightSlides(): SpotlightSlide[] {
  return SPOTLIGHT.map((s, i) => {
    const p = product(s.handle);
    return {
      idx: `0${i + 1}`,
      type: s.type,
      name: s.name,
      href: productUrl(p.handle),
      price: priceLabel(p.minPrice, p.maxPrice),
      art: SPOTLIGHT_ART[s.art],
      alt: s.alt,
      c1: s.c1,
      c2: s.c2,
    };
  });
}

export const FORMATS = [
  { t: 'iPad booths', h: collectionUrl('ipad-booths'), icon: 'ipad' },
  { t: 'DSLR booths', h: collectionUrl('dslr-booths'), icon: 'dslr' },
  { t: '360° booths', h: collectionUrl('360-booths'), icon: '360' },
  { t: 'Accessories', h: collectionUrl('accessories'), icon: 'acc' },
] as const;

/* --------------------------------------------------------------- Catalog */

/** Category chips: [filter key, label]. */
export const CATALOG_CHIPS: [string, string][] = [
  ['all', 'All products'],
  ['ipad', 'iPad booths'],
  ['dslr', 'DSLR booths'],
  ['360', '360° booths'],
  ['mirror', 'Mirror & vintage'],
  ['system', 'System packages'],
  ['acc', 'Accessories'],
  ['dj', 'DJ gear'],
];

/** Top-level collection -> chip key (sub-collections resolve through their parent). */
const CHIP_FOR_COLLECTION: Record<string, string> = {
  'ipad-booths': 'ipad',
  'dslr-booths': 'dslr',
  '360-booths': '360',
  'mirror-diy-shells': 'mirror',
  'system-packages': 'system',
  accessories: 'acc',
  'dj-gear': 'dj',
};

/** The board's merchandised order (its P list); every other product follows in catalog order. */
const CATALOG_ORDER = [
  'helio-v2-ipad-ringlight-photobooth',
  'lumia-m-basic-led-photobooth-diy-shell',
  '360-photobooth-27-32-39-inch-motorized-4-led-panel-bundle-package',
  'ring-roamer-10-5-v2-app-controlled',
  'm1-dslr-photobooth',
  'eclipse-ipad-photobooth-diy-shell',
  'allure-ipad-plus-dslr-photobooth-diy-shell',
  'the-lounge-ipad-based-vintage-enclosed-photo-booth',
  'marquee-photobooth-system-package-deal',
  'dnp-dsrx1hs-dye-sub-printer',
  'custom-360-led-backdrop-3-panels',
  'roamer-stand',
  '12v-rechargeable-battery-pack',
  'manual-360-booth',
  '360-photobooth-motorized',
  'ring-roamer-sapphire-pro-ipad-mirror-photobooth',
  'lumia-xl-photobooth-diy-shell',
  'flare-ipad-photobooth-system-package',
  'eco-led-photobooth-system-package',
  'vogue-photo-booth-led-enclosure',
  'dj-console',
  'abrl160-stand-mount-flash-with-led-modeling-light',
];

export type CatalogCard = CardProduct & { keys: string[] };

function chipKeys(p: Product, cat: string): string[] {
  const keys = new Set<string>();
  for (const c of collectionsFor(p.handle)) {
    const k = CHIP_FOR_COLLECTION[c.handle] ?? (c.parent ? CHIP_FOR_COLLECTION[c.parent] : undefined);
    if (k) keys.add(k);
  }
  if (cat === 'Mirror & vintage') keys.add('mirror');
  return [...keys];
}

/** Every product as a slim card, in merchandised order, with its chip keys. */
export function catalogCards(): CatalogCard[] {
  const all = listProducts();
  const first = CATALOG_ORDER.map((h) => getProduct(h)).filter((p): p is Product => !!p);
  const seen = new Set(first.map((p) => p.handle));
  const ordered = [...first, ...all.filter((p) => !seen.has(p.handle))];
  return ordered.map((p, i) => {
    const cat = cardCategory(p);
    return { ...toCardProduct(p, i, cat), keys: chipKeys(p, cat) };
  });
}

export const CATALOG_LINKS = {
  browse: PAGES.search,
  /** "Browse all N products" after Load more: the all-collections index. */
  all: '/collections',
};

/* ----------------------------------------------------------------- Guide */

export const GUIDE = [
  { n: '01', t: 'Easy, portable photos', d: 'Choose iPad for a compact setup or a handheld booth that moves through the room.', h: collectionUrl('ipad-booths') },
  { n: '02', t: 'More control over the shot', d: 'Choose a DSLR shell when you want to build around a dedicated camera and lighting.', h: collectionUrl('dslr-booths') },
  { n: '03', t: 'Wraparound video', d: 'Choose a motorized 360° platform for moving clips. Plan room for the arm to rotate.', h: collectionUrl('360-booths') },
];

export const GUIDE_PHOTO = {
  src: '/images/hero-rooftop2.webp',
  alt: 'Four guests in evening wear laughing with party props at a white Photobooth City photo booth with an LED-lit frame and print station on a city rooftop at night',
  caption: 'In the field · LED booth + print station, rooftop event',
};

/* --------------------------------------------------------------- Reviews */

export interface Review {
  name: string;
  short: string;
  text: string;
  when: string;
  photo: string;
  gurl: string;
}

export const REVIEWS: Review[] = [
  { name: 'Christina Luthy', short: 'I absolutely love my photobooth shell I purchased from photobooth city!', gurl: 'https://www.google.com/maps/contrib/105057239898745149249/reviews', photo: designImage('/_blob/4a1d5f1f70197153d73e16110446652a'), when: '5 months ago', text: 'I absolutely love my photobooth shell I purchased from photobooth city! I was skeptical at first because I knew nothing about the quality of products or customer service, but it has been phenomenal! I would purchase again from this company. All the electrical is working great, very sturdy and excellent quality.' },
  { name: 'Reginald Lutes', short: 'I purchased an iPad Photo booth stand, quick shipping, very well built…', gurl: 'https://www.google.com/maps/contrib/102775173204515585737/reviews', photo: designImage('/_blob/de727f90aeb0122dcf523f2f1a1ffe4f'), when: 'A year ago', text: 'I purchased an iPad Photo booth stand, quick shipping, very well built, I will definitely be using Photobooth City in the future, I highly recommend it to anyone, for your Photo booth needs.' },
  { name: 'Cali Parmenter', short: 'The customer service was exceptional! We got our equipment super fast and everything looked great!', gurl: 'https://www.google.com/maps/contrib/116446595511945395827/reviews', photo: designImage('/_blob/a6592c79022dca943515782ea5364864'), when: 'A year ago', text: 'The customer service was exceptional! We got our equipment super fast and everything looked great! Came with great instructions for putting everything together! Couldn’t be happier :)' },
  { name: 'Jason Nicholas', short: 'We bought this for our church and we use it all the time! Super easy set up and stores in a really nice case.', gurl: 'https://www.google.com/maps/contrib/103265812325257298357/reviews', photo: designImage('/_blob/d3e2168e5bd27024560e96aa821014c1'), when: 'A year ago', text: 'We bought this for our church and we use it all the time! Super easy set up and stores in a really nice case. It is very sturdy and is desined reall good! Wish we would have bought this a while ago. We use it for so many events, mothers day, fahters day, Christmas, Easter, student events and more.' },
  { name: 'Hunter Eagle', short: 'Fast and easy shipping. Constant support throughput the process. So far 5/5.', gurl: 'https://www.google.com/maps/contrib/106570429292510539095/reviews', photo: designImage('/_blob/27e3983417c1770e899e4311bf230388'), when: '2 years ago', text: "Fast and easy shipping. Constant support throughput the process. So far 5/5. The product was incredibly easy to set up, however most of the zip ties broke during shipping, I'd recommend not cutting them until they're delivered to the customer. Will further review when the product is up and running." },
];

/* ------------------------------------------------------------------- FAQ */

/** The board's five questions; shipping and payment answers follow the store's real rules. */
export const FAQS: { q: string; a: string }[] = [
  { q: 'What types of photo booths do you offer?', a: 'Photobooth City offers a wide range of professional photo booths, including iPad photo booths, DSLR photo booths, 360 photo booths, mirror booths and vintage enclosed booths, plus printers, backdrops, travel cases and accessories.' },
  { q: 'Where do you ship?', a: 'We ship within the United States only — all 50 states and Puerto Rico. Economy shipping starts at $20; for Hawaii, Alaska and Puerto Rico we quote shipping by phone.' },
  { q: 'Which photo booth is best for beginners?', a: 'For most new businesses, an iPad photo booth is an excellent starting point because it is portable, easy to operate and quick to set up at events. Call us and we will help you compare options.' },
  { q: 'Can I customize a booth for my brand?', a: 'Yes. Many of our photo booths can be customized with your business logo, branded graphics, color options, and accessories.' },
  { q: 'Can I pay over time?', a: 'Checkout currently takes card payments: Visa, Mastercard, American Express and Discover. If you would like to talk about financing, call our team at 1 (888) 312-4449.' },
];

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/* ----------------------------------------------------------- Shared type */

/** Section h2: 42px on mobile, 72px (display) on desktop. */
export const H2 = 'm-0 font-display text-[42px] leading-[0.99] font-extrabold tracking-[-0.073em] lg:text-display';
