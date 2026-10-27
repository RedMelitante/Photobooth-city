// URL helpers. Paths follow the existing Shopify store so links and SEO
// carry over (/products/:handle, /collections/:handle, /pages/…, /policies/…).

export const productUrl = (handle: string) => `/products/${handle}`;
export const collectionUrl = (handle: string) => `/collections/${handle}`;

export const PAGES = {
  home: '/',
  cart: '/cart',
  checkout: '/checkout',
  checkoutReturn: '/checkout/return',
  search: '/search',
  login: '/account/login',
  register: '/account/register',
  account: '/account',
  about: '/pages/about-us',
  contact: '/pages/contact',
  reviews: '/pages/google-reviews',
  blog: '/blogs/news',
  refund: '/policies/refund-policy',
  shipping: '/policies/shipping-policy',
  terms: '/policies/terms-of-service',
  privacy: '/policies/privacy-policy',
} as const;

/** Menu labels -> destinations (shared by header, mega menu, mobile menu). */
export const MENU_LINKS: Record<string, string> = {
  'Ring Roamer': productUrl('ring-roamer-10-5-v2-app-controlled'),
  'R-One': collectionUrl('r1-photobooth'),
  'Wall Mount': productUrl('wall-mount-photo-booth-for-sale'),
  'Helio Sport': productUrl('helio-v2-ipad-ringlight-photobooth'),
  Voyager: productUrl('ipad-ringlight-photo-booth-with-backlit-advertising-panel'),
  Eclipse: collectionUrl('eclipse-diy-shell'),
  Phantom: collectionUrl('phatom-photobooths'),
  'Allure (wooden booth)': productUrl('allure-ipad-plus-dslr-photobooth-diy-shell'),
  'Mini Ring Roamer': productUrl('mini-ring-roamer'),
  'Mini Roamer Pro': productUrl('mini-roamer-pro'),
  'Eco DSLR': collectionUrl('eco-diy-shells'),
  'M1 DSLR': collectionUrl('m1-photobooth'),
  'Marquee DSLR': collectionUrl('marquee-booth'),
  'Lumia M DSLR': collectionUrl('lumia-m-basic'),
  'Mirror Booth Package': collectionUrl('mirror-diy-shells'),
  '360 Booths': collectionUrl('360-booths'),
  'Vintage Enclosed Photo Booth': productUrl('the-lounge-ipad-based-vintage-enclosed-photo-booth'),
  'Vintage Enclosed': productUrl('the-lounge-ipad-based-vintage-enclosed-photo-booth'),
  Backdrops: collectionUrl('backdrops'),
  'Printers and Medias': collectionUrl('printers-and-medias'),
  'Roamer Accessories': collectionUrl('roamer-accessories'),
  'Printer Accessories': collectionUrl('printer-accessories'),
  Enclosures: collectionUrl('enclosures'),
  'Travel Cases': collectionUrl('travel-case'),
  'System Packages': collectionUrl('system-packages'),
  'DJ Gear': collectionUrl('dj-gear'),
  'Below $2000': collectionUrl('within-2000'),
  '$1000 – $1500': collectionUrl('1000-1500'),
  '$1500 – $2500': collectionUrl('1500-2500'),
  'Above $2000': collectionUrl('above-2000'),
  'Shop by Price': collectionUrl('within-2000'),
  'iPad Based Booths': collectionUrl('ipad-booths'),
  'iPad Booths': collectionUrl('ipad-booths'),
  'iPad & Windows Based Booths': collectionUrl('dslr-booths'),
  'DSLR Booths': collectionUrl('dslr-booths'),
  Accessories: collectionUrl('accessories'),
  'Clearance Sale': collectionUrl('clearance-sale'),
};

export const menuHref = (label: string) => MENU_LINKS[label] ?? '';

export const NAV_LINKS = ['iPad Booths', 'DSLR Booths', '360 Booths', 'Mirror Booth Package', 'Vintage Enclosed', 'Accessories', 'System Packages', 'DJ Gear', 'Shop by Price'];

export interface MenuGroup {
  title: string;
  items: string[];
}

