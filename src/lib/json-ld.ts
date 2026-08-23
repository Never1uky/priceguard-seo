import { absoluteUrl } from '@/lib/config';
import {
  buildFaqItems,
  marketplaceLabel,
  normalizeImageUrl,
  productDisplayName,
} from '@/lib/format';
import { offersForStructuredData } from '@/lib/offers-ui';
import type { SeoDetailPage, SeoOffer } from '@/lib/types';

const SCHEMA_IN_STOCK = 'https://schema.org/InStock';

function isValidOfferPrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

function offerToJsonLd(o: SeoOffer, currency: string) {
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url: o.url.trim(),
    priceCurrency: currency,
    price: String(o.price),
    availability: SCHEMA_IN_STOCK,
  };
  const mp = String(o.marketplace || '').trim();
  if (mp) {
    offer.seller = {
      '@type': 'Organization',
      name: marketplaceLabel(mp),
    };
  }
  return offer;
}

function buildOffersJsonLd(
  offers: SeoOffer[],
  currency: string,
): Record<string, unknown> | undefined {
  const priced = offers.filter((o) => o.url?.trim() && isValidOfferPrice(o.price));
  if (!priced.length) return undefined;

  const mapped = priced.map((o) => offerToJsonLd(o, currency));
  if (mapped.length === 1) return mapped[0];

  const prices = priced.map((o) => Number(o.price));
  return {
    '@type': 'AggregateOffer',
    offerCount: mapped.length,
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    priceCurrency: currency,
    offers: mapped,
  };
}

function buildAggregateRatingJsonLd(page: SeoDetailPage) {
  if (
    page.rating == null ||
    !Number.isFinite(page.rating) ||
    page.rating < 1 ||
    page.rating > 5 ||
    page.reviewCount <= 0
  ) {
    return undefined;
  }
  return {
    '@type': 'AggregateRating',
    ratingValue: page.rating,
    reviewCount: page.reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

/** Product JSON-LD; null when no commerce signal (offers or honest aggregateRating). */
export function buildProductJsonLd(page: SeoDetailPage): object | null {
  const currency = page.currency || 'RUB';
  const offers = buildOffersJsonLd(offersForStructuredData(page), currency);
  const aggregateRating = buildAggregateRatingJsonLd(page);
  if (!offers && !aggregateRating) return null;

  const url = absoluteUrl(page.canonicalPath || `/a/${page.slug}`);
  const name = productDisplayName(page);
  const imageUrl = normalizeImageUrl(page.imageUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: page.summary || page.analysis?.qualitySummary || undefined,
    image: imageUrl ? [imageUrl] : undefined,
    brand: page.brand ? { '@type': 'Brand', name: page.brand } : undefined,
    sku: page.productId || undefined,
    url,
    ...(offers ? { offers } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function buildBreadcrumbJsonLd(page: SeoDetailPage) {
  const items: Array<{ name: string; path: string }> = [
    { name: 'Главная', path: '/' },
  ];
  if (page.category && page.categorySlug) {
    items.push({
      name: page.category,
      path: `/category/${page.categorySlug}`,
    });
  }
  if (page.brand && page.brandSlug) {
    items.push({ name: page.brand, path: `/brand/${page.brandSlug}` });
  }
  items.push({
    name: productDisplayName(page),
    path: page.canonicalPath || `/a/${page.slug}`,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function buildFaqJsonLd(page: SeoDetailPage) {
  const faqs = buildFaqItems(page);
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function buildAllJsonLd(page: SeoDetailPage): object[] {
  const out: object[] = [];
  const product = buildProductJsonLd(page);
  if (product) out.push(product);
  out.push(buildBreadcrumbJsonLd(page));
  const faq = buildFaqJsonLd(page);
  if (faq) out.push(faq);
  return out;
}
