import type { Metadata } from 'next';
import { absoluteUrl, SITE } from '@/lib/config';
import type { AnalysisSnapshot, SeoDetailPage } from '@/lib/types';

export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function formatPrice(price: number | null | undefined, currency = 'RUB'): string | null {
  if (price == null || !Number.isFinite(price)) return null;
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${Math.round(price)} ₽`;
  }
}

export function formatDateRu(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Human date + time for offers snapshot freshness. */
export function formatDateTimeRu(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function marketplaceLabel(mp: string): string {
  switch (mp) {
    case 'wildberries':
      return 'Wildberries';
    case 'ozon':
      return 'Ozon';
    case 'yandex_market':
      return 'Яндекс Маркет';
    default:
      return mp || 'Маркетплейс';
  }
}

/** Matches extension VERDICT_LABELS / PurchaseVerdict. */
export function verdictLabel(verdict: string | undefined): string {
  switch (verdict) {
    case 'buy_now':
    case 'buy':
      return 'Купить сейчас';
    case 'wait_discount':
    case 'wait':
      return 'Подождать скидки';
    case 'not_recommended':
    case 'avoid':
      return 'Не рекомендую';
    default:
      return verdict ? String(verdict) : 'Без вердикта';
  }
}

export function verdictHeadline(verdict: string | undefined): string {
  switch (verdict) {
    case 'buy_now':
    case 'buy':
      return 'Рекомендую купить';
    case 'wait_discount':
    case 'wait':
      return 'Лучше подождать';
    case 'not_recommended':
    case 'avoid':
      return 'Не рекомендую';
    default:
      return verdictLabel(verdict);
  }
}

export function fakeRiskLabel(risk: string | undefined): string {
  switch (risk) {
    case 'low':
      return 'Низкий';
    case 'medium':
      return 'Средний';
    case 'high':
      return 'Высокий';
    default:
      return risk ? String(risk) : '';
  }
}

/**
 * quality_score / qualityScore contract: AI scale 1–10 (display 0–10).
 * Legacy mistaken *10 values (11–100) are normalized to /10 — never show /100.
 */
export function normalizeQualityScore(score: number | null | undefined): number | null {
  if (score == null || !Number.isFinite(Number(score))) return null;
  let n = Number(score);
  if (n > 10 && n <= 100) n = n / 10;
  if (n < 0 || n > 10) return null;
  return Math.round(n * 10) / 10;
}

export function formatQualityScore(score: number | null | undefined): string | null {
  const n = normalizeQualityScore(score);
  if (n == null) return null;
  return `${Math.round(n)}/10`;
}

/** Valid http(s) image URL; null/undefined/''/invalid → null (same absent treatment). */
export function normalizeImageUrl(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) return null;
  return t;
}

/** Strip fixture / debug / marketplace labels from titles shown to users. */
export function sanitizeProductTitle(raw: string | null | undefined): string {
  let t = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  t = t
    .replace(/\bSEO\s*Smoke\b/gi, ' ')
    .replace(/\b(smoke\s*fixture|test\s*fixture|fixture|debug|test\s*only)\b/gi, ' ')
    .replace(
      /\s*[|·•\-–—]\s*(wildberries|wb|ozon|яндекс\.?\s*маркет|yandex\s*market)\s*$/i,
      '',
    )
    .replace(/^\s*(wildberries|wb|ozon|яндекс\.?\s*маркет|yandex\s*market)\s*[|·•\-–—:]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

/** Display name without duplicating brand already in title. */
export function productDisplayName(page: Pick<SeoDetailPage, 'title' | 'brand'>): string {
  const brand = page.brand?.trim() || '';
  const model = sanitizeProductTitle(page.title) || 'Товар';
  if (brand && !model.toLowerCase().startsWith(brand.toLowerCase())) {
    return `${brand} ${model}`;
  }
  return model;
}

export function buildAnalysisH1(page: SeoDetailPage): string {
  return productDisplayName(page);
}

/** Deterministic title — product review intent; no marketplace / smoke labels. */
export function buildAnalysisTitle(page: SeoDetailPage): string {
  return `${productDisplayName(page)} — обзор и анализ отзывов | ${SITE.productName}`;
}

export function buildAnalysisDescription(page: SeoDetailPage): string {
  const a = page.analysis;
  const bits: string[] = [];
  const verdictBit = a?.verdictExplanation?.trim() || a?.qualitySummary?.trim() || '';
  if (verdictBit) bits.push(verdictBit);
  else if (a?.verdict) bits.push(verdictLabel(a.verdict));

  const pro = (a?.pros ?? []).find((p) => typeof p === 'string' && p.trim());
  const con = (a?.cons ?? []).find((c) => typeof c === 'string' && c.trim());
  if (pro) bits.push(`Плюс: ${pro.trim()}`);
  if (con) bits.push(`Минус: ${con.trim()}`);

  if (!bits.length) {
    return truncate(`Анализ отзывов и цен: ${productDisplayName(page)}`, 155);
  }
  return truncate(bits.join(' '), 155);
}

export function buildAnalysisKeywords(page: SeoDetailPage): string[] {
  const keys = [
    page.brand,
    productDisplayName(page),
    page.category,
    'Ozon',
    'Wildberries',
    'Яндекс Маркет',
    'стоит ли покупать',
    'отзывы',
    'плюсы и минусы',
    SITE.productName,
  ].filter((x): x is string => Boolean(x && String(x).trim()));
  return [...new Set(keys.map((k) => String(k).trim()))];
}

export function analysisMetadata(page: SeoDetailPage): Metadata {
  const title = buildAnalysisTitle(page);
  const description = buildAnalysisDescription(page);
  const canonical = absoluteUrl(page.canonicalPath || `/a/${page.slug}`);
  const imageUrl = normalizeImageUrl(page.imageUrl);
  const images = imageUrl
    ? [{ url: imageUrl, alt: productDisplayName(page) }]
    : undefined;

  return {
    title: { absolute: title },
    description,
    keywords: buildAnalysisKeywords(page),
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      siteName: SITE.productName,
      locale: 'ru_RU',
      images,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

/** Canonical path helper (smoke / tests). */
export function canonicalPathForSlug(slug: string): string {
  return `/a/${slug}`;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Deterministic buyer-summary bullets from existing analysis (P2.1; no new AI). */
export function buildBuyerTalkSummary(a: AnalysisSnapshot | null | undefined): {
  praise: string[];
  complain: string[];
  rare: string[];
  fakeRiskLine: string | null;
} {
  const praise = (a?.reviewThemes?.praise?.length
    ? a.reviewThemes.praise
    : a?.pros ?? []
  )
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 5);

  const complain = (a?.reviewThemes?.complain?.length
    ? a.reviewThemes.complain
    : a?.cons ?? []
  )
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 5);

  const rare = (a?.reviewThemes?.rare?.length
    ? a.reviewThemes.rare
    : a?.hiddenProblems ?? []
  )
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 4);

  const fakeRiskLine =
    a?.fakeRisk || a?.fakeRiskExplanation
      ? [fakeRiskLabel(a.fakeRisk), a.fakeRiskExplanation?.trim()]
          .filter(Boolean)
          .join(' — ')
      : null;

  return { praise, complain, rare, fakeRiskLine };
}

const FOCUS_FAQ: Array<{ axes: RegExp; question: string }> = [
  {
    axes: /anc|шумодав|шум\s*подав|active\s*noise/i,
    question: 'Есть ли шумоподавление (ANC)?',
  },
  {
    axes: /автоном|батар|мач\s*работы|battery/i,
    question: 'Как с автономностью?',
  },
  {
    axes: /микрофон|microphone/i,
    question: 'Как микрофон в отзывах?',
  },
];

/** FAQ — only from existing data (spec §4.4 + P2). */
export function buildFaqItems(page: SeoDetailPage): FaqItem[] {
  const a: AnalysisSnapshot = page.analysis ?? {};
  const items: FaqItem[] = [];
  const name = productDisplayName(page);

  const verdict = a.verdictExplanation?.trim();
  if (verdict) {
    items.push({
      question: `Стоит ли покупать ${name}?`,
      answer: [verdictHeadline(a.verdict), verdict].filter(Boolean).join('. '),
    });
  }

  const cons = (a.cons ?? []).filter((c) => typeof c === 'string' && c.trim()).slice(0, 2);
  if (cons.length) {
    items.push({
      question: 'Что чаще всего не нравится покупателям?',
      answer: cons.join(' '),
    });
  }

  const price = a.priceInsight?.trim();
  if (price) {
    items.push({
      question: 'Стоит ли ждать скидку?',
      answer: price,
    });
  }

  const fake = a.fakeRiskExplanation?.trim();
  if (fake || a.fakeRisk) {
    items.push({
      question: 'Есть ли риск накрутки отзывов?',
      answer: [fakeRiskLabel(a.fakeRisk), fake].filter(Boolean).join('. '),
    });
  }

  const corpus = [
    ...(a.keySpecs ?? []),
    ...(a.pros ?? []),
    ...(a.cons ?? []),
    a.webOverview ?? '',
    a.qualitySummary ?? '',
  ].join(' ');

  for (const faq of FOCUS_FAQ) {
    if (!faq.axes.test(corpus)) continue;
    const hit =
      (a.keySpecs ?? []).find((s) => faq.axes.test(s)) ||
      (a.pros ?? []).find((s) => faq.axes.test(s)) ||
      (a.cons ?? []).find((s) => faq.axes.test(s));
    if (!hit) continue;
    items.push({ question: faq.question, answer: hit });
    break;
  }

  return items.slice(0, 6);
}

/** Parse "Label: value" / "Label — value" or common short specs for display. */
export function parseSpecRow(spec: string): { label: string; value: string } {
  const raw = spec.trim();
  if (!raw) return { label: '', value: '' };

  const m = raw.match(/^(.{2,40}?)\s*[:—–-]\s*(.+)$/);
  if (m) return { label: m[1].trim(), value: m[2].trim() };

  const bt = raw.match(/^(?:BT|Bluetooth)\s*([\d.]+)$/i);
  if (bt) return { label: 'Bluetooth', value: bt[1] };

  const ipx = raw.match(/^IPX?\s*(\d+)$/i);
  if (ipx) return { label: 'Защита', value: `IPX${ipx[1]}` };

  if (/ч(?:ас(?:ов|а)?)?(?:\s+с\s+кейсом)?$/i.test(raw) || /\b(?:до\s+)?\d+\s*ч\b/i.test(raw) || /^\s*до\s+\d+\s*ч/i.test(raw) || /^\d+\s*ч/i.test(raw)) {
    const mHours = raw.match(/(\d+)\s*ч/i);
    if (mHours) {
      const withCase = /с\s+кейсом/i.test(raw);
      return {
        label: 'Автономность',
        value: withCase ? `до ${mHours[1]} часов с кейсом` : `до ${mHours[1]} часов`,
      };
    }
    return { label: 'Автономность', value: raw };
  }

  // Unlabeled — show as a single value, never a fake "Параметр" row.
  return { label: '', value: raw };
}
