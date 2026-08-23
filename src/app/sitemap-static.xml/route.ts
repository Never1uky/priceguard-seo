import { absoluteUrl } from '@/lib/config';
import { SEO_ISR_REVALIDATE_SECONDS, SEO_ROUTES } from '@/lib/routes';
import { HUB_MIN_COUNT, listAllForSitemap } from '@/lib/seo-pages';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const rows = await listAllForSitemap();
  const brandCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.brandSlug) brandCounts.set(r.brandSlug, (brandCounts.get(r.brandSlug) ?? 0) + 1);
    if (r.categorySlug) {
      categoryCounts.set(r.categorySlug, (categoryCounts.get(r.categorySlug) ?? 0) + 1);
    }
  }

  const urls: Array<{ loc: string; changefreq?: string; priority?: string }> = [
    { loc: absoluteUrl(SEO_ROUTES.home), changefreq: 'hourly', priority: '1.0' },
  ];
  for (const [slug, count] of brandCounts) {
    if (count < HUB_MIN_COUNT) continue;
    urls.push({ loc: absoluteUrl(SEO_ROUTES.brand(slug)), changefreq: 'daily', priority: '0.6' });
  }
  for (const [slug, count] of categoryCounts) {
    if (count < HUB_MIN_COUNT) continue;
    urls.push({
      loc: absoluteUrl(SEO_ROUTES.category(slug)),
      changefreq: 'daily',
      priority: '0.6',
    });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const parts = [`  <url>`, `    <loc>${xmlEscape(u.loc)}</loc>`];
    if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
    parts.push(`  </url>`);
    return parts.join('\n');
  })
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${SEO_ISR_REVALIDATE_SECONDS}, stale-while-revalidate`,
    },
  });
}
