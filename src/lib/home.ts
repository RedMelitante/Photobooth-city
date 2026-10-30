// Homepage content, ported from the design canvas (Main.dc.html desktop,
// HomeMobile.dc.html mobile). Product rows are resolved against the catalog
// by handle; copy that only exists in the design lives here.
import { designImage, getProduct } from './catalog';
import { BOARD_URLS, collectionUrl } from './routes';
import type { Product } from './types';

/** Resolve a list of catalog handles, failing the build loudly if one is missing. */
function products(handles: string[]): Product[] {
  return handles.map((h) => {
    const p = getProduct(h);
    if (!p) throw new Error(`home: product "${h}" not found in catalog`);
    return p;
  });
}

/** "Shop photo booths", "View all booths", "Shop now" … (CollectionDesktop board) */
export const SHOP_URL = BOARD_URLS.CollectionDesktop;

export const GOOGLE_REVIEWS_URL =
  'https://www.google.com/maps/search/?api=1&query=Photobooth%20City&query_place_id=ChIJFf6rI_kzw4ARBfAy9F5YL3I';

export const RATING = { value: 4.5, count: 31 };

export const HERO = {
  image: designImage('/_blob/14857a3940efb44a6a6c9c367dda1cfd'),
  imageAlt:
    'Four guests in evening wear laughing with party props at a white Photobooth City photo booth with an LED-lit frame and print station on a city rooftop at night',
  /** "Best seller" chip on the hero photo (PDPDesktop board = Ring Roamer) */
  featured: 'ring-roamer-10-5-v2-app-controlled',
  featuredImage: designImage('/_blob/0a2f0b5e068aaf3643bdef1597361669'),
};

export const CATEGORIES = [
  { name: 'iPad Photo Booths', href: collectionUrl('ipad-booths'), sub: 'Ring Roamer, Helio Sport, Eclipse & more', img: designImage('/_blob/0a2f0b5e068aaf3643bdef1597361669') },
  { name: '360 Photo Booths', href: collectionUrl('360-booths'), sub: 'Motorized platforms & Overhead 360', img: designImage('/_blob/7a34810eee0a2f08cf08a74abd8b4fba') },
  { name: 'DSLR Photo Booths', href: collectionUrl('dslr-booths'), sub: 'Eco, M1, Marquee & Lumia M', img: designImage('/_blob/5d76e4cd0ba295b50d87be781fc1f15a') },
  { name: 'Accessories', href: collectionUrl('accessories'), sub: 'Backdrops, printers, cases & more', img: designImage('/_blob/1d40bc8a7b5d324c5eea0d84063b0f0f') },
];

// Design card name -> catalog handle
export const bestSellers = () =>
  products([
    '12v-rechargeable-battery-pack', // 12V Rechargeable Battery Pack
    'camera-hot-shoe-1', // Camera Hot Shoe
    'abrl160-stand-mount-flash-with-led-modeling-light', // ABRL160 Flash
    '360-photobooth-27-32-39-inch-motorized-4-led-panel-bundle-package', // 360 Photobooth 4-LED Panel Bundle
    'lumia-xl-photobooth-diy-shell', // Lumia XL Pro DIY Shell
    'roamer-stand', // Roamer Stand
  ]);

export const newArrivals = () =>
  products([
    'helio-v2-ipad-ringlight-photobooth', // Helio Sport
    'eclipse-ipad-photobooth-diy-shell', // Eclipse E5
    'lumia-m-basic-led-photobooth-diy-shell', // Lumia M Basic
    'marquee-photobooth-diy-shell', // Marquee
    'eco-non-led-photobooth-diy-shell', // Eco Non-LED
    'm1-dslr-photobooth', // M1 DSLR
    'overhead-360-photobooth', // Overhead 360
    'eco-led-photobooth-diy-shell', // Eco LED
  ]);

export const affordable = () =>
  products([
    '360-photobooth-motorized', // 360 Motorized
    'ring-roamer-10-5-v2-app-controlled', // Ring Roamer
    'dnp-ds620a-dye-sub-printer', // DNP DS620A | Dye Sub Printer (sold out)
    'eco-non-led-photobooth-diy-shell', // Eco Non-LED
    'wall-mount-photo-booth-for-sale', // Wall mount Ring Roamer
    'eco-led-photobooth-diy-shell', // Eco LED
  ]);

export const PROMO_POINTS = ['7% off entire order', 'On orders $3,500+', 'No usage limits', 'Valid on our online store', 'Fast shipping', 'Professional photo booths'];

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

/** `subShort` is the mobile wording where it differs. */
export const TRUST = [
  { title: 'Nationwide Shipping', sub: 'All 50 states + Puerto Rico', icon: 'globe' },
  { title: 'Easy Returns', sub: '7-day return window', icon: 'return' },
  { title: 'Secure Payment', sub: 'Encrypted checkout via Stripe', subShort: 'Encrypted via Stripe', icon: 'lock' },
  { title: 'Best Price Guaranteed', sub: 'On every booth we sell', subShort: 'On every booth', icon: 'tag' },
] as const;

/** `extra` is desktop-only trailing copy (the mobile board drops it). */
export const FAQS: { q: string; a: string; extra?: string }[] = [
  { q: 'What types of photo booths does Photobooth City offer?', a: 'Photobooth City offers a wide range of professional photo booths, including iPad photo booths, DSLR photo booths, 360 photo booths, mirror booths and vintage enclosed booths, plus printers, backdrops, travel cases and accessories.' },
  { q: 'Are your photo booths suitable for starting a photo booth business?', a: 'Yes. Our photo booths are designed for entrepreneurs, DJs, photographers, event planners, and rental companies, and our team can help you choose a setup that fits your events and budget.' },
  { q: 'Where do you ship?', a: 'We ship within the United States only — all 50 states and Puerto Rico. Economy shipping starts at $20 in the lower 48; for Hawaii, Alaska and Puerto Rico we quote shipping by phone.' },
  { q: 'Which photo booth is best for beginners?', a: 'For most new businesses, an iPad photo booth is an excellent starting point because it is portable, easy to operate and quick to set up at events.', extra: 'Call us and we will help you compare options.' },
  { q: 'Can I customize my photo booth with my company branding?', a: 'Yes. Many of our photo booths can be customized with your business logo, branded graphics, color options, and accessories.' },
];

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.extra ? `${f.a} ${f.extra}` : f.a },
    })),
  };
}

/** Section h2: 28/32 on mobile, 40/44 on desktop (Bricolage 700). */
export const H2 = 'm-0 font-display text-[28px] leading-8 font-bold tracking-[-0.02em] lg:text-[40px] lg:leading-[44px] lg:tracking-[-0.025em]';
