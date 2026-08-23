import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  seoPagesEndpoint,
  supabaseServiceRoleKey,
  supabaseUrl,
} from '@/lib/config';
import { normalizeImageUrl, normalizeQualityScore, sanitizeProductTitle } from '@/lib/format';
import type { SeoDetailPage, SeoHubItem, SeoListItem } from '@/lib/types';

const LIST_SELECT =
  'slug, canonical_path, title, brand, brand_slug, category, category_slug, quality_score, review_count, price_current, currency, image_url, product_url, marketplace, product_id, published_at, updated_at, analyzed_at, analysis_snapshot';

const DETAIL_SELECT = `${LIST_SELECT}, offers_snapshot, rating, publish_status, view_count, is_primary, primary_slug, canon_id`;

const DETAIL_SELECT_FALLBACK = `${LIST_SELECT}, offers_snapshot, rating, publish_status, view_count`;

const HUB_MIN_COUNT = 2;

type Action =
  | { action: 'get'; slug: string }
  | { action: 'brand'; brandSlug: string; limit?: number }
  | { action: 'category'; categorySlug: string; limit?: number }
  | { action: 'search'; q: string; limit?: number }
  | { action: 'related'; slug: string; limit?: number }
  | { action: 'latest'; limit?: number; cursor?: string }
  | { action: 'hubs'; minCount?: number }
  | { action: 'sitemap'; limit?: number; cursor?: string };

