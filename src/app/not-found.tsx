import Link from 'next/link';
import { SEO_ROUTES } from '@/lib/routes';

export default function NotFound() {
  return (
    <>
      <h1>Страница не найдена</h1>
      <p className="lead">Анализ не опубликован или ссылка устарела.</p>
      <Link className="btn-primary" href={SEO_ROUTES.home}>
        На главную
      </Link>
    </>
  );
}
