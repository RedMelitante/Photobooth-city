# Photobooth City — Storefront + Medusa backend

The redesigned photoboothcity.com, built from the *Photobooth City — Storefront Redesign*
design canvas.

- **Storefront** (repo root): an **Astro 7** static site with **React 19** islands for anything interactive,
  **Tailwind CSS v4** using the design tokens as a CSS-first `@theme` (`src/styles/global.css`),
  and Manrope + Bricolage Grotesque self-hosted via Fontsource.
- **Backend** (`backend/`): **Medusa v2.22**, seeded with the store as it is on Shopify (76 products, 25
  categories, US region, Economy shipping tiers, California tax, FLASHSALE2026).

The storefront runs in two modes:

| Mode | When | Catalog | Cart, checkout, accounts |
| --- | --- | --- | --- |
| **Medusa** | `PUBLIC_MEDUSA_BACKEND_URL` + `PUBLIC_MEDUSA_PUBLISHABLE_KEY` set | Medusa Store API, read at build time | Real Medusa carts, orders and customer accounts |
| **Standalone** | env unset | bundled `src/data/catalog.json` | Browser-only stand-ins (no orders are created) |

## Run it

Needs Node 22+, PostgreSQL 15+ and Redis.

```bash
# 1. Backend
npm run backend:install
cp backend/apps/backend/.env.template backend/apps/backend/.env   # set DATABASE_URL, secrets
createdb medusa_pbc
npm run backend:migrate        # migrations + the Photobooth City seed (prints the publishable key)
npx --prefix backend/apps/backend medusa user -e you@photoboothcity.com -p <password>
npm run backend:dev            # API http://localhost:9000, admin http://localhost:9000/app

# 2. Storefront
npm install
cp .env.example .env           # paste the publishable key
npm run dev                    # http://localhost:4321
npm run build                  # static output in dist/ (re-run after catalog changes in Medusa)
```

Without step 1 and with `.env` left empty, `npm run dev` runs the storefront standalone.

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

## Deploying (Railway)

The test deployment is Railway project **photobooth-city** (four services: Postgres, Redis,
`backend`, `storefront`). Code is uploaded with the Railway CLI rather than linked to GitHub:

```bash
railway up backend --path-as-root --service backend      # Medusa
railway up . --path-as-root --service storefront         # Astro (backend/ excluded by .railwayignore)
```

Service settings (set in Railway, not in files):

| Service | Build | Pre-deploy | Start |
| --- | --- | --- | --- |
| backend | `cd apps/backend && npx medusa build` | `cd apps/backend/.medusa/server && npx medusa db:migrate` + admin user from `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD` | `cd apps/backend/.medusa/server && npx medusa start` |
| storefront | `npm run build` | none | `npx serve@14.2.4 dist -l tcp://0.0.0.0:$PORT` |

Backend variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `REDIS_URL=${{Redis.REDIS_URL}}`,
`JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS` (storefront URL), `ADMIN_CORS` (backend URL), `AUTH_CORS`
(both), `NODE_ENV=production`. Storefront variables: `PUBLIC_MEDUSA_BACKEND_URL`,
`PUBLIC_MEDUSA_PUBLISHABLE_KEY`. The storefront reads the catalog at build time, so redeploy it after
changing products in the admin.

## The backend (`backend/`)

Medusa's DTC starter (a Turborepo workspace; the app is `backend/apps/backend`). Read
`backend/AGENTS.md` before changing it.

`src/migration-scripts/initial-data-seed.ts` runs once with `db:migrate` and sets up:

- **Sales channel** "Online Store" plus a publishable API key
- **Region** "United States" (US + Puerto Rico, USD). Payment providers: the system provider, and Stripe when `STRIPE_API_KEY` is set
- **Tax** California only: 8.75% (the Mira Loma rate), with shipping excluded. Every other state is 0%
- **Warehouse** Mira Loma, 3827 Wacker Dr.
- **Shipping** Economy (5–8 business days) to the contiguous US, priced by order value: $20 up to $50, $50 to $499, $100 to $1,800, $200 above
- **Categories** the 25 storefront collections; merchandised order is kept in `metadata.product_order`
- **Products** all 76 products and 889 variants, with Shopify image URLs. Compare-at prices are the base price, and the "Storefront sale prices" price list (332 prices) holds what the item actually sells for
- **Inventory** 25 units for each available variant and 0 for sold-out ones (Shopify doesn't track stock)
- **Promotion** FLASHSALE2026: 7% off items when the item subtotal is $3,500 or more

The rules live in `src/lib/store-config.ts`. The storefront mirrors them in `src/lib/commerce.ts`
so it can show totals before the API answers, so change both together. The seed's catalog is
`backend/apps/backend/src/data/catalog.json`; `node scripts/build-catalog.mjs` writes it alongside the
storefront's copy.

## Emails

When an order is placed (`order.placed`), `backend/apps/backend/src/subscribers/order-placed.ts` sends
the customer an order confirmation and the store a "new order" alert (`ORDER_ALERT_EMAIL`, default
info@photoboothcity.com), once each. Templates are code (`src/lib/emails`); the provider
(`src/modules/resend-email`) sends through [Resend](https://resend.com) when `RESEND_API_KEY` is set and
otherwise writes the rendered HTML to `<tmp>/pbc-emails/` and logs it.

Backend variables: `RESEND_API_KEY`, `EMAIL_FROM` (a sender on a domain verified in Resend),
`EMAIL_REPLY_TO`, `ORDER_ALERT_EMAIL`, `STOREFRONT_URL` and `MEDUSA_BACKEND_URL` (for the logo and links).

## How the storefront talks to Medusa

| Concern | File | What it does |
| --- | --- | --- |
| Catalog | `src/lib/medusa-catalog.ts` | Build time: products, prices, inventory and categories from `/store/products` and `/store/product-categories` |
| Cart | `src/lib/medusa-cart.ts` | Mirrors the local cart into a Medusa cart: line items, then FLASHSALE2026 once it qualifies; transfers a guest cart to the customer at login |
| Checkout | `src/lib/medusa-checkout.ts` | Email + address → shipping method → payment session → `complete` → order `#PBC<display id>` |
| Accounts | `src/lib/medusa-account.ts` | Emailpass register/login/reset, profile, orders, saved addresses |

## Before launch

| Item | Status | What's needed |
| --- | --- | --- |
| **Stripe** | The backend's Stripe provider turns on with `STRIPE_API_KEY`. The checkout's card fields are still a visual stand-in; with no Stripe key, Medusa's system provider authorizes every order (dev only). | Stripe keys. Then mount Stripe's Payment Element in `src/components/checkout/PaymentStep.tsx` with the session's `client_secret` and call `stripe.confirmPayment` before `completeOrder()`. Set the webhook to `/hooks/payment/stripe_stripe`. |
| **PayPal** | Not available | Medusa has no first-party PayPal provider; a community plugin or a custom provider is needed. |
| **Hawaii, Alaska, Puerto Rico shipping** | The "UPS + USPS" option exists but is hidden, so checkout asks these customers to call. | A carrier-rate fulfillment provider (ShipStation, EasyPost or Shippo); then enable the option. |
| **Tax** | A flat 8.75% California rate | For destination rates, a tax provider such as Stripe Tax. |
| **Order numbers** | Medusa counts from 1 (`#PBC1`) | To continue Shopify's numbering, restart Postgres's `order_display_id_seq` from the last Shopify number. |
| **Emails** | Order confirmation + store alert built; sent once `RESEND_API_KEY` is set | Resend account with photoboothcity.com verified. Password-reset email not built yet. |
| **Contact, newsletter, blog comments** | Show success but send nothing | Wire `src/lib/content-forms.ts` to a form endpoint or helpdesk. |
| **Copy** | Placeholders are marked `[in brackets]`, as in the design | Content from the client. |

## Project layout

```
src/                     storefront
  styles/global.css      Tailwind v4 theme = the design tokens
  layouts/Layout.astro   head, header, mobile menu, footer, cart drawer
  components/            shared Astro components + react/ islands, one folder per page area
  lib/
    catalog.ts           product + collection queries (Medusa or bundled)
    cart.ts              nanostores cart, persisted to localStorage, synced to Medusa
    commerce.ts          promo, shipping, tax, store details (mirror of the backend rules)
    medusa*.ts           Medusa client, catalog, cart, checkout, accounts
  data/catalog.json      generated, don't edit by hand
scripts/
  build-catalog.mjs      design snapshot + Shopify images -> catalog.json (storefront + backend seed)
  sync-catalog.mjs       refresh the Shopify snapshot, then rebuild the catalog
backend/                 Medusa v2 (apps/backend: config, seed, store-config)
public/images/           logo + editorial images exported from the design
```

## Catalog data

`scripts/data/design-catalog.json` is the catalog as captured in the design: titles, prices,
compare-at prices, options, variants, descriptions and FAQs. `scripts/data/shopify-products.json`
adds Shopify ids, SKUs, weights and image URLs. Product photos load from Shopify's CDN. Once Medusa
holds the catalog, edit products in the Medusa admin and rebuild the storefront.

```bash
npm run sync:catalog             # re-pull products.json from photoboothcity.com and rebuild
node scripts/build-catalog.mjs   # rebuild offline from the snapshots
```
