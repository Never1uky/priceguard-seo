import { describe, expect, it } from 'vitest';
import { isMarketplaceProductCtaHref } from '@/components/compare-cta';
import {
  cheapestOfferPrice,
  offerDeltaLabel,
  pickDisplayOffers,
  visibleOffers,
} from '@/lib/offers-ui';
import type { SeoDetailPage, SeoOffer } from '@/lib/types';

function page(partial: Partial<SeoDetailPage> & { slug: string; title: string }): SeoDetailPage {
  return {
    canonicalPath: `/a/${partial.slug}`,
    brand: null,
    brandSlug: null,
    category: null,
    categorySlug: null,
    qualityScore: 8,
    reviewCount: 10,
    priceCurrent: null,
    currency: 'RUB',
    imageUrl: null,
    productUrl: null,
    marketplace: null,
    productId: '',
    publishedAt: null,
    updatedAt: null,
    analyzedAt: null,
    summary: null,
    rating: null,
    analysis: { qualitySummary: 'ok', qualityScore: 8 },
    offers: [],
    ...partial,
  };
}

describe('visibleOffers / CASE 5–6', () => {
  it('CASE 5: page without image still has product fields', () => {
    const p = page({
      slug: 'x',
      title: 'Samsung Galaxy Buds FE',
      imageUrl: null,
    });
    expect(p.imageUrl).toBeNull();
    expect(p.title).not.toMatch(/SEO\s*Smoke/i);
  });

  it('CASE 6: no offers → empty list (UI hides block)', () => {
    expect(
      visibleOffers(
        page({
          slug: 'x',
          title: 'Buds',
          offers: [],
          productUrl: null,
          priceCurrent: null,
        }),
      ),
    ).toEqual([]);
  });

  it('shows offers when present', () => {
    const offers = visibleOffers(
      page({
        slug: 'x',
        title: 'Buds',
        offers: [
          {
            marketplace: 'ozon',
            productId: '1',
            url: 'https://www.ozon.ru/product/1',
            price: 4990,
          },
        ],
      }),
    );
    expect(offers).toHaveLength(1);
  });

  it('caps at 3 marketplaces (one per MP)', () => {
    const many: SeoOffer[] = [
      { marketplace: 'wildberries', productId: '1', url: 'https://wb/1', price: 100 },
      { marketplace: 'ozon', productId: '2', url: 'https://ozon/2', price: 90 },
      { marketplace: 'yandex_market', productId: '3', url: 'https://ym/3', price: 95 },
      { marketplace: 'wildberries', productId: '4', url: 'https://wb/4', price: 80 },
    ];
    const picked = pickDisplayOffers(many, 3);
    expect(picked).toHaveLength(3);
    expect(picked.map((o) => o.marketplace)).toEqual([
      'wildberries',
      'ozon',
      'yandex_market',
    ]);
  });
});

describe('offer delta vs cheapest', () => {
  it('labels cheapest and deltas', () => {
    const offers: SeoOffer[] = [
      { marketplace: 'ozon', productId: '1', url: 'u1', price: 1000 },
      { marketplace: 'wildberries', productId: '2', url: 'u2', price: 1200 },
    ];
    const cheap = cheapestOfferPrice(offers);
    expect(cheap).toBe(1000);
    expect(offerDeltaLabel(1000, cheap)).toBe('самая низкая');
    expect(offerDeltaLabel(1200, cheap)).toBe('+200 ₽ к минимуму');
  });
});

describe('CASE 7: CTA is not marketplace', () => {
  it('rejects marketplace product URLs as primary CTA', () => {
    expect(isMarketplaceProductCtaHref('https://www.ozon.ru/product/1')).toBe(true);
    expect(isMarketplaceProductCtaHref('https://www.wildberries.ru/catalog/1/detail.aspx')).toBe(
      true,
    );
    expect(
      isMarketplaceProductCtaHref(
        'https://chromewebstore.google.com/detail/priceguard-ai/ipaichogganccpnapdgkjldplllnjlpf',
      ),
    ).toBe(false);
  });
});
