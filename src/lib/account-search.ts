// Static (non-catalog) entries for the search page's Articles and Pages tabs,
// plus the popular chips and the empty-state categories. Copy from the
// Search design board.
import { collectionUrl, PAGES } from './routes';

export const SITE_PAGES = [
  { t: 'About Us', d: 'Professional photo booth equipment for event businesses — we sell equipment, we don’t book rentals.', h: PAGES.about },
  { t: 'Contact Us', d: 'Questions about a booth or an order? Send us a message or call 1 (888) 312-4449.', h: PAGES.contact },
  { t: 'Google Reviews', d: 'Rated 4.5 on Google from 31 reviews.', h: PAGES.reviews },
  { t: 'Blog', d: 'Guides on starting, running and marketing a photo booth business.', h: PAGES.blog },
  { t: 'Refund Policy', d: 'Returns, restocking fee, damaged shipments, warranty and clearance sales.', h: PAGES.refund },
  { t: 'Shipping Policy', d: 'Delivery time-frames, US shipping rates and carriers.', h: PAGES.shipping },
  { t: 'Terms of Service', d: 'Store terms, commercial terms and the 360 safety clause.', h: PAGES.terms },
  { t: 'Privacy Policy', d: 'How personal information is collected, used and shared.', h: PAGES.privacy },
  { t: 'Log in or create an account', d: 'Track orders and check out faster.', h: PAGES.login },
];

/**
 * Blog articles. `article: true` marks the one with its own page on the new
 * site; the rest link to the blog index, as in the design.
 * Images are design image ids, resolved by the page with designImage().
 */
export const SITE_ARTICLES = [
  { t: 'How Much Does It Cost to Start a Photo Booth Business?', img: '/_blob/ccc1b2fb9df3ff9df0bb24795c010b4d', article: true },
  { t: 'How a 12V Rechargeable Battery Pack Can Improve Your Photo Booth Setup', img: '/_blob/a4832068cbe388d07363507aa2f5743f' },
  { t: 'Are Photobooth City’s Photo Booths Suitable for Starting a Photo Booth Business?', img: '/_blob/448a4026d8fab481d7b1cf983bba656d' },
  { t: 'Photo Booth Marketing Ideas: How to Get More Bookings for Your Rental Business', img: '/_blob/38970cc10b1e52aa5d883dcb96cbfd32' },
  { t: '10 Photo Booth Ideas That Will Make Your Event Stand Out', img: '/_blob/0f98e77e1d4a7afa71bd4ee1ce8fbd23' },
  { t: 'Portable Photo Booth vs Traditional Booth: Which One Is Best for Your Events?', img: '/_blob/da0ac0053b2a34ba62d1180a31bc381b' },
];

export const POPULAR_SEARCHES = ['iPad booth', '360', 'DSLR', 'Backdrop', 'Printer', 'Travel case'];

export const SEARCH_FALLBACK = [
  { t: 'iPad booths', h: collectionUrl('ipad-booths') },
  { t: 'DSLR booths', h: collectionUrl('dslr-booths') },
  { t: '360 booths', h: collectionUrl('360-booths') },
  { t: 'Accessories', h: collectionUrl('accessories') },
];