/** Mega menu: four columns of groups (desktop). */
export const MEGA_COLUMNS: MenuGroup[][] = [
  [{ title: 'iPad Based Booths', items: ['Ring Roamer', 'R-One', 'Wall Mount', 'Helio Sport', 'Voyager', 'Eclipse', 'Phantom', 'Allure (wooden booth)', 'Mini Ring Roamer', 'Mini Roamer Pro'] }],
  [
    { title: 'iPad & Windows Based Booths', items: ['Eco DSLR', 'M1 DSLR', 'Marquee DSLR', 'Lumia M DSLR'] },
    { title: 'More booths', items: ['Mirror Booth Package', '360 Booths', 'Vintage Enclosed Photo Booth'] },
  ],
  [
    { title: 'Accessories', items: ['Backdrops', 'Printers and Medias', 'Roamer Accessories', 'Printer Accessories', 'Enclosures', 'Travel Cases'] },
    { title: 'Bundles & gear', items: ['System Packages', 'DJ Gear'] },
  ],
  [{ title: 'Shop by Price', items: ['Below $2000', '$1000 – $1500', '$1500 – $2500', 'Above $2000'] }],
];

/** Mobile accordion menu. */
export const MOBILE_GROUPS: (MenuGroup & { hot?: boolean })[] = [
  { title: 'iPad Based Booths', items: MEGA_COLUMNS[0][0].items },
  { title: 'iPad & Windows Based Booths', items: ['Eco DSLR', 'M1 DSLR', 'Marquee DSLR', 'Lumia M DSLR'] },
  { title: 'Mirror Booth Package', items: [] },
  { title: '360 Booths', items: [] },
  { title: 'Accessories', items: MEGA_COLUMNS[2][0].items },
  { title: 'Vintage Enclosed Photo Booth', items: [] },
  { title: 'System Packages', items: [] },
  { title: 'DJ Gear', items: [] },
  { title: 'Shop by Price', items: MEGA_COLUMNS[3][0].items },
  { title: 'Clearance Sale', items: [], hot: true },
];

export const FOOTER_COLUMNS = [
  { title: 'Shop', links: [['iPad Photo Booths', collectionUrl('ipad-booths')], ['DSLR Photo Booths', collectionUrl('dslr-booths')], ['360 Photo Booths', collectionUrl('360-booths')], ['Accessories', collectionUrl('accessories')], ['Clearance Sale', collectionUrl('clearance-sale')]] },
  { title: 'Company', links: [['Marketing Services', PAGES.contact], ['About Us', PAGES.about], ['Contact', PAGES.contact], ['Blogs', PAGES.blog], ['Google Reviews', PAGES.reviews]] },
  { title: 'Policies', links: [['Refund Policy', PAGES.refund], ['Shipping Policy', PAGES.shipping], ['Terms of Service', PAGES.terms], ['Privacy Policy', PAGES.privacy]] },
] as const;

/**
 * Design board file -> URL. Used when porting links from the design canvas
 * (e.g. "C-Eclipse.dc.html" -> /collections/eclipse-diy-shell).
 */
export const BOARD_URLS: Record<string, string> = {
  Main: '/', HomeMobile: '/',
  CollectionDesktop: collectionUrl('ipad-booths'), CollectionMobile: collectionUrl('ipad-booths'),
  PDPDesktop: productUrl('ring-roamer-10-5-v2-app-controlled'), PDPMobile: productUrl('ring-roamer-10-5-v2-app-controlled'),
  CartPage: PAGES.cart, CartMobile: PAGES.cart, Checkout: PAGES.checkout, CheckoutMobile: PAGES.checkout,
  AboutUs: PAGES.about, Contact: PAGES.contact, Reviews: PAGES.reviews, Blog: PAGES.blog,
  Policy: PAGES.refund, PolicyShipping: PAGES.shipping, PolicyTerms: PAGES.terms, PolicyPrivacy: PAGES.privacy,
  Login: PAGES.login, Register: PAGES.register, Account: PAGES.account, Search: PAGES.search,
};