/** Map DB/API row → list props (normalize score/image/title; marketplace optional). */
export function listItemFromRow(row: Record<string, unknown>): SeoListItem {
  const snap = row.analysis_snapshot as Record<string, unknown> | null | undefined;
  const summary =
    typeof snap?.qualitySummary === 'string' ? snap.qualitySummary.slice(0, 220) : null;
  const rawTitle = String(row.title ?? '');
  const title = sanitizeProductTitle(rawTitle) || rawTitle;
  const mpRaw = row.marketplace;
  const marketplace =
    mpRaw == null || String(mpRaw).trim() === '' ? null : String(mpRaw);
  return {
    slug: String(row.slug ?? ''),
    canonicalPath: String(row.canonical_path ?? `/a/${row.slug}`),
    title,
    brand: (row.brand as string | null) ?? null,
    brandSlug: (row.brand_slug as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    categorySlug: (row.category_slug as string | null) ?? null,
    qualityScore: normalizeQualityScore(
      row.quality_score == null ? null : Number(row.quality_score),
    ),
    reviewCount: Number(row.review_count ?? 0),
    priceCurrent: row.price_current == null ? null : Number(row.price_current),
    currency: String(row.currency ?? 'RUB'),
    imageUrl: normalizeImageUrl(
      row.image_url == null ? null : String(row.image_url),
    ),
    productUrl: (row.product_url as string | null) ?? null,
    marketplace,
    productId: String(row.product_id ?? ''),
    publishedAt: (row.published_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
    analyzedAt: (row.analyzed_at as string | null) ?? null,
    summary,
    isPrimary: row.is_primary !== false,
    primarySlug: row.primary_slug ? String(row.primary_slug) : null,
    canonId: row.canon_id ? String(row.canon_id) : null,
  };
}

export function detailFromRow(row: Record<string, unknown>): SeoDetailPage {
  const base = listItemFromRow(row);
  const snap = (row.analysis_snapshot as SeoDetailPage['analysis']) ?? null;
  const analysis =
    snap == null
      ? null
      : {
          ...snap,
          qualityScore: normalizeQualityScore(
            snap.qualityScore ?? base.qualityScore,
          ),
        };
  return {
    ...base,
    rating: row.rating == null ? null : Number(row.rating),
    analysis,
    offers: Array.isArray(row.offers_snapshot)
      ? (row.offers_snapshot as SeoDetailPage['offers'])
      : [],
    viewCount: row.view_count == null ? 0 : Number(row.view_count),
  };
}

function serviceClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function callSeoPages<T>(params: Action): Promise<T | null> {
  const endpoint = seoPagesEndpoint();
  if (!endpoint) return null;

  const url = new URL(endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    console.error('[seo-pages]', res.status, await res.text().catch(() => ''));
    return null;
  }

  return (await res.json()) as T;
}

function relatedRankScore(
  item: SeoListItem,
  brandSlug: string | null,
  categorySlug: string | null,
): number {
  const sameBrand = Boolean(brandSlug && item.brandSlug === brandSlug);
  const sameCat = Boolean(categorySlug && item.categorySlug === categorySlug);
  if (sameBrand && sameCat) return 300;
  if (sameCat) return 200;
  if (sameBrand) return 100;
  return 0;
}

async function relatedFromSupabase(slug: string, limit: number): Promise<SeoListItem[]> {
  const sb = serviceClient();
  if (!sb) return [];
  const { data: page, error: pageErr } = await sb
    .from('seo_product_pages')
    .select('slug, brand_slug, category_slug')
    .eq('slug', slug)
    .eq('publish_status', 'published')
    .maybeSingle();
  if (pageErr || !page) return [];

  const brandSlug = page.brand_slug ? String(page.brand_slug) : null;
  const categorySlug = page.category_slug ? String(page.category_slug) : null;
  if (!brandSlug && !categorySlug) return [];

  let query = sb
    .from('seo_product_pages')
    .select(LIST_SELECT)
    .eq('publish_status', 'published')
    .neq('slug', slug)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(50, Math.max(limit * 4, 24)));

  if (brandSlug && categorySlug) {
    query = query.or(`brand_slug.eq.${brandSlug},category_slug.eq.${categorySlug}`);
  } else if (brandSlug) {
    query = query.eq('brand_slug', brandSlug);
  } else if (categorySlug) {
    query = query.eq('category_slug', categorySlug);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[])
    .map(listItemFromRow)
    .sort(
      (a, b) =>
        relatedRankScore(b, brandSlug, categorySlug) -
        relatedRankScore(a, brandSlug, categorySlug),
    )
    .slice(0, limit);
}

export async function getPublishedPage(slug: string): Promise<SeoDetailPage | null> {
  const viaEdge = await callSeoPages<{
    ok: boolean;
    page?: SeoDetailPage;
    redirectSlug?: string;
  }>({
    action: 'get',
    slug,
  });
  if (viaEdge?.ok && viaEdge.page) {
    if (viaEdge.redirectSlug && viaEdge.redirectSlug !== slug) {
      return { ...viaEdge.page, primarySlug: viaEdge.redirectSlug, isPrimary: false };
    }
    return viaEdge.page;
  }

  const sb = serviceClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('seo_product_pages')
    .select(DETAIL_SELECT)
    .eq('slug', slug)
    .eq('publish_status', 'published')
    .maybeSingle();
  if (error || !data) {
    if (error && /is_primary|primary_slug|canon_id|column/i.test(error.message)) {
      const retry = await sb
        .from('seo_product_pages')
        .select(DETAIL_SELECT_FALLBACK)
        .eq('slug', slug)
        .eq('publish_status', 'published')
        .maybeSingle();
      if (retry.error || !retry.data) {
        if (retry.error) console.error('[supabase get]', retry.error.message);
        return null;
      }
      return detailFromRow(retry.data as Record<string, unknown>);
    }
    if (error) console.error('[supabase get]', error.message);
    return null;
  }
  const row = data as Record<string, unknown>;
  if (row.is_primary === false && row.primary_slug) {
    const primarySlug = String(row.primary_slug);
    if (primarySlug !== slug) {
      const { data: primary } = await sb
        .from('seo_product_pages')
        .select(DETAIL_SELECT)
        .eq('slug', primarySlug)
        .eq('publish_status', 'published')
        .maybeSingle();
      if (primary) {
        return {
          ...detailFromRow(primary as Record<string, unknown>),
          primarySlug,
          isPrimary: false,
        };
      }
    }
  }
  return detailFromRow(row);
}

export async function listLatest(limit = 24): Promise<SeoListItem[]> {
  const viaEdge = await callSeoPages<{ ok: boolean; items?: SeoListItem[] }>({
    action: 'latest',
    limit: Math.min(50, Math.max(limit, limit * 2)),
  });
  let items = viaEdge?.ok && viaEdge.items ? viaEdge.items : null;

  if (!items) {
    const sb = serviceClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from('seo_product_pages')
      .select(LIST_SELECT)
      .eq('publish_status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(Math.min(50, Math.max(limit, 40)));
    if (error) {
      console.error('[supabase latest]', error.message);
      return [];
    }
    items = (data ?? []).map((r) => listItemFromRow(r as Record<string, unknown>));
  }

  // Editorial score: prefer higher quality among recent (P2.3)
  return [...items]
    .sort((a, b) => {
      const qa = a.qualityScore ?? 0;
      const qb = b.qualityScore ?? 0;
      if (qb !== qa) return qb - qa;
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    })
    .slice(0, limit);
}

export async function listByBrand(brandSlug: string, limit = 24): Promise<SeoListItem[]> {
  const viaEdge = await callSeoPages<{ ok: boolean; items?: SeoListItem[] }>({
    action: 'brand',
    brandSlug,
    limit,
  });
  if (viaEdge?.ok && viaEdge.items) return viaEdge.items;

  const sb = serviceClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from('seo_product_pages')
    .select(LIST_SELECT)
    .eq('publish_status', 'published')
    .eq('brand_slug', brandSlug)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(50, limit));
  if (error) {
    console.error('[supabase brand]', error.message);
    return [];
  }
  return (data ?? []).map((r) => listItemFromRow(r as Record<string, unknown>));
}

export async function listByCategory(
  categorySlug: string,
  limit = 24,
): Promise<SeoListItem[]> {
  const viaEdge = await callSeoPages<{ ok: boolean; items?: SeoListItem[] }>({
    action: 'category',
    categorySlug,
    limit,
  });
  if (viaEdge?.ok && viaEdge.items) return viaEdge.items;

  const sb = serviceClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from('seo_product_pages')
    .select(LIST_SELECT)
    .eq('publish_status', 'published')
    .eq('category_slug', categorySlug)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(50, limit));
  if (error) {
    console.error('[supabase category]', error.message);
    return [];
  }
  return (data ?? []).map((r) => listItemFromRow(r as Record<string, unknown>));
}

