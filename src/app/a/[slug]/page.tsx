import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { AnalysisView } from '@/components/analysis-view';
import { analysisMetadata } from '@/lib/format';
import { getPublishedPage, listLatest, listRelated } from '@/lib/seo-pages';

/** ISR — must be a literal for Next segment config. */
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const items = await listLatest(30);
  return items.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) {
    return {
      title: 'Анализ не найден',
      robots: { index: false, follow: false },
    };
  }
  if (page.isPrimary === false && page.primarySlug && page.primarySlug !== slug) {
    return analysisMetadata({
      ...page,
      slug: page.primarySlug,
      canonicalPath: `/a/${page.primarySlug}`,
    });
  }
  return analysisMetadata(page);
}

export default async function AnalysisPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  if (page.isPrimary === false && page.primarySlug && page.primarySlug !== slug) {
    permanentRedirect(`/a/${page.primarySlug}`);
  }

  const related = await listRelated(page.slug, 6);
  return <AnalysisView page={page} related={related} />;
}
