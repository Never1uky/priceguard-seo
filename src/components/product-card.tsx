import Link from 'next/link';
import {
  formatDateRu,
  formatQualityScore,
  normalizeImageUrl,
  sanitizeProductTitle,
} from '@/lib/format';
import { SEO_ROUTES } from '@/lib/routes';
import type { SeoListItem } from '@/lib/types';

export function ProductCard({ item }: { item: SeoListItem }) {
  const scoreLabel = formatQualityScore(item.qualityScore);
  const title = sanitizeProductTitle(item.title) || item.title;
  const imageUrl = normalizeImageUrl(item.imageUrl);
  const hasImage = Boolean(imageUrl);
  const summary = item.summary?.trim() || '';
  const analyzed =
    formatDateRu(item.analyzedAt || item.publishedAt || item.updatedAt) || '';

  return (
    <article className={`product-card${hasImage ? '' : ' product-card--no-media'}`}>
      <Link href={SEO_ROUTES.analysis(item.slug)} className="product-card-link">
        {hasImage ? (
          <div className="product-card-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl!} alt="" loading="lazy" />
          </div>
        ) : null}
        <div className="product-card-body">
          <h2 className="product-card-title">{title}</h2>
          {scoreLabel ? (
            <p className="product-card-score" aria-label={`Оценка качества ${scoreLabel}`}>
              {scoreLabel}
            </p>
          ) : null}
          {summary ? <p className="product-card-summary">{summary}</p> : null}
          {analyzed ? (
            <p className="product-card-date">
              <time dateTime={item.analyzedAt || item.publishedAt || item.updatedAt || undefined}>
                {analyzed}
              </time>
            </p>
          ) : null}
          <span className="product-card-cta">Подробнее</span>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ items }: { items: SeoListItem[] }) {
  if (!items.length) {
    return <p className="empty">Пока нет опубликованных анализов.</p>;
  }
  return (
    <div className="product-grid">
      {items.map((item) => (
        <ProductCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
