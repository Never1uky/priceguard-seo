import type { Metadata } from 'next';
import { ProductGrid } from '@/components/product-card';
import { absoluteUrl } from '@/lib/config';
import { SEO_ROUTES } from '@/lib/routes';
import { listByBrand } from '@/lib/seo-pages';

/** ISR — must be a literal for Next segment config. */
export const revalidate = 3600;

type Props = { params: Promise<{ brandSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brandSlug } = await params;
  const items = await listByBrand(brandSlug, 48);
  const name = items[0]?.brand || brandSlug;
  const title = `${name}: анализы товаров`;
  const path = SEO_ROUTES.brand(brandSlug);
  const empty = items.length === 0;
  return {
    title,
    description: empty
      ? `Пока нет опубликованных анализов бренда ${name}`
      : `Опубликованные AI-анализы бренда ${name} (${items.length})`,
    robots: empty ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { title, url: absoluteUrl(path) },
  };
}

export default async function BrandPage({ params }: Props) {
  const { brandSlug } = await params;
  const items = await listByBrand(brandSlug, 48);
  const name = items[0]?.brand || brandSlug;

  return (
    <>
      <h1>Бренд: {name}</h1>
      <p className="lead">
        {items.length
          ? `Опубликованных анализов: ${items.length}`
          : 'Опубликованные анализы товаров бренда.'}
      </p>
      <ProductGrid items={items} />
    </>
  );
}
