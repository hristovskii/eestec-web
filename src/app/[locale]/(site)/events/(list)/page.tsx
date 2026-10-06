import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { archiveParamsSchema } from '@/features/events';
import { EventsArchive, EventsArchiveSkeleton } from '@/features/events';
import { getArchiveFacets, getArchiveTypes, getEventsArchive } from '@/features/events/server';
import { pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { PageHeader } from '@/shared/layout/site/page-header';
import { Container } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const t = await getTranslations('events');
  return pageMetadata('events', locale, t('title'));
}

async function Archive({
  searchParams,
  locale,
}: {
  searchParams: PageProps<'/[locale]/events'>['searchParams'];
  locale: Locale;
}) {
  const params = archiveParamsSchema.parse(await searchParams);
  const [archive, facets, types] = await Promise.all([
    getEventsArchive(params, locale),
    getArchiveFacets(),
    getArchiveTypes(locale),
  ]);
  return <EventsArchive params={params} archive={archive} facets={facets} types={types} locale={locale} />;
}

// /events: the archive (EventsList). The header is prerendered; the list reads the URL (tab,
// filters, page), so it streams in behind the designed loading state.
export default async function EventsPage({ searchParams }: PageProps<'/[locale]/events'>) {
  const locale = await currentLocale();
  const [t, tNav, facets] = await Promise.all([
    getTranslations('events'),
    getTranslations('nav'),
    getArchiveFacets(),
  ]);
  const total = facets.counts.local + facets.counts.international;
  return (
    <>
      <PageHeader
        title={t('title')}
        breadcrumbs={[{ label: tNav('home'), href: '/' }, { label: t('title') }]}
        lead={facets.firstYear ? t('lead', { count: total, year: facets.firstYear }) : undefined}
        actions={
          <Button asChild variant="secondary" className="max-lg:hidden">
            <Link href="/upcoming">
              {t('upcomingLink')}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />
      <Container className="pb-14 lg:pb-24">
        <Suspense fallback={<EventsArchiveSkeleton />}>
          <Archive searchParams={searchParams} locale={locale} />
        </Suspense>
      </Container>
    </>
  );
}
