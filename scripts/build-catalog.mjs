// Builds src/data/catalog.json from the design's catalog snapshot
// (scripts/data/design-catalog.json, taken from the live Shopify store)
// plus image URLs from scripts/data/shopify-products.json.
//
//   node scripts/build-catalog.mjs            # offline, from snapshots
//   node scripts/sync-catalog.mjs             # refresh shopify snapshot first
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const design = read('scripts/data/design-catalog.json');
const shopify = Object.fromEntries(read('scripts/data/shopify-products.json').map((p) => [p.handle, p]));

/** design blob id -> URL usable by the storefront */
const blobMap = {};
for (const f of fs.readdirSync(path.join(root, 'public/images/design'))) {
  blobMap[f.replace(/\.\w+$/, '')] = `/images/design/${f}`;
}

const MAX_IMAGES = 8;

const products = Object.entries(design.p).map(([handle, d]) => {
  const s = shopify[handle];
  const shopImages = (s?.images ?? []).slice(0, MAX_IMAGES).map((i) => ({
    url: i.src,
    width: i.w,
    height: i.h,
    alt: i.alt || d.t,
  }));
  d.img.forEach((blob, i) => {
    const id = blob.replace('/_blob/', '');
    if (!blobMap[id] && shopImages[i]) blobMap[id] = shopImages[i].url;
  });
  const optionNames = d.opts.map((o) => o.n);
  const variants = d.vars.map((v, i) => {
    const values = v.t.split(' / ');
    const sv = s?.variants.find((x) => x.title === v.t) ?? s?.variants[i];
    return {
      id: sv ? `variant_${sv.id}` : `variant_${handle}_${i}`,
      title: v.t,
      sku: sv?.sku || null,
      options: Object.fromEntries(optionNames.map((n, j) => [n, values[j] ?? values[0]])),
      price: Math.round(parseFloat(v.p) * 100),
      compareAtPrice: v.c ? Math.round(parseFloat(v.c) * 100) : null,
      available: !!v.a,
      weightGrams: sv?.grams ?? null,
    };
  });
  return {
    id: s ? `prod_${s.id}` : `prod_${handle}`,
    handle,
    title: d.t,
    kind: d.k,
    collection: d.col,
    minPrice: Math.round(d.min * 100),
    maxPrice: Math.round(d.max * 100),
    compareAtPrice: d.cmp ? Math.round(d.cmp * 100) : null,
    available: !!d.av,
    variantCount: d.nv,
    images: shopImages.length ? shopImages : d.img.map((b) => ({ url: blobMap[b.replace('/_blob/', '')] ?? '', alt: d.t })),
    options: d.opts.map((o) => ({ name: o.n, values: o.v })),
    variants,
    body: d.body.map((b) => ({ type: b.h ? 'heading' : b.li ? 'li' : 'p', text: b.x })),
    lead: d.lead || '',
    leadTime: d.lt || '',
    note: d.note || '',
    faq: d.faq ? { heading: d.faq.h, items: d.faq.items.map((f) => ({ q: f.q, a: f.a })) } : null,
  };
});

const collections = Object.entries(design.c).map(([handle, c]) => ({
  handle,
  title: c.t,
  parent: c.parent,
  intro: c.intro,
  products: c.items,
  related: c.chips,
  moreHeading: c.moreH || '',
  more: (c.more ?? []).map((b) => ({ type: b.li ? 'li' : 'p', text: b.x })),
}));

fs.writeFileSync(path.join(root, 'src/data/catalog.json'), JSON.stringify({ products, collections }, null, 1));
fs.writeFileSync(path.join(root, 'src/data/blob-map.json'), JSON.stringify(blobMap, null, 1));
console.log(`catalog: ${products.length} products, ${collections.length} collections, ${Object.keys(blobMap).length} images mapped`);
