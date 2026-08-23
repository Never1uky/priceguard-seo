import { SEO_DEFAULT_ORIGIN } from '@/lib/routes';

export const SITE = {
  productName: 'PriceGuard AI',
  tagline: 'AI-анализы товаров с маркетплейсов — отзывы, плюсы и минусы, где дешевле',
  chromeStoreUrl:
    'https://chromewebstore.google.com/detail/priceguard-ai/ipaichogganccpnapdgkjldplllnjlpf',
  extensionId: 'ipaichogganccpnapdgkjldplllnjlpf',
} as const;

export function siteOrigin(): string {
  const raw =
    process.env.SEO_SITE_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SEO_SITE_ORIGIN?.trim() ||
    SEO_DEFAULT_ORIGIN;
  return raw.replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${siteOrigin()}${p}`;
}

/** Prefer dedicated SEO_PAGES_URL; else Supabase Edge function path. */
export function seoPagesEndpoint(): string | null {
  const explicit = process.env.SEO_PAGES_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const supabase = process.env.SUPABASE_URL?.trim();
  if (supabase) return `${supabase.replace(/\/$/, '')}/functions/v1/seo-pages`;
  return null;
}

export function supabaseUrl(): string | null {
  return process.env.SUPABASE_URL?.trim() || null;
}

export function supabaseServiceRoleKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

export function revalidateSecret(): string | null {
  return (
    process.env.SEO_REVALIDATE_SECRET?.trim() ||
    process.env.REVALIDATE_SECRET?.trim() ||
    null
  );
}
