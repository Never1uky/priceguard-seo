import Link from 'next/link';
import { CompareCta } from '@/components/compare-cta';
import { ViewBeacon } from '@/components/view-beacon';
import {
  buildBuyerTalkSummary,
  buildFaqItems,
  formatDateRu,
  formatDateTimeRu,
  formatPrice,
  formatQualityScore,
  marketplaceLabel,
  normalizeImageUrl,
  parseSpecRow,
  productDisplayName,
  sanitizeProductTitle,
  verdictHeadline,
  verdictLabel,
} from '@/lib/format';
import { buildAllJsonLd } from '@/lib/json-ld';
import {
  OFFERS_DISCLAIMER,
  cheapestOfferPrice,
  offerDeltaLabel,
  offersSnapshotIso,
  visibleOffers,
} from '@/lib/offers-ui';
import { SEO_ROUTES } from '@/lib/routes';
import type { SeoDetailPage, SeoListItem } from '@/lib/types';

const VIEW_DISPLAY_THRESHOLD = 10;

function JsonLd({ data }: { data: object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Product analysis layout — product-centric; offers separate from AI. */
export function AnalysisView({
  page,
  related = [],
}: {
  page: SeoDetailPage;
  related?: SeoListItem[];
}) {
  const a = page.analysis ?? {};
  const pros = Array.isArray(a.pros) ? a.pros.filter(Boolean).slice(0, 7) : [];
  const cons = Array.isArray(a.cons) ? a.cons.filter(Boolean).slice(0, 7) : [];
  const specs = Array.isArray(a.keySpecs) ? a.keySpecs.filter(Boolean).slice(0, 8) : [];
  const hidden = Array.isArray(a.hiddenProblems) ? a.hiddenProblems.filter(Boolean) : [];
  const alts = Array.isArray(a.alternatives) ? a.alternatives.slice(0, 5) : [];
  const offers = visibleOffers(page);
  const offersCheapest = cheapestOfferPrice(offers);
  const offersSnapIso = offersSnapshotIso(page);
  const offersSnapLabel = formatDateTimeRu(offersSnapIso);
  const audienceFit = (a.audienceFit ?? []).filter(Boolean).slice(0, 4);
  const audienceAvoid = (a.audienceAvoid ?? []).filter(Boolean).slice(0, 4);
  const faq = buildFaqItems(page);
  const buyer = buildBuyerTalkSummary(a);
  const updated = formatDateRu(page.updatedAt || page.publishedAt || page.analyzedAt);
  const scoreLabel = formatQualityScore(page.qualityScore ?? a.qualityScore);
  const viewCount = page.viewCount != null ? Number(page.viewCount) : 0;
  const showViews = Number.isFinite(viewCount) && viewCount >= VIEW_DISPLAY_THRESHOLD;
  const displayTitle = productDisplayName(page);
  const imageUrl = normalizeImageUrl(page.imageUrl);
  const hasImage = Boolean(imageUrl);
  const shortSummary =
    a.qualitySummary?.trim() ||
    a.verdictExplanation?.trim() ||
    page.summary?.trim() ||
    '';
  const detailSummary =
    a.webOverview?.trim() && a.webOverview.trim() !== shortSummary
      ? a.webOverview.trim()
      : shortSummary && !a.webOverview?.trim()
        ? ''
        : a.webOverview?.trim() && a.webOverview.trim() === shortSummary
          ? ''
          : '';
  const leadForShortBlock = detailSummary || (shortSummary && !a.verdict ? shortSummary : '');
  const verdictText = a.verdictExplanation?.trim() || '';
  const priceInsight = a.priceInsight?.trim() || '';
  const hasBuyerTalk =
    buyer.praise.length > 0 ||
    buyer.complain.length > 0 ||
    buyer.rare.length > 0 ||
    Boolean(buyer.fakeRiskLine);
  const hasAiDetails =
    Boolean(verdictText && verdictText !== shortSummary) ||
    hasBuyerTalk ||
    audienceFit.length > 0 ||
    audienceAvoid.length > 0 ||
    hidden.length > 0 ||
    alts.length > 0 ||
    Boolean(a.analogComparison?.trim()) ||
    Boolean(priceInsight);

  return (
    <>
      <JsonLd data={buildAllJsonLd(page)} />
      <ViewBeacon slug={page.slug} />

      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <Link href={SEO_ROUTES.home}>Главная</Link>
        {page.category && page.categorySlug ? (
          <>
            <span aria-hidden>/</span>
            <Link href={SEO_ROUTES.category(page.categorySlug)}>{page.category}</Link>
          </>
        ) : null}
        {page.brand && page.brandSlug ? (
          <>
            <span aria-hidden>/</span>
            <Link href={SEO_ROUTES.brand(page.brandSlug)}>{page.brand}</Link>
          </>
        ) : null}
        <span aria-hidden>/</span>
        <span className="current">{displayTitle}</span>
      </nav>

      <section
        className={`hero-product${hasImage ? '' : ' hero-product--compact'}`}
        aria-label="Обзор товара"
      >
        {hasImage ? (
          <div className="hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl!} alt={displayTitle} />
          </div>
        ) : null}

        <div className="hero-meta">
          <header className="hero-header">
            <h1 className="analysis-title">{displayTitle}</h1>
            {updated ? (
              <p className="updated-at">
                Обновлено:{' '}
                <time dateTime={page.updatedAt || page.publishedAt || undefined}>{updated}</time>
                {showViews ? (
                  <span className="muted"> · {Math.floor(viewCount)} просмотров</span>
                ) : null}
              </p>
            ) : showViews ? (
              <p className="updated-at muted">{Math.floor(viewCount)} просмотров</p>
            ) : null}
          </header>

          {(a.verdict || scoreLabel) && (
            <div className="hero-top">
              {a.verdict ? (
                <p className="verdict-badge" data-verdict={a.verdict}>
                  {verdictLabel(a.verdict)}
                </p>
              ) : null}
              {scoreLabel ? (
                <p className="hero-score-chip" aria-label={`Оценка качества ${scoreLabel}`}>
                  <span className="hero-score-chip__label">Оценка</span>
                  <span className="hero-score-chip__value">{scoreLabel}</span>
                </p>
              ) : null}
            </div>
          )}

          {a.verdict ? (
            <p className="verdict-disclaimer muted">
              Вердикт сформирован автоматически и носит информационный характер — это не
              индивидуальная рекомендация к покупке.
            </p>
          ) : null}

          {shortSummary ? <p className="hero-lead">{shortSummary}</p> : null}
        </div>
      </section>

      {leadForShortBlock ? (
        <section className="block">
          <h2>Краткий вывод</h2>
          <p className="lead-summary">{leadForShortBlock}</p>
        </section>
      ) : null}

      {pros.length > 0 || cons.length > 0 ? (
        <section className="block">
          <div
            className={`pros-cons-grid${pros.length && cons.length ? '' : ' pros-cons-grid--single'}`}
          >
            {pros.length > 0 ? (
              <div>
                <h2>Плюсы</h2>
                <ul className="check-list check-list--pros">
                  {pros.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {cons.length > 0 ? (
              <div>
                <h2>Минусы</h2>
                <ul className="check-list check-list--cons">
                  {cons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {specs.length > 0 ? (
        <section className="block">
          <h2>Характеристики</h2>
          <ul className="specs-list">
            {specs.map((s) => {
              const row = parseSpecRow(s);
              return (
                <li key={s}>
                  {row.label ? (
                    <>
                      <span className="specs-list__label">{row.label}</span>
                      <span className="specs-list__sep" aria-hidden>
                        {' '}
                        —{' '}
                      </span>
                      <span className="specs-list__value">{row.value}</span>
                    </>
                  ) : (
                    <span className="specs-list__value">{row.value}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {hasAiDetails ? (
        <section className="block">
          <h2>Подробный анализ</h2>
          {a.verdict ? (
            <p className="verdict-headline">{verdictHeadline(a.verdict)}</p>
          ) : null}
          {verdictText && verdictText !== shortSummary ? <p>{verdictText}</p> : null}

          {hasBuyerTalk ? (
            <div className="analysis-subblock">
              <h3>Что говорят покупатели</h3>
              {buyer.praise.length > 0 ? (
                <p>
                  Чаще хвалят:{' '}
                  {buyer.praise.map((p) => p.replace(/\.$/, '')).join('; ')}.
                </p>
              ) : null}
              {buyer.complain.length > 0 ? (
                <p>
                  Жалуются на:{' '}
                  {buyer.complain.map((p) => p.replace(/\.$/, '')).join('; ')}.
                </p>
              ) : null}
              {buyer.rare.length > 0 ? (
                <p className="muted">
                  Реже упоминают: {buyer.rare.map((p) => p.replace(/\.$/, '')).join('; ')}.
                </p>
              ) : null}
              {buyer.fakeRiskLine ? (
                <p className="muted">Риск накрутки отзывов: {buyer.fakeRiskLine}</p>
              ) : null}
              {page.reviewCount > 0 ? (
                <p className="muted">В выборке анализа: {page.reviewCount} отзывов</p>
              ) : null}
            </div>
          ) : null}

          {hidden.length > 0 ? (
            <div className="analysis-subblock">
              <h3>На что обратить внимание</h3>
              <ul>
                {hidden.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {audienceFit.length > 0 ? (
            <div className="analysis-subblock">
              <h3>Кому подойдёт</h3>
              <ul>
                {audienceFit.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {audienceAvoid.length > 0 ? (
            <div className="analysis-subblock">
              <h3>Кому не подойдёт</h3>
              <ul>
                {audienceAvoid.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {priceInsight ? (
            <div className="analysis-subblock">
              <h3>Про цену</h3>
              <p>{priceInsight}</p>
            </div>
          ) : null}

          {alts.length > 0 ? (
            <div className="analysis-subblock">
              <h3>Альтернативы</h3>
              <ul className="alts">
                {alts.map((alt) => (
                  <li key={alt.name}>
                    <strong>{sanitizeProductTitle(alt.name) || alt.name}</strong>
                    {alt.reason ? <span> — {alt.reason}</span> : null}
                    {alt.slug ? (
                      <>
                        {' '}
                        <Link href={SEO_ROUTES.analysis(alt.slug)}>Анализ</Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
              {a.analogComparison ? <p className="muted">{a.analogComparison}</p> : null}
            </div>
          ) : a.analogComparison ? (
            <p className="muted">{a.analogComparison}</p>
          ) : null}
        </section>
      ) : null}

      {offers.length > 0 ? (
        <section className="block" data-section="offers">
          <h2>Где сейчас найден товар</h2>
          <p className="muted">{OFFERS_DISCLAIMER}</p>
          {offersSnapLabel && offersSnapIso ? (
            <p className="offers-snapshot-at">
              Цены по данным на{' '}
              <time dateTime={offersSnapIso}>{offersSnapLabel}</time>
            </p>
          ) : null}
          <ul className="offers">
            {offers.map((o) => {
              const offerPrice = formatPrice(o.price, page.currency);
              const delta =
                offers.length >= 2 ? offerDeltaLabel(o.price, offersCheapest) : null;
              return (
                <li key={`${o.marketplace}-${o.productId}-${o.url}`}>
                  <a href={o.url} target="_blank" rel="noopener noreferrer">
                    {marketplaceLabel(String(o.marketplace))}
                  </a>
                  {offerPrice ? <span>{offerPrice}</span> : null}
                  {delta ? <span className="muted offer-delta">{delta}</span> : null}
                  {o.rating != null && Number.isFinite(o.rating) ? (
                    <span className="muted">★ {o.rating}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {faq.length > 0 ? (
        <section className="block faq">
          <h2>Частые вопросы</h2>
          {faq.map((f) => (
            <details key={f.question}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="block" data-section="related">
          <h2>Похожие анализы</h2>
          <ul className="related-list">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={SEO_ROUTES.analysis(item.slug)}>
                  {sanitizeProductTitle(item.title) || item.title}
                </Link>
                {item.qualityScore != null ? (
                  <span className="muted"> · {formatQualityScore(item.qualityScore)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CompareCta page={page} />
    </>
  );
}
