// Shapes follow Medusa v2 Store API concepts (product, variant, collection,
// cart line) but use plain cents so the bundled catalog and a live Medusa
// backend can share one storefront.

export interface ProductImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  options: Record<string, string>;
  /** cents */
  price: number;
  /** cents */
  compareAtPrice: number | null;
  available: boolean;
  weightGrams: number | null;
  /** most a customer can order; null = not limited (untracked or backorders allowed) */
  maxQuantity?: number | null;
}

export interface RichBlock {
  type: 'heading' | 'li' | 'p';
  text: string;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  /** short category line, e.g. "iPad photo booth" */
  kind: string;
  /** primary collection handle (breadcrumb) */
  collection: string;
  minPrice: number;
  maxPrice: number;
  compareAtPrice: number | null;
  available: boolean;
  variantCount: number;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  body: RichBlock[];
  lead: string;
  leadTime: string;
  note: string;
  faq: { heading: string; items: { q: string; a: string }[] } | null;
}

export interface Collection {
  handle: string;
  title: string;
  parent: string | null;
  intro: string;
  /** product handles, in merchandised order */
  products: string[];
  /** related collection handles shown as chips */
  related: string[];
  moreHeading: string;
  more: Omit<RichBlock, 'heading'>[];
}

export interface CartLine {
  /** variant id */
  id: string;
  handle: string;
  title: string;
  variantTitle: string;
  image: string;
  /** cents */
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  /** stock cap when the line was added; null/undefined = not limited */
  maxQuantity?: number | null;
  /** e.g. "ships within 3–5 days" (empty when the product has none) */
  leadTime?: string;
}
