export type Marketplace = 'wildberries' | 'ozon' | 'yandex_market' | string;

export interface SeoOffer {
  marketplace: string;
  productId: string;
  url: string;
  title?: string;
  price: number | null;
  rating?: number | null;
}

export interface AnalysisAlternative {
  name: string;
  reason: string;
  /** Resolved published SEO slug when matched (P2.2). */
  slug?: string | null;
}

export interface ReviewThemes {
  praise?: string[];
  complain?: string[];
  rare?: string[];
}

/** Snapshot of FullProductAnalysis at publish time (no LLM at render). */
export interface AnalysisSnapshot {
  /** AI quality score on 1–10 scale (legacy 11–100 normalized at publish/load). */
  qualityScore?: number | null;
  qualitySummary?: string;
  webOverview?: string;
  pros?: string[];
  cons?: string[];
  fakeRisk?: string;
  fakeRiskExplanation?: string;
  analogComparison?: string;
  alternatives?: AnalysisAlternative[];
  verdict?: string;
  verdictExplanation?: string;
  keySpecs?: string[];
  hiddenProblems?: string[];
  priceInsight?: string;
  providerLabel?: string;
  analyzedAt?: number | string;
  schemaVersion?: number;
  /** P2.2+ optional — graceful omit on older snapshots */
  reviewThemes?: ReviewThemes;
  audienceFit?: string[];
  audienceAvoid?: string[];
  dataGaps?: string[];
  focusNotes?: Record<string, string>;
}

export interface SeoListItem {
  slug: string;
  canonicalPath: string;
  title: string;
  brand: string | null;
  brandSlug: string | null;
  category: string | null;
  categorySlug: string | null;
  /** 1–10 AI score; null when absent. Never a 0–100 raw value after load. */
  qualityScore: number | null;
  reviewCount: number;
  priceCurrent: number | null;
  currency: string;
  /** http(s) URL or null — empty/invalid treated as null. */
  imageUrl: string | null;
  productUrl: string | null;
  /**
   * Storage identity for the source product. Optional for SEO UI —
   * pages must render without requiring marketplace in hero/cards.
   */
  marketplace?: Marketplace | null;
  productId: string;
  publishedAt: string | null;
  updatedAt: string | null;
  analyzedAt: string | null;
  summary: string | null;
  /** False for alias SKU pages that redirect to primary. */
  isPrimary?: boolean;
  primarySlug?: string | null;
  canonId?: string | null;
}

export interface SeoDetailPage extends SeoListItem {
  rating: number | null;
  analysis: AnalysisSnapshot | null;
  offers: SeoOffer[];
  /** Honest counter; UI shows only when ≥ 10. */
  viewCount?: number | null;
}

export interface SeoHubItem {
  slug: string;
  name: string;
  count: number;
}
