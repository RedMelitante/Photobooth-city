// Build-time catalog from the Medusa Store API, mapped to the storefront's
// Product / Collection shapes. Used by catalog.ts when Medusa is configured.
import { getRegionId, medusa, toCents } from './medusa';
import type { Collection, Product, RichBlock } from './types';

const PRODUCT_FIELDS = [
  'id',
  'handle',
  'title',
  'subtitle',
  'description',
  'metadata',
  '*images',
  '*options',
  '*options.values',
  '*categories',
  '*variants',
  '*variants.options',
  '*variants.calculated_price',
  '+variants.inventory_quantity',
].join(',');

interface MVariant {
  id: string;
  title: string;
  sku: string | null;
  weight: number | null;
  manage_inventory: boolean;
  allow_backorder: boolean;
  inventory_quantity?: number;
  options: { value: string; option_id: string }[];
  calculated_price?: { calculated_amount: number; original_amount: number };
}

interface MProduct {
  id: string;
  handle: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  images: { url: string }[];
  options: { id: string; title: string; values: { value: string }[] }[];
  categories: { handle: string }[];
  variants: MVariant[];
}

interface MCategory {
  handle: string;
  name: string;
  description: string;
  parent_category: { handle: string } | null;
  metadata: Record<string, any> | null;
}

async function listAll<T>(path: string, key: string, query: Record<string, string | number>): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await medusa<Record<string, any>>(path, { query: { ...query, limit: 50, offset }, auth: false });
    out.push(...page[key]);
    if (out.length >= page.count || !page[key].length) return out;
  }
}

function toProduct(p: MProduct): Product {
  const meta = p.metadata ?? {};
  const optionTitle = new Map(p.options.map((o) => [o.id, o.title]));
  const variants = p.variants.map((v) => {
    const price = toCents(v.calculated_price?.calculated_amount);
    const original = toCents(v.calculated_price?.original_amount);
    return {
      id: v.id,
      title: v.title,
      sku: v.sku,
      options: Object.fromEntries(v.options.map((o) => [optionTitle.get(o.option_id) ?? '', o.value])),
      price,
      compareAtPrice: original > price ? original : null,
      available: !v.manage_inventory || v.allow_backorder || (v.inventory_quantity ?? 0) > 0,
      weightGrams: v.weight,
      maxQuantity: v.manage_inventory && !v.allow_backorder ? Math.max(0, v.inventory_quantity ?? 0) : null,
    };
  });
  const prices = variants.map((v) => v.price);
  const compares = variants.map((v) => v.compareAtPrice ?? 0);
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    kind: p.subtitle ?? '',
    collection: meta.primary_category ?? p.categories[0]?.handle ?? '',
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    compareAtPrice: Math.max(...compares) || null,
    available: variants.some((v) => v.available),
    variantCount: variants.length,
    images: p.images.map((i) => ({ url: i.url, alt: p.title })),
    options: p.options.map((o) => ({ name: o.title, values: o.values.map((x) => x.value) })),
    variants,
    body: (meta.body as RichBlock[]) ?? (p.description ?? '').split('\n').filter(Boolean).map((text) => ({ type: 'p' as const, text })),
    lead: meta.lead ?? '',
    leadTime: meta.lead_time ?? '',
    note: meta.note ?? '',
    faq: meta.faq ?? null,
  };
}

export async function loadMedusaCatalog(): Promise<{ products: Product[]; collections: Collection[] }> {
  const region_id = await getRegionId();
  const raw = await listAll<MProduct>('/store/products', 'products', { region_id, fields: PRODUCT_FIELDS });
  const products = raw.map(toProduct);
  const cats = await listAll<MCategory>('/store/product-categories', 'product_categories', {
    fields: 'handle,name,description,metadata,*parent_category',
  });
  // The Store API doesn't list a category's products; invert product.categories.
  const membersOf = new Map<string, Set<string>>();
  for (const p of raw) for (const c of p.categories) (membersOf.get(c.handle) ?? membersOf.set(c.handle, new Set()).get(c.handle)!).add(p.handle);
  const collections: Collection[] = cats.map((c) => {
    const members = membersOf.get(c.handle) ?? new Set<string>();
    const ordered: string[] = (c.metadata?.product_order ?? []).filter((h: string) => members.has(h));
    const rest = [...members].filter((h) => !ordered.includes(h));
    return {
      handle: c.handle,
      title: c.name,
      parent: c.parent_category?.handle ?? null,
      intro: c.description ?? '',
      products: [...ordered, ...rest],
      related: c.metadata?.related ?? [],
      moreHeading: c.metadata?.more_heading ?? '',
      more: c.metadata?.more ?? [],
    };
  });
  return { products, collections };
}