export async function searchPages(q: string, limit = 20): Promise<SeoListItem[]> {
  const viaEdge = await callSeoPages<{ ok: boolean; items?: SeoListItem[] }>({
    action: 'search',
    q,
    limit,
  });
  if (viaEdge?.ok && viaEdge.items) return viaEdge.items;

  const sb = serviceClient();
  if (!sb || q.trim().length < 2) return [];
  const safe = q.replace(/[%_,.()]/g, ' ').trim();
  const { data, error } = await sb
    .from('seo_product_pages')
    .select(LIST_SELECT)
    .eq('publish_status', 'published')
    .or(`title.ilike.%${safe}%,brand.ilike.%${safe}%`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(50, limit));
  if (error) {
    console.error('[supabase search]', error.message);
    return [];
  }
  return (data ?? []).map((r) => listItemFromRow(r as Record<string, unknown>));
}

export async function listRelated(slug: string, limit = 6): Promise<SeoListItem[]> {
  const viaEdge = await callSeoPages<{ ok: boolean; items?: SeoListItem[] }>({
    action: 'related',
    slug,
    limit,
  });
  if (viaEdge?.ok && viaEdge.items) return viaEdge.items;
  return relatedFromSupabase(slug, limit);
}

export async function listBrandPeers(brandSlug: string, excludeSlug: string, limit = 6) {
  if (!brandSlug) return [];
  const items = await listByBrand(brandSlug, Math.min(50, limit + 8));
  return items.filter((i) => i.slug !== excludeSlug).slice(0, limit);
}

