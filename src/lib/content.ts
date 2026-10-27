// Content pages (about, contact, reviews, blog, policies): typed access to the
// copy extracted from the design files into src/data/content/*.json.
import policiesJson from '@/data/content/policies.json';
import articlesJson from '@/data/content/article.json';
import blogJson from '@/data/content/blog.json';
import reviewsJson from '@/data/content/reviews.json';
import aboutJson from '@/data/content/about.json';
import { designImage } from '@/lib/catalog';
import { PAGES } from '@/lib/routes';

// ── Policies ────────────────────────────────────────────────
export type PolicyKey = 'refund' | 'shipping' | 'terms' | 'privacy';
export interface PolicyBlock {
  /** p = paragraph, sub = sub-heading, li = bullet, xli = excluded item, kv = term/definition, note = placeholder left unfinished on the live site */
  type: 'p' | 'sub' | 'li' | 'xli' | 'kv' | 'note';
  text: string;
  key?: string;
}
export interface Policy {
  key: PolicyKey;
  slug: string;
  label: string;
  intro: string;
  glance: { value: string; label: string }[];
  contacts: { label: string; value: string; href: string | null }[];
  sections: { id: string; heading: string; blocks: PolicyBlock[] }[];
}
export const POLICY_ORDER: PolicyKey[] = ['refund', 'shipping', 'terms', 'privacy'];
const POLICIES = policiesJson as unknown as Record<PolicyKey, Policy>;
export const policyUrl = (key: PolicyKey) => PAGES[key];
export const listPolicies = (): Policy[] => POLICY_ORDER.map((k) => POLICIES[k]);
export const getPolicy = (slug: string) => listPolicies().find((p) => p.slug === slug);

// ── Blog ────────────────────────────────────────────────────
export type ArticleBlock =
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3' | 'p' | 'li' | 'calc'; text: string }
  | { type: 'table'; widths: number[]; head: string[]; align: string[]; rows: string[][] }
  | { type: 'shop' };
export interface Article {
  slug: string;
  title: string;
  category: string;
  crumb: string;
  date: string;
  dateISO: string;
  readTime: string;
  author: string;
  cover: { image: string; alt: string };
  lead: string;
  intro: string[];
  toc: { id: string; label: string }[];
  blocks: ArticleBlock[];
  shop: { label: string; items: { handle: string; name: string; price: string; cta: string; image: string | null }[] };
  package: { heading: string; blocks: { type: 'p' | 'li'; text: string }[]; ctas: string[] };
  faqHeading: string;
  faqs: { q: string; a: string }[];
  comments: { heading: string; note: string; button: string };
  relatedHeading: string;
  related: { title: string; bg: string; image: string }[];
}
const ARTICLES = articlesJson as unknown as Article[];
export const articleUrl = (slug: string) => `${PAGES.blog}/${slug}`;
export const listArticles = () => ARTICLES;
export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
/** Article URL for a post title, or null when there's no article body for it (yet). */
export const hrefForTitle = (title: string) => {
  const a = ARTICLES.find((x) => x.title === title);
  return a ? articleUrl(a.slug) : null;
};

export const BLOG = blogJson;
export const REVIEWS = reviewsJson;
export const ABOUT = aboutJson;

/** Design blob id (bare hex) -> image URL. */
export const img = (id: string | null | undefined) => (id ? designImage(id) : '');
