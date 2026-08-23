import type { Metadata } from 'next';
import { ProductGrid } from '@/components/product-card';
import { absoluteUrl, SITE } from '@/lib/config';
import { SEO_ROUTES } from '@/lib/routes';
import { searchPages } from '@/lib/seo-pages';

/** ISR — must be a literal for Next segment config. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Поиск анализов',
  description: `Поиск опубликованных анализов ${SITE.productName}`,
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl(SEO_ROUTES.search) },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const items = query.length >= 2 ? await searchPages(query, 30) : [];

  return (
    <>
      <h1>Поиск</h1>
      <p className="lead">Найдите опубликованный анализ по названию или бренду.</p>
      <form className="search-form" action={SEO_ROUTES.search} method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Например: Xiaomi наушники"
          minLength={2}
          required
          aria-label="Запрос"
        />
        <button type="submit">Искать</button>
      </form>
      {query.length >= 2 ? (
        <>
          <p className="muted">
            Результаты по запросу «{query}»: {items.length}
          </p>
          <ProductGrid items={items} />
        </>
      ) : (
        <p className="muted">Введите не меньше 2 символов.</p>
      )}
    </>
  );
}
