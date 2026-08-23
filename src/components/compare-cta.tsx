'use client';

import { useCallback, useState } from 'react';
import { SITE } from '@/lib/config';
import type { SeoDetailPage, SeoOffer } from '@/lib/types';

export type SeoOpenComparePayload = {
  type: 'SEO_OPEN_COMPARE';
  payload: {
    title: string;
    brand: string | null;
    slug: string;
    productKey: string | null;
    query: string;
    offerHints: Array<{ marketplace: string; productId: string; url: string }>;
  };
};

function buildProductKey(page: SeoDetailPage): string | null {
  if (page.marketplace && page.productId) {
    return `${page.marketplace}:${page.productId}`;
  }
  return null;
}

function buildQuery(page: SeoDetailPage): string {
  const brand = page.brand?.trim() || '';
  const title = page.title?.trim() || '';
  if (brand && title && !title.toLowerCase().startsWith(brand.toLowerCase())) {
    return `${brand} ${title}`.slice(0, 120);
  }
  return (title || brand || page.slug).slice(0, 120);
}

function offerHints(offers: SeoOffer[]): SeoOpenComparePayload['payload']['offerHints'] {
  return offers
    .filter((o) => o.url?.trim())
    .slice(0, 6)
    .map((o) => ({
      marketplace: o.marketplace,
      productId: o.productId,
      url: o.url,
    }));
}

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          responseCallback?: (response: unknown) => void,
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}

async function tryOpenInExtension(message: SeoOpenComparePayload): Promise<boolean> {
  const runtime = typeof window !== 'undefined' ? window.chrome?.runtime : undefined;
  if (!runtime?.sendMessage) return false;

  return new Promise((resolve) => {
    try {
      runtime.sendMessage(SITE.extensionId, message, (response) => {
        const err = runtime.lastError;
        if (err) {
          resolve(false);
          return;
        }
        const ok =
          response &&
          typeof response === 'object' &&
          (response as { ok?: boolean }).ok === true;
        resolve(Boolean(ok));
      });
    } catch {
      resolve(false);
    }
  });
}

/** Primary CTA: open PriceGuard extension compare, else install from CWS. Never marketplace. */
export function CompareCta({ page }: { page: SeoDetailPage }) {
  const [busy, setBusy] = useState(false);
  const [needInstall, setNeedInstall] = useState(false);

  const onClick = useCallback(async () => {
    setBusy(true);
    setNeedInstall(false);
    const message: SeoOpenComparePayload = {
      type: 'SEO_OPEN_COMPARE',
      payload: {
        title: page.title,
        brand: page.brand ?? null,
        slug: page.slug,
        productKey: buildProductKey(page),
        query: buildQuery(page),
        offerHints: offerHints(page.offers ?? []),
      },
    };
    const opened = await tryOpenInExtension(message);
    setBusy(false);
    if (!opened) setNeedInstall(true);
  }, [page]);

  return (
    <aside className="cta-install" data-cta="priceguard-compare">
      <h2>Сравнить цены в {SITE.productName}</h2>
      <p>
        Откройте товар в расширении, чтобы увидеть предложения на Wildberries, Ozon и Яндекс
        Маркете и выбрать нужный offer.
      </p>
      {!needInstall ? (
        <button
          type="button"
          className="btn-primary"
          onClick={() => void onClick()}
          disabled={busy}
          data-cta-action="open-priceguard"
        >
          {busy ? 'Открываем…' : 'Открыть в PriceGuard AI'}
        </button>
      ) : (
        <>
          <p>
            Чтобы сравнить цены на этот товар, установите {SITE.productName}.
          </p>
          <a
            className="btn-primary"
            href={SITE.chromeStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-cta-action="install-extension"
          >
            Установить расширение
          </a>
        </>
      )}
    </aside>
  );
}

/** Pure helper for tests — CTA must never point at marketplace product URLs. */
export function isMarketplaceProductCtaHref(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    const u = new URL(href);
    return /wildberries\.ru|ozon\.ru|market\.yandex\.ru/i.test(u.hostname);
  } catch {
    return false;
  }
}