function hubsFromRows(
  rows: Array<{ brandSlug: string | null; brand?: string | null; categorySlug: string | null; category?: string | null }>,
  minCount: number,
): { brands: SeoHubItem[]; categories: SeoHubItem[] } {
  const brandMap = new Map<string, { name: string; count: number }>();
  const catMap = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    if (r.brandSlug) {
      const cur = brandMap.get(r.brandSlug) ?? { name: r.brand || r.brandSlug, count: 0 };
      cur.count += 1;
      if (r.brand) cur.name = r.brand;
      brandMap.set(r.brandSlug, cur);
    }
    if (r.categorySlug) {
      const cur = catMap.get(r.categorySlug) ?? {
        name: r.category || r.categorySlug,
        count: 0,
      };
      cur.count += 1;
      if (r.category) cur.name = r.category;
      catMap.set(r.categorySlug, cur);
    }
  }
  const brands = [...brandMap.entries()]
    .filter(([, v]) => v.count >= minCount)
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
  const categories = [...catMap.entries()]
    .filter(([, v]) => v.count >= minCount)
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
  return { brands, categories };
}

export async function listHubs(minCount = HUB_MIN_COUNT): Promise<{
  brands: SeoHubItem[];
  categories: SeoHubItem[];
}> {
  const viaEdge = await callSeoPages<{
    ok: boolean;
    brands?: SeoHubItem[];
    categories?: SeoHubItem[];
  }>({ action: 'hubs', minCount });
  if (viaEdge?.ok && viaEdge.brands && viaEdge.categories) {
    return { brands: viaEdge.brands, categories: viaEdge.categories };
  }

  const sb = serviceClient();
  if (!sb) {
    const items = await listLatest(50);
    return hubsFromRows(items, minCount);
  }
  const rows: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('seo_product_pages')
      .select('brand, brand_slug, category, category_slug')
      .eq('publish_status', 'published')
      .range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return hubsFromRows(
    rows.map((r) => ({
      brandSlug: (r.brand_slug as string | null) ?? null,
      brand: (r.brand as string | null) ?? null,
      categorySlug: (r.category_slug as string | null) ?? null,
      category: (r.category as string | null) ?? null,
    })),
    minCount,
  );
}

/** All published rows for sitemap (service role preferred; else Edge cursor pagination). */
export async function listAllForSitemap(): Promise<
  Array<
    Pick<
      SeoListItem,
      'slug' | 'canonicalPath' | 'updatedAt' | 'publishedAt' | 'brandSlug' | 'categorySlug'
    >
  >
> {
  const sb = serviceClient();
  if (sb) {
    const rows: Array<Record<string, unknown>> = [];
    const pageSize = 1000;
    let from = 0;
    let failed = false;
    for (;;) {
      const { data, error } = await sb
        .from('seo_product_pages')
        .select(
          'slug, canonical_path, updated_at, published_at, brand_slug, category_slug',
        )
        .eq('publish_status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('[supabase sitemap]', error.message);
        failed = true;
        break;
      }
      if (!data?.length) break;
      rows.push(...(data as Record<string, unknown>[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    if (!failed) {
      return rows.map((r) => ({
        slug: String(r.slug),
        canonicalPath: String(r.canonical_path ?? `/a/${r.slug}`),
        updatedAt: (r.updated_at as string | null) ?? null,
        publishedAt: (r.published_at as string | null) ?? null,
        brandSlug: (r.brand_slug as string | null) ?? null,
        categorySlug: (r.category_slug as string | null) ?? null,
      }));
    }
  }

  // Edge cursor pagination (avoids silent truncate to 50)
  const collected: Array<{
    slug: string;
    canonicalPath: string;
    updatedAt: string | null;
    publishedAt: string | null;
    brandSlug: string | null;
    categorySlug: string | null;
  }> = [];
  let cursor: string | undefined;
  for (let i = 0; i < 100; i += 1) {
    const page = await callSeoPages<{
      ok: boolean;
      items?: typeof collected;
      nextCursor?: string | null;
    }>({
      action: 'sitemap',
      limit: 200,
      cursor,
    });
    if (!page?.ok || !page.items?.length) break;
    collected.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  if (collected.length) return collected;

  const items = await listLatest(50);
  return items.map((i) => ({
    slug: i.slug,
    canonicalPath: i.canonicalPath,
    updatedAt: i.updatedAt,
    publishedAt: i.publishedAt,
    brandSlug: i.brandSlug,
    categorySlug: i.categorySlug,
  }));
}

export { HUB_MIN_COUNT };
