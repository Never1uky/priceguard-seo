# priceguard-seo

Next.js 15 App Router (ISR) for public product analysis pages.
Spec: `priceguard-ai/docs/SEO_PRODUCT_PAGES.md` §4.

## Routes

| Path | Role |
|------|------|
| `/` | Hub — latest published |
| `/a/[slug]` | Analysis page |
| `/brand/[brandSlug]` | Brand list |
| `/category/[categorySlug]` | Category list |
| `/search?q=` | FTS / title search |
| `/sitemap.xml` | Sitemap |
| `/robots.txt` | Robots |
| `/rss.xml` | Last 50 published |
| `/api/revalidate` | On-demand revalidate |

`revalidate = 3600` on pages + Route Handlers that list data.

## Env

See `.env.example`:

- `SEO_SITE_ORIGIN` — canonical origin (default `https://priceguard-seo.vercel.app`)
- `SUPABASE_URL` and/or `SEO_PAGES_URL` — read via Edge `seo-pages`
- `SUPABASE_SERVICE_ROLE_KEY` — optional direct DB (sitemap pagination)
- `REVALIDATE_SECRET` or `SEO_REVALIDATE_SECRET` — POST `/api/revalidate`

## Dev

```bash
cp .env.example .env.local
# fill SUPABASE_URL (and secrets)
npm run dev
```

## Revalidate

```bash
curl -X POST "$SEO_SITE_ORIGIN/api/revalidate" \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"paths":["/a/example-slug","/sitemap.xml","/rss.xml","/"]}'
```

## CWS CTA

Extension id: `lpmioobgnleffjlafpfbaccaangiccli`  
https://chromewebstore.google.com/detail/priceguard-ai/lpmioobgnleffjlafpfbaccaangiccli
