import { describe, expect, it } from 'vitest';
import {
  buildAnalysisDescription,
  buildAnalysisH1,
  buildAnalysisTitle,
  buildFaqItems,
  canonicalPathForSlug,
  formatPrice,
  formatQualityScore,
  normalizeImageUrl,
  normalizeQualityScore,
  parseSpecRow,
  productDisplayName,
  sanitizeProductTitle,
  verdictLabel,
} from './format';
import { detailFromRow, listItemFromRow } from './seo-pages';
import type { SeoDetailPage } from './types';

function page(partial: Partial<SeoDetailPage> & { title: string; slug: string }): SeoDetailPage {
  return {
    canonicalPath: `/a/${partial.slug}`,
    brand: null,
    brandSlug: null,
    category: null,
    categorySlug: null,
    qualityScore: null,
    reviewCount: 0,
    priceCurrent: null,
    currency: 'RUB',
    imageUrl: null,
    productUrl: null,
    marketplace: null,
    productId: '1',
    publishedAt: null,
    updatedAt: null,
    analyzedAt: null,
    summary: null,
    rating: null,
    analysis: null,
    offers: [],
    ...partial,
  };
}

describe('formatQualityScore', () => {
  it('formats score 8 as 8/10', () => {
    expect(formatQualityScore(8)).toBe('8/10');
    expect(normalizeQualityScore(8)).toBe(8);
  });

  it('maps legacy 80 → 8/10 (never /100)', () => {
    expect(formatQualityScore(80)).toBe('8/10');
    expect(normalizeQualityScore(80)).toBe(8);
  });

  it('omits missing / invalid score', () => {
    expect(formatQualityScore(null)).toBeNull();
    expect(formatQualityScore(undefined)).toBeNull();
    expect(formatQualityScore(Number.NaN)).toBeNull();
    expect(formatQualityScore(-1)).toBeNull();
    expect(formatQualityScore(101)).toBeNull();
  });

  it('formats 0–10 scale', () => {
    expect(formatQualityScore(10)).toBe('10/10');
    expect(formatQualityScore(0)).toBe('0/10');
    expect(formatQualityScore(7.6)).toBe('8/10');
  });
});

describe('normalizeImageUrl', () => {
  it('treats null / empty / invalid the same', () => {
    expect(normalizeImageUrl(null)).toBeNull();
    expect(normalizeImageUrl(undefined)).toBeNull();
    expect(normalizeImageUrl('')).toBeNull();
    expect(normalizeImageUrl('   ')).toBeNull();
    expect(normalizeImageUrl('ftp://x')).toBeNull();
    expect(normalizeImageUrl('not-a-url')).toBeNull();
  });

  it('keeps valid http(s)', () => {
    expect(normalizeImageUrl('https://cdn.example/p.webp')).toBe(
      'https://cdn.example/p.webp',
    );
  });
});

describe('formatPrice', () => {
  it('returns null when missing', () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
    expect(formatPrice(Number.NaN)).toBeNull();
  });

  it('formats rubles', () => {
    expect(formatPrice(1990)).toMatch(/1[\s\u00a0]?990/);
  });
});

describe('sanitizeProductTitle / productDisplayName', () => {
  it('strips SEO Smoke markers (title without SEO Smoke)', () => {
    expect(sanitizeProductTitle('Xiaomi Redmi Buds 6 Active SEO Smoke')).toBe(
      'Xiaomi Redmi Buds 6 Active',
    );
    expect(
      productDisplayName(
        page({ slug: 'x', title: 'Xiaomi Redmi Buds 6 Active SEO Smoke', brand: 'Xiaomi' }),
      ),
    ).toBe('Xiaomi Redmi Buds 6 Active');
  });

  it('strips marketplace from title', () => {
    expect(sanitizeProductTitle('Redmi Buds — Ozon')).toBe('Redmi Buds');
  });
});

describe('verdictLabel', () => {
  it('maps buy_now / wait_discount / not_recommended', () => {
    expect(verdictLabel('buy_now')).toBe('Купить сейчас');
    expect(verdictLabel('wait_discount')).toBe('Подождать скидки');
    expect(verdictLabel('not_recommended')).toBe('Не рекомендую');
  });
});

describe('buildAnalysisTitle / H1', () => {
  it('uses review/overview intent without marketplace', () => {
    expect(
      buildAnalysisTitle(page({ slug: 'x', title: 'Redmi Buds 6', brand: 'Xiaomi' })),
    ).toBe('Xiaomi Redmi Buds 6 — обзор и анализ отзывов | PriceGuard AI');
    expect(
      buildAnalysisH1(page({ slug: 'x', title: 'Xiaomi Redmi Buds 6', brand: 'Xiaomi' })),
    ).toBe('Xiaomi Redmi Buds 6');
  });

  it('strips SEO Smoke from title and H1', () => {
    expect(
      buildAnalysisTitle(
        page({ slug: 'x', title: 'Xiaomi Redmi Buds 6 Active SEO Smoke', brand: 'Xiaomi' }),
      ),
    ).toBe('Xiaomi Redmi Buds 6 Active — обзор и анализ отзывов | PriceGuard AI');
    expect(
      buildAnalysisH1(
        page({ slug: 'x', title: 'Xiaomi Redmi Buds 6 Active SEO Smoke', brand: 'Xiaomi' }),
      ),
    ).toBe('Xiaomi Redmi Buds 6 Active');
  });
});

