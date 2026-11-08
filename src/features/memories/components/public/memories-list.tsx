import { MapPinOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Paged } from '@/shared/data/paged';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { pageRange } from '@/shared/lib/pagination';
import { RemovableTag } from '@/shared/ui/chip';
import { EmptyState } from '@/shared/ui/empty-state';
import { Pagination } from '@/shared/ui/pagination';
import { Button } from '@/shared/ui/primitives/button';
import { MediaCardSkeleton } from '@/shared/ui/media-card';
import { Skeleton } from '@/shared/ui/primitives/skeleton';

import { type MemoriesParams, hasMemoryFilters, memoriesHref } from '../../schemas/memories-href';
import type { MemoryAuthor, MemoryCardModel } from '../../types';
import { MemoriesFilters, type MemoryFilterOptions } from './memories-filters';
import { MemoryCard } from './memory-card';
import { ShareMemoryButton } from './share-memory-button';

type MemoriesListProps = {
  params: MemoriesParams;
  page: Paged<MemoryCardModel>;
  options: MemoryFilterOptions;
  /** Authors by user id (from `members`, for this viewer). */
  authors: Record<string, MemoryAuthor>;
  locale: Locale;
  member: boolean;
};

/** /memories below the header (MemoriesList, -Empty, -Mobile, -Mobile-Empty). */
export function MemoriesList({ params, page, options, authors, locale, member }: MemoriesListProps) {
  const t = useTranslations('memories');
  const filtered = hasMemoryFilters(params);
  const { from, to } = pageRange(page.page, page.pageSize, page.total);
  const strong = (chunks: React.ReactNode) => <strong className="text-ink">{chunks}</strong>;
  const eventTitle = options.events.find((event) => event.slug === params.event)?.title;
  const authorName = options.authors.find((author) => author.username === params.author)?.name;
  const clearAll = memoriesHref(params, { q: null, event: null, year: null, place: null, author: null });

  return (
    <div className="group/archive flex flex-col">
      <MemoriesFilters params={params} options={options} total={page.total} />

      <div
        id="memories-panel"
        className="pt-5 transition-opacity group-has-[[data-pending]]/archive:opacity-60 lg:pt-7"
      >
        {page.total > 0 ? (
          <>
            <p role="status" className="pb-3.5 text-small text-muted-ink lg:pb-5">
              {t.rich(params.sort === 'oldest' ? 'results.showingOldest' : 'results.showing', {
                from,
                to,
                total: page.total,
                strong,
              })}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {page.items.map((memory) => (
                <li key={memory.id}>
                  <MemoryCard
                    memory={memory}
                    author={memory.authorId ? authors[memory.authorId] : undefined}
                    locale={locale}
                    headingLevel="h2"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-8 lg:mt-14">
              <Pagination
                page={page.page}
                pageCount={page.pageCount}
                hrefForPage={(next) => memoriesHref(params, { page: next })}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 lg:pb-5">
              <p role="status" className="text-small text-muted-ink">
                {t.rich('results.found', { count: 0, strong })}
              </p>
              {filtered && (
                <div className="flex max-w-full items-center gap-2 overflow-x-auto max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
                  {params.q && (
                    <RemovableTag removeHref={memoriesHref(params, { q: null })}>
                      {t('results.searchTag', { query: params.q })}
                    </RemovableTag>
                  )}
                  {eventTitle && (
                    <RemovableTag removeHref={memoriesHref(params, { event: null })}>
                      {eventTitle}
                    </RemovableTag>
                  )}
                  {params.year && (
                    <RemovableTag removeHref={memoriesHref(params, { year: null })}>
                      {String(params.year)}
                    </RemovableTag>
                  )}
                  {params.place && (
                    <RemovableTag removeHref={memoriesHref(params, { place: null })}>
                      {params.place}
                    </RemovableTag>
                  )}
                  {authorName && (
                    <RemovableTag removeHref={memoriesHref(params, { author: null })}>
                      {authorName}
                    </RemovableTag>
                  )}
                  <Link
                    href={clearAll}
                    scroll={false}
                    className="shrink-0 px-1.5 text-small font-medium text-brand-dark"
                  >
                    {t('results.clearAll')}
                  </Link>
                </div>
              )}
            </div>
            <EmptyState
              variant="list"
              icon={<MapPinOff />}
              title={
                filtered
                  ? params.place
                    ? t('empty.titlePlace', { place: params.place })
                    : t('empty.title')
                  : t('empty.titleNone')
              }
              actions={
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
                  <ShareMemoryButton member={member} block className="sm:w-auto" />
                  {filtered && (
                    <Button asChild variant="secondary" block className="sm:w-auto">
                      <Link href={clearAll} scroll={false}>
                        {t('empty.clear')}
                      </Link>
                    </Button>
                  )}
                </div>
              }
            >
              <p>
                {filtered
                  ? t('empty.text', {
                      place: params.place ?? 'none',
                      query: params.q ?? 'none',
                    })
                  : t('empty.textNone')}
              </p>
            </EmptyState>
          </>
        )}
      </div>
    </div>
  );
}

/** Loading state with the same footprint (MemoriesList): filters, count line and six cards. */
export function MemoriesListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-5 lg:gap-7">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-60" />
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <MediaCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
