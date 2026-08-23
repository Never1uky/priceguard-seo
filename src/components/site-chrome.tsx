import Link from 'next/link';
import { SITE } from '@/lib/config';
import { SEO_ROUTES } from '@/lib/routes';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href={SEO_ROUTES.home} className="brand">
          {SITE.productName}
        </Link>
        <nav className="nav" aria-label="Основная навигация">
          <Link href={SEO_ROUTES.search}>Поиск</Link>
          <a href={SITE.chromeStoreUrl} target="_blank" rel="noopener noreferrer">
            Установить
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <p>
          Анализы публикуются из расширения {SITE.productName}. Не является рекламой
          продавцов.
        </p>
        <p>
          <a href={SITE.chromeStoreUrl} target="_blank" rel="noopener noreferrer">
            Chrome Web Store
          </a>
          {' · '}
          <Link href={SEO_ROUTES.rss}>RSS</Link>
        </p>
      </div>
    </footer>
  );
}

export function InstallCta() {
  return (
    <aside className="cta-install">
      <h2>Следите за ценой в Chrome</h2>
      <p>
        Установите {SITE.productName}: AI-анализ, сравнение площадок и алерты в
        Telegram.
      </p>
      <a
        className="btn-primary"
        href={SITE.chromeStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Установить расширение
      </a>
    </aside>
  );
}
