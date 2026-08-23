import { describe, expect, it, vi } from 'vitest';
import {
  buildAllJsonLd,
  buildProductJsonLd,
} from '@/lib/json-ld';
import type { SeoDetailPage } from '@/lib/types';

vi.mock('@/lib/config', () => ({
  absoluteUrl: (path: string) => `https://priceguard-seo.vercel.app${path}`,
}));

function page(
  partial: Partial<SeoDetailPage> & { slug: string; title: string },
): SeoDetailPage {
  return {
    canonicalPath: `/a/${partial.slug}`,
    brand: partial.brand ?? 'Sony',
    brandSlug: partial.brandSlug ?? 'sony',
    category: null,
    categorySlug: null,
    qualityScore: 8,
    reviewCount: 0,
    priceCurrent: null,
    currency: 'RUB',
    imageUrl: null,
    productUrl: null,
    marketplace: null,
    productId: '',
    publishedAt: null,
    updatedAt: null,
    analyzedAt: null,
    summary: 'Summary text',
    rating: null,
    analysis: { qualitySummary: 'Quality summary', qualityScore: 8 },
    offers: [],
    ...partial,
  };
}

function productFromAll(p: SeoDetailPage): Record<string, unknown> | undefined {
  return buildAllJsonLd(p).find(
    (item) => (item as { '@type'?: string })['@type'] === 'Product',
  ) as Record<string, unknown> | undefined;
}

describe('buildProductJsonLd', () => {
  it('fallback: empty offers_snapshot + priceCurrent + productUrl → Offer with price', () => {
    const p = page({
      slug: 'apple-airpods-pro-3',
      title: 'Apple AirPods Pro 3',
      brand: 'Apple',
      brandSlug: 'apple',
      priceCurrent: 20736,
      productUrl: 'https://market.yandex.ru/card/airpods/4690088798',
      marketplace: 'yandex_market',
      productId: '4690088798',
    });
    const product = buildProductJsonLd(p);
    expect(product).not.toBeNull();
    const offers = (product as { offers: { price: string } }).offers;
    expect(offers['@type']).toBe('Offer');
    expect(offers.price).toBe('20736');
  });

  it('two priced offers → AggregateOffer', () => {
    const p = page({
      slug: 'playstation-dualsense-white',
      title: 'DualSense White',
      brand: 'Playstation',
      brandSlug: 'playstation',
      offers: [
        {
          marketplace: 'wildberries',
          productId: '1137034267',
          url: 'https://www.wildberries.ru/catalog/1137034267/detail.aspx',
          price: 6033,
        },
        {
          marketplace: 'yandex_market',
          productId: '4787042645',
          url: 'https://market.yandex.ru/card/dualsense/4787042645',
          price: 7764,
        },
      ],
    });
    const product = buildProductJsonLd(p)!;
    const offers = product.offers as {
      '@type': string;
      lowPrice: number;
      highPrice: number;
      offerCount: number;
    };
    expect(offers['@type']).toBe('AggregateOffer');
    expect(offers.offerCount).toBe(2);
    expect(offers.lowPrice).toBe(6033);
    expect(offers.highPrice).toBe(7764);
  });

  it('null-priced snapshot offers filtered; fallback from priceCurrent', () => {
    const p = page({
      slug: 'x',
      title: 'Test Product',
      offers: [
        {
          marketplace: 'ozon',
          productId: '1',
          url: 'https://www.ozon.ru/product/1',
          price: null,
        },
      ],
      priceCurrent: 9999,
      productUrl: 'https://www.ozon.ru/product/1',
      marketplace: 'ozon',
      productId: '1',
    });
    const product = buildProductJsonLd(p)!;
    const offers = product.offers as { price: string };
    expect(offers.price).toBe('9999');
  });

  it('no price and no rating → Product omitted from buildAllJsonLd', () => {
    const p = page({
      slug: 'no-commerce',
      title: 'No Commerce Product',
      brand: null,
      brandSlug: null,
      offers: [],
      priceCurrent: null,
      productUrl: null,
      rating: null,
      reviewCount: 0,
    });
    expect(buildProductJsonLd(p)).toBeNull();
    expect(productFromAll(p)).toBeUndefined();
    expect(buildAllJsonLd(p).some((x) => (x as { '@type'?: string })['@type'] === 'BreadcrumbList')).toBe(
      true,
    );
  });

  it('aggregateRating only with rating 1–5 and reviewCount > 0', () => {
    const withRating = page({
      slug: 'rated',
      title: 'Rated Product',
      rating: 4.5,
      reviewCount: 12,
      priceCurrent: null,
      productUrl: null,
    });
    const rated = buildProductJsonLd(withRating)!;
    expect(rated.aggregateRating).toMatchObject({
      '@type': 'AggregateRating',
      ratingValue: 4.5,
      reviewCount: 12,
    });
    expect(rated.offers).toBeUndefined();

    const noReviews = page({
      slug: 'rated-no-count',
      title: 'Rated No Count',
      rating: 4.5,
      reviewCount: 0,
    });
    expect(buildProductJsonLd(noReviews)).toBeNull();

    const qualityOnly = page({
      slug: 'quality-only',
      title: 'Quality Only',
      qualityScore: 9,
      rating: null,
      reviewCount: 20,
    });
    expect(buildProductJsonLd(qualityOnly)).toBeNull();
  });
});