describe('buildAnalysisDescription', () => {
  it('appends one pro and con when present', () => {
    const d = buildAnalysisDescription(
      page({
        slug: 'x',
        title: 'Товар',
        analysis: {
          qualitySummary: 'Нормальный товар',
          verdictExplanation: 'Можно брать',
          pros: ['Звук'],
          cons: ['Шум'],
        },
      }),
    );
    expect(d).toContain('Можно брать');
    expect(d).toContain('Плюс: Звук');
    expect(d).toContain('Минус: Шум');
    expect(d.length).toBeLessThanOrEqual(155);
  });
});

describe('buildFaqItems', () => {
  it('asks worth buying with product name', () => {
    const items = buildFaqItems(
      page({
        slug: 'x',
        title: 'Redmi Buds',
        brand: 'Xiaomi',
        analysis: {
          verdict: 'buy_now',
          verdictExplanation: 'Да, за эту цену.',
          cons: ['Микрофон'],
        },
      }),
    );
    expect(items[0]?.question).toContain('Стоит ли покупать Xiaomi Redmi Buds?');
  });
});

describe('canonicalPathForSlug', () => {
  it('builds /a/{slug}', () => {
    expect(canonicalPathForSlug('xiaomi-redmi-buds-6-active')).toBe(
      '/a/xiaomi-redmi-buds-6-active',
    );
  });
});

describe('parseSpecRow', () => {
  it('keeps label — value pairs', () => {
    expect(parseSpecRow('Bluetooth — 5.4')).toEqual({
      label: 'Bluetooth',
      value: '5.4',
    });
  });

  it('infers short marketplace-style specs', () => {
    expect(parseSpecRow('BT 5.3')).toEqual({ label: 'Bluetooth', value: '5.3' });
    expect(parseSpecRow('IPX4')).toEqual({ label: 'Защита', value: 'IPX4' });
    expect(parseSpecRow('До 30ч с кейсом')).toEqual({
      label: 'Автономность',
      value: 'до 30 часов с кейсом',
    });
  });

  it('does not invent Параметр for free text', () => {
    expect(parseSpecRow('Компактный кейс')).toEqual({
      label: '',
      value: 'Компактный кейс',
    });
  });
});

describe('listItemFromRow / detailFromRow data variants', () => {
  const baseRow = {
    slug: 'xiaomi-redmi-buds-6-active',
    canonical_path: '/a/xiaomi-redmi-buds-6-active',
    title: 'Xiaomi Redmi Buds 6 Active SEO Smoke',
    brand: 'Xiaomi',
    brand_slug: 'xiaomi',
    category: 'Наушники',
    category_slug: 'naushniki',
    review_count: 12,
    price_current: 1990,
    currency: 'RUB',
    product_url: 'https://www.wildberries.ru/catalog/1/detail.aspx',
    product_id: '1',
    published_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    analyzed_at: '2026-08-02T00:00:00Z',
    analysis_snapshot: { qualitySummary: 'Хороший звук' },
  };

  it('maps product with image', () => {
    const item = listItemFromRow({
      ...baseRow,
      image_url: 'https://cdn.example/p.webp',
      quality_score: 8,
      marketplace: 'wildberries',
    });
    expect(item.imageUrl).toBe('https://cdn.example/p.webp');
    expect(item.qualityScore).toBe(8);
    expect(item.title).toBe('Xiaomi Redmi Buds 6 Active');
    expect(item.title).not.toMatch(/SEO\s*Smoke/i);
  });

  it('maps product without image (null/empty/invalid → null)', () => {
    expect(listItemFromRow({ ...baseRow, image_url: null }).imageUrl).toBeNull();
    expect(listItemFromRow({ ...baseRow, image_url: '' }).imageUrl).toBeNull();
    expect(listItemFromRow({ ...baseRow, image_url: '  ' }).imageUrl).toBeNull();
    expect(listItemFromRow({ ...baseRow, image_url: 'broken' }).imageUrl).toBeNull();
  });

  it('normalizes legacy score 80 to 8', () => {
    expect(
      listItemFromRow({ ...baseRow, quality_score: 80 }).qualityScore,
    ).toBe(8);
  });

  it('maps missing score to null', () => {
    expect(
      listItemFromRow({ ...baseRow, quality_score: null }).qualityScore,
    ).toBeNull();
  });

  it('allows marketplace to be absent', () => {
    const item = listItemFromRow({ ...baseRow, marketplace: null });
    expect(item.marketplace).toBeNull();
    const detail = detailFromRow({
      ...baseRow,
      marketplace: '',
      rating: 4.5,
      offers_snapshot: [],
      view_count: 0,
    });
    expect(detail.marketplace).toBeNull();
  });
});
