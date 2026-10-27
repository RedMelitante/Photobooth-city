# Photobooth City — Storefront

The redesigned photoboothcity.com storefront, built from the *Photobooth City — Storefront Redesign*
design canvas.

- **Astro 7** static site, **React 19** islands for anything interactive
- **Tailwind CSS v4** with the design tokens as a CSS-first `@theme` (`src/styles/global.css`)
- Manrope + Bricolage Grotesque, self-hosted via Fontsource
- Runs on its own today, using a bundled catalog (76 products, 25 collections) taken from the live Shopify store. The data
  and cart layers are shaped so a **Medusa v2** backend can replace them (see *Going live*)

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview
```

Node 22+.

## What's in it

| Area | Routes | Notes |
| --- | --- | --- |
| Home | `/` | Hero, categories, featured booths, promo, reviews, FAQ |
| Collections | `/collections/:handle` (25) | Instant filters (URL params), sort, load more, mobile filter sheet |
| Products | `/products/:handle` (76) | Gallery with zoom + lightbox, variant pills (`?variant=`), sticky mobile add-to-cart |
| Cart | drawer + `/cart` | Steppers, FLASHSALE2026 (7% off at $3,500+) with progress nudge, cross-sells |
| Checkout | `/checkout`, `/checkout/return` | Address → Shipping → Payment → Confirmed; pay-later return page |
| Content | `/pages/about-us`, `/pages/contact`, `/pages/google-reviews`, `/blogs/news`, `/policies/*` | |
| Account | `/account/login`, `/account/register`, `/account`, `/search`, 404 | |

Store rules copied from Shopify live in `src/lib/commerce.ts`: the promo code, the Economy shipping tiers
($20 / $50 / $100 / $200 by order value), California-only tax and the US-only region.

## Project layout

```
src/
  styles/global.css      Tailwind v4 theme = the design tokens
  layouts/Layout.astro   head, header, mobile menu, footer, cart drawer
  components/            shared Astro components + react/ islands, one folder per page area
  lib/
    catalog.ts           product + collection queries (the backend seam)
    cart.ts              nanostores cart, persisted to localStorage, sync() hook for Medusa
    commerce.ts          promo, shipping, tax, store details
    routes.ts            URL helpers + menu structure
  data/catalog.json      generated, don't edit by hand
scripts/
  build-catalog.mjs      design snapshot + Shopify images -> src/data/catalog.json
  sync-catalog.mjs       refresh the Shopify snapshot, then rebuild the catalog
  data/                  snapshots the catalog is built from
public/images/           logo + editorial images exported from the design
```

## Catalog data

`scripts/data/design-catalog.json` is the catalog as captured in the design: titles, prices,
compare-at prices, options, variants, descriptions and FAQs. `scripts/data/shopify-products.json`
adds Shopify ids, SKUs, weights and image URLs. Product photos load from Shopify's CDN.

```bash
npm run sync:catalog   # re-pull products.json from photoboothcity.com and rebuild
node scripts/build-catalog.mjs   # rebuild offline from the snapshots
```

## Going live

These parts are deliberately stubbed. Each sits behind one function, so it can be swapped without touching the pages:

| Concern | Stub today | Replace with |
| --- | --- | --- |
| Catalog | `src/lib/catalog.ts` reads `catalog.json` at build time | Medusa Store API `/store/products`, `/store/collections` |
| Cart | `src/lib/cart.ts` → `sync()` is a no-op | Medusa carts (`/store/carts/:id/line-items`, promotions) |
| Payments | `src/lib/checkout-payments.ts` simulates success/decline | Stripe Payment Element + PayPal through Medusa payment sessions |
| Accounts | `src/lib/account.ts` (localStorage) | Medusa customer auth |
| Contact form | client-side only | your form endpoint / helpdesk |

Environment variables for the live setup are listed in `.env.example`.

Things that need the client before launch are marked `[in brackets]` in the copy, as in the design.
