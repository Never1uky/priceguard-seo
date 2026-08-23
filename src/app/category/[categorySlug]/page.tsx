import type { Metadata } from 'next';
import { ProductGrid } from '@/components/product-card';
import { absoluteUrl } from '@/lib/config';
import { SEO_ROUTES } from '@/lib/routes';
import { listByCategory } from '@/lib/seo-pages';

/** ISR — must be a literal for Next segment config. */
export const revalidate = 3600;

type Props = { params: Promise<{ categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const items = await listByCategory(categorySlug, 48);
  const name = items[0]?.category || categorySlug;
  const title = `${name}: анализы товаров`;
  const path = SEO_ROUTES.category(categorySlug);
  const empty = items.length === 0;
  return {
    title,
    description: empty
      ? `Пока нет опубликованных анализов в категории ${name}`
      : `Опубликованные AI-анализы в категории ${name} (${items.length})`,
    robots: empty ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { title, url: absoluteUrl(path) },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { categorySlug } = await params;
  const items = await listByCategory(categorySlug, 48);
  const name = items[0]?.category || categorySlug;

  return (
    <>
      <h1>Категория: {name}</h1>
      <p className="lead">
        {items.length
          ? `Опубликованных анализов: ${items.length}`
          : 'Опубликованные анализы в этой категории.'}
      </p>
      <ProductGrid items={items} />
    </>
  );
}
