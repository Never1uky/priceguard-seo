import { absoluteUrl } from '@/lib/config';
import { SEO_ISR_REVALIDATE_SECONDS, SEO_ROUTES } from '@/lib/routes';
import { listAllForSitemap } from '@/lib/seo-pages';

const PRODUCTS_PER_CHUNK = 5_000;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type Props = { params: Promise<{ chunk: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { chunk: chunkRaw } = await params;
  const chunk = Number(chunkRaw);
  if (!Number.isFinite(chunk) || chunk < 0 || chunk > 200) {
    return new Response('Not found', { status: 404 });
  }

  const rows = await listAllForSitemap();
  const start = chunk * PRODUCTS_PER_CHUNK;
  const slice = rows.slice(start, start + PRODUCTS_PER_CHUNK);
  if (!slice.length && chunk > 0) {
    return new Response('Not found', { status: 404 });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${slice
  .map((r) => {
    const loc = absoluteUrl(r.canonicalPath || SEO_ROUTES.analysis(r.slug));
    const lastmod = (r.updatedAt || r.publishedAt || undefined)?.slice(0, 10);
    const parts = [`  <url>`, `    <loc>${xmlEscape(loc)}</loc>`];
    if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
    parts.push(`    <changefreq>daily</changefreq>`);
    parts.push(`    <priority>0.8</priority>`);
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
