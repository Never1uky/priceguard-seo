import { absoluteUrl } from '@/lib/config';
import { SEO_ISR_REVALIDATE_SECONDS, SEO_ROUTES } from '@/lib/routes';
import { HUB_MIN_COUNT, listAllForSitemap } from '@/lib/seo-pages';

/** Switch to sitemap index when corpus grows (P2.3). */
const SITEMAP_INDEX_URL_THRESHOLD = 10_000;
const PRODUCTS_PER_CHUNK = 5_000;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrlSet(
  urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const parts = [`  <url>`, `    <loc>${xmlEscape(u.loc)}</loc>`];
    if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
    if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
    parts.push(`  </url>`);
    return parts.join('\n');
  })
  .join('\n')}
</urlset>`;
}

export async function GET() {
  const rows = await listAllForSitemap();
  const brandCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.brandSlug) {
      brandCounts.set(r.brandSlug, (brandCounts.get(r.brandSlug) ?? 0) + 1);
    }
    if (r.categorySlug) {
      categoryCounts.set(
        r.categorySlug,
        (categoryCounts.get(r.categorySlug) ?? 0) + 1,
      );
    }
  }

  const hubUrls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [
    { loc: absoluteUrl(SEO_ROUTES.home), changefreq: 'hourly', priority: '1.0' },
  ];
  for (const [slug, count] of brandCounts) {
    if (count < HUB_MIN_COUNT) continue;
    hubUrls.push({
      loc: absoluteUrl(SEO_ROUTES.brand(slug)),
      changefreq: 'daily',
      priority: '0.6',
    });
  }
  for (const [slug, count] of categoryCounts) {
    if (count < HUB_MIN_COUNT) continue;
    hubUrls.push({
      loc: absoluteUrl(SEO_ROUTES.category(slug)),
      changefreq: 'daily',
      priority: '0.6',
    });
  }

  const productUrls = rows.map((r) => ({
    loc: absoluteUrl(r.canonicalPath || SEO_ROUTES.analysis(r.slug)),
    lastmod: (r.updatedAt || r.publishedAt || undefined)?.slice(0, 10),
    changefreq: 'daily' as const,
    priority: '0.8',
  }));

  const totalApprox = hubUrls.length + productUrls.length;
  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': `public, s-maxage=${SEO_ISR_REVALIDATE_SECONDS}, stale-while-revalidate`,
  };

  if (totalApprox <= SITEMAP_INDEX_URL_THRESHOLD) {
    return new Response(buildUrlSet([...hubUrls, ...productUrls]), { headers });
  }

  // Sitemap index: static hubs + chunked product sitemaps
  const chunks = Math.max(1, Math.ceil(productUrls.length / PRODUCTS_PER_CHUNK));
  const indexEntries = [
    absoluteUrl('/sitemap-static.xml'),
    ...Array.from({ length: chunks }, (_, i) =>
      absoluteUrl(`/sitemap-products/${i}.xml`),
    ),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries
  .map((loc) => `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n  </sitemap>`)
  .join('\n')}
</sitemapindex>`;

  return new Response(body, { headers });
}
