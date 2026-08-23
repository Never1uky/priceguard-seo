import { absoluteUrl, SITE } from '@/lib/config';
import { SEO_ISR_REVALIDATE_SECONDS, SEO_ROUTES } from '@/lib/routes';
import { listLatest } from '@/lib/seo-pages';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const items = await listLatest(50);
  const channelLink = absoluteUrl(SEO_ROUTES.home);

  const entries = items
    .map((item) => {
      const link = absoluteUrl(item.canonicalPath || SEO_ROUTES.analysis(item.slug));
      const pub = item.publishedAt || item.updatedAt || new Date().toISOString();
      const desc = item.summary || item.title;
      return `    <item>
      <title>${xmlEscape(item.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${new Date(pub).toUTCString()}</pubDate>
      <description>${xmlEscape(desc)}</description>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(SITE.productName)} — анализы</title>
    <link>${xmlEscape(channelLink)}</link>
    <description>${xmlEscape(SITE.tagline)}</description>
    <language>ru</language>
${entries}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${SEO_ISR_REVALIDATE_SECONDS}, stale-while-revalidate`,
    },
  });
}
