import type { SeoDetailPage, SeoOffer } from '@/lib/types';

export const OFFERS_DISCLAIMER =
  'Цена зависит от продавца, региона и условий доставки. Данные из снимка — не live-запрос на каждый просмотр.';

/** Max marketplaces shown in the offers block (brief: ≤3 MP). */
export const OFFERS_UI_MAX = 3;

/** Visible offers for the "где купить" block (hide when empty). Cap ≤3 MP. */
export function visibleOffers(page: SeoDetailPage): SeoOffer[] {
  const fromSnap = Array.isArray(page.offers)
    ? page.offers.filter(
        (o) =>
          Boolean(o.url?.trim()) &&
          o.price != null &&
          Number.isFinite(o.price) &&
          o.price > 0,
      )
    : [];
  const raw =
    fromSnap.length > 0
      ? fromSnap
      : page.productUrl?.trim() && page.priceCurrent != null
        ? [
            {
              marketplace: page.marketplace || 'marketplace',
              productId: page.productId || '',
              url: page.productUrl,
              price: page.priceCurrent,
            } satisfies SeoOffer,
          ]
        : [];
  return pickDisplayOffers(raw, OFFERS_UI_MAX);
}

/** Offers for Product JSON-LD — same source as UI, priced + capped. */
export function offersForStructuredData(page: SeoDetailPage): SeoOffer[] {
  const priced = visibleOffers(page).filter(
    (o) =>
      Boolean(o.url?.trim()) &&
      o.price != null &&
      Number.isFinite(o.price) &&
      o.price > 0,
  );
  if (priced.length) return priced;
  if (
    page.productUrl?.trim() &&
    page.priceCurrent != null &&
    Number.isFinite(page.priceCurrent) &&
    page.priceCurrent > 0
  ) {
    return [
      {
        marketplace: page.marketplace || 'marketplace',
        productId: page.productId || '',
        url: page.productUrl,
        price: page.priceCurrent,
      },
    ];
  }
  return [];
}

/** Prefer one offer per marketplace, then fill up to max. */
export function pickDisplayOffers(offers: SeoOffer[], max = OFFERS_UI_MAX): SeoOffer[] {
  const out: SeoOffer[] = [];
  const seenMp = new Set<string>();
  for (const o of offers) {
    if (out.length >= max) break;
    const mp = String(o.marketplace || '').toLowerCase();
    if (mp && seenMp.has(mp)) continue;
    if (mp) seenMp.add(mp);
    out.push(o);
  }
  return out;
}

export function cheapestOfferPrice(offers: SeoOffer[]): number | null {
  let min: number | null = null;
  for (const o of offers) {
    if (o.price == null || !Number.isFinite(o.price) || o.price <= 0) continue;
    if (min == null || o.price < min) min = o.price;
  }
  return min;
}

/** Label vs cheapest among displayed offers (null if no comparable prices). */
export function offerDeltaLabel(
  price: number | null | undefined,
  cheapest: number | null,
): string | null {
  if (price == null || !Number.isFinite(price) || cheapest == null) return null;
  if (price <= cheapest) return 'самая низкая';
  const delta = Math.round(price - cheapest);
  if (delta <= 0) return 'самая низкая';
  return `+${delta.toLocaleString('ru-RU')} ₽ к минимуму`;
}

/** ISO for snapshot freshness: page updatedAt (offers refresh) → published → analyzed. */
export function offersSnapshotIso(page: SeoDetailPage): string | null {
  return page.updatedAt || page.publishedAt || page.analyzedAt || null;
}
