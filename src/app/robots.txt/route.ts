import { absoluteUrl } from '@/lib/config';
import { SEO_ROUTES } from '@/lib/routes';

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${absoluteUrl(SEO_ROUTES.sitemap)}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
