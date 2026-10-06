import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { pageRange } from '@/shared/lib/pagination';
import type { Paged } from '@/shared/data/paged';
import { RemovableTag } from '@/shared/ui/chip';
import { EmptyState } from '@/shared/ui/empty-state';
import { LinkTabs } from '@/shared/ui/link-tabs';
import { Pagination } from '@/shared/ui/pagination';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';

import { archiveHref, type ArchiveParams, hasArchiveFilters } from '../schemas/archive-params.schema';
import type { ArchiveFacets, ArchiveTypeOption, EventCardModel } from '../types';
import { ArchiveFilters } from './archive-filters';
import { EventCard, EventCardSkeleton } from './event-card';

type EventsArchiveProps = {
  params: ArchiveParams;
  archive: Paged<EventCardModel>;
  facets: ArchiveFacets;
  types: ArchiveTypeOption[];
  locale: Locale;
};

/** /events below the page header (EventsList, -Empty, -Mobile, -Mobile-Filters). */
export function EventsArchive({ params, archive, facets, types, locale }: EventsArchiveProps) {
  const t = useTranslations('events');
  const scope = params.tab;
  const other = scope === 'local' ? 'international' : 'local';
  const typeName = types.find((type) => type.slug === params.type)?.name;
  const filtered = hasArchiveFilters(params);
  const { from, to } = pageRange(archive.page, archive.pageSize, archive.total);
  const strong = (chunks: React.ReactNode) => <strong className="text-ink">{chunks}</strong>;

  return (
    <div className="group/archive flex flex-col">
      <LinkTabs
        label={t('tabs.label')}
        tabs={(['local', 'international'] as const).map((tab) => ({
          href: archiveHref(params, { tab }),
          label: (
            <>
              <span className="max-sm:hidden">{t(`tabs.${tab}`)}</span>
              <span className="sm:hidden">{t(`tabs.${tab}Short`)}</span>
            </>
          ),
          count: facets.counts[tab],
          current: scope === tab,
        }))}
      />

      <div className="pt-5 lg:pt-7">
        <ArchiveFilters params={params} types={types} years={facets.years} total={archive.total} />
      </div>

      <div
        id="events-panel"
        className="pt-5 transition-opacity group-has-[[data-pending]]/archive:opacity-60 lg:pt-7"
      >
        {archive.total > 0 ? (
          <>
            <p role="status" className="pb-3.5 text-small text-muted-ink lg:pb-5">
              {t.rich('results.showing', { from, to, total: archive.total, scope, strong })}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {archive.items.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} locale={locale} headingLevel="h2" />
                </li>
              ))}
            </ul>
            <div className="mt-8 lg:mt-14">
              <Pagination
                page={archive.page}
                pageCount={archive.pageCount}
                hrefForPage={(page) => archiveHref(params, { page })}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 lg:pb-5">
              <p role="status" className="text-small text-muted-ink">
                {t.rich('results.found', { count: 0, scope, strong })}
              </p>
              {filtered && (
                <div className="flex max-w-full items-center gap-2 overflow-x-auto max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
                  {params.q && (
                    <RemovableTag removeHref={archiveHref(params, { q: null })}>
                      {t('results.searchTag', { query: params.q })}
                    </RemovableTag>
                  )}
                  {typeName && (
                    <RemovableTag removeHref={archiveHref(params, { type: null })}>{typeName}</RemovableTag>
                  )}
                  {params.year && (
                    <RemovableTag removeHref={archiveHref(params, { year: null })}>
                      {String(params.year)}
                    </RemovableTag>
                  )}
                  <Link
                    href={archiveHref(params, { q: null, type: null, year: null })}
                    scroll={false}
                    className="shrink-0 px-1.5 text-small font-medium text-brand-dark"
                  >
                    {t('results.clearAll')}
                  </Link>
                </div>
              )}
            </div>
            {filtered ? (
              <EmptyState
                variant="list"
                title={t('empty.title')}
                actions={
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
                    <Button asChild block className="sm:w-auto">
                      <Link href={archiveHref(params, { q: null, type: null, year: null })} scroll={false}>
                        {t('empty.clear')}
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" block className="sm:w-auto">
                      <Link href={archiveHref(params, { tab: other })}>
                        {t('empty.otherTab', { scope: other })}
                      </Link>
                    </Button>
                  </div>
                }
              >
                <p>
                  {t('empty.text', {
                    scope,
                    type: typeName ?? 'none',
                    query: params.q ?? 'none',
                    year: params.year ? String(params.year) : 'none',
                  })}
                </p>
                <Link
                  href="/upcoming"
                  className="mt-3 inline-flex items-center gap-1 text-small font-medium text-brand-dark"
                >
                  {t('empty.upcoming')}
                </Link>
              </EmptyState>
            ) : (
              <EmptyState
                variant="list"
                title={t('empty.noneTitle', { scope })}
                actions={
                  <Button asChild variant="secondary">
                    <Link href="/upcoming">
                      {t('upcomingLink')}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                }
              >
                {t('empty.noneText')}
              </EmptyState>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** First load of /events (EventsList-Loading): "Loading events…" and card skeletons. */
export function EventsArchiveSkeleton() {
  const t = useTranslations('events.results');
  return (
    <div className="flex flex-col gap-5">
      {/* Tabs and filters as grey bars until the URL has been read. */}
      <div aria-hidden className="flex flex-col gap-5 lg:gap-7">
        <div className="flex h-14 items-end gap-8 border-b border-line pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-12 w-full rounded-sm" />
        <div className="hidden gap-2 lg:flex">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-28 rounded-full" />
          ))}
        </div>
      </div>
      <p role="status" aria-live="polite" className="flex items-center gap-2.5 text-small text-muted-ink">
        <LoaderCircle className="size-4.5 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
        {t('loading')}
      </p>
      <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={index >= 3 ? 'max-sm:hidden' : undefined}>
            <EventCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
