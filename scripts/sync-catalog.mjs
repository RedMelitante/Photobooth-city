// Refreshes scripts/data/shopify-products.json from the live Shopify store,
// then rebuilds src/data/catalog.json. Prices/options come from the design
// snapshot; this only refreshes ids, SKUs, weights and image URLs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = process.env.SHOPIFY_STORE_URL ?? 'https://photoboothcity.com';

const products = [];
for (let page = 1; ; page++) {
  const res = await fetch(`${store}/products.json?limit=250&page=${page}`);
  if (!res.ok) throw new Error(`${res.status} fetching page ${page}`);
  const batch = (await res.json()).products;
  products.push(...batch);
  if (batch.length < 250) break;
}
const slim = products.map((p) => ({
  handle: p.handle, id: p.id, product_type: p.product_type, tags: p.tags,
  images: p.images.map((i) => ({ src: i.src, w: i.width, h: i.height, alt: i.alt })),
  variants: p.variants.map((v) => ({ id: v.id, title: v.title, sku: v.sku, grams: v.grams })),
}));
fs.writeFileSync(path.join(root, 'scripts/data/shopify-products.json'), JSON.stringify(slim));
console.log(`synced ${slim.length} products from ${store}`);
execFileSync('node', [path.join(root, 'scripts/build-catalog.mjs')], { stdio: 'inherit' });
