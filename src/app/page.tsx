import Link from 'next/link';
import { ProductGrid } from '@/components/product-card';
import { InstallCta } from '@/components/site-chrome';
import { SITE } from '@/lib/config';
import { SEO_ROUTES } from '@/lib/routes';
import { listHubs, listLatest } from '@/lib/seo-pages';

/** ISR — must be a literal for Next segment config. */
export const revalidate = 3600;

export default async function HomePage() {
  const [items, hubs] = await Promise.all([listLatest(24), listHubs(2)]);
  const brands = hubs.brands.slice(0, 12);
  const categories = hubs.categories.slice(0, 12);

  return (
    <>
      <h1>{SITE.productName}</h1>
      <p className="lead">{SITE.tagline}</p>
      <div className="hub-actions">
        <Link className="btn-primary" href={SEO_ROUTES.search}>
          Найти анализ
        </Link>
        <a
          className="btn-secondary"
          href={SITE.chromeStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Установить расширение
        </a>
      </div>

      <section className="block">
        <h2>Свежие анализы</h2>
        <ProductGrid items={items} />
      </section>

      {brands.length > 0 && (
        <section className="block">
          <h2>Бренды</h2>
          <ul className="related">
            {brands.map((b) => (
              <li key={b.slug}>
                <Link href={SEO_ROUTES.brand(b.slug)}>
                  {b.name}
                  <span className="muted"> · {b.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categories.length > 0 && (
        <section className="block">
          <h2>Категории</h2>
          <ul className="related">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={SEO_ROUTES.category(c.slug)}>
                  {c.name}
                  <span className="muted"> · {c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <InstallCta />
    </>
  );
}
