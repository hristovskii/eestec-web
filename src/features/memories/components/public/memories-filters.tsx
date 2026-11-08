'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/primitives/sheet';

import { type MemoriesParams, memoriesHref } from '../../schemas/memories-href';

export type MemoryFilterOptions = {
  events: { slug: string; title: string; count: number }[];
  years: number[];
  places: string[];
  authors: { username: string; name: string; count: number }[];
};

type Patch = Parameters<typeof memoriesHref>[1];

/**
 * Search and the five selects of /memories (MemoriesList): event, year, city or country, author,
 * sort. Every value lives in the URL. On phones the selects move into a bottom sheet whose results
 * update behind it (MemoriesList-Mobile). An active filter gets a red border.
 */
export function MemoriesFilters({
  params,
  options,
  total,
}: {
  params: MemoriesParams;
  options: MemoryFilterOptions;
  total: number;
}) {
  const t = useTranslations('memories.filters');
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const go = React.useCallback(
    (patch: Patch) => startTransition(() => router.replace(memoriesHref(params, patch), { scroll: false })),
    [params, router],
  );
  const search = React.useCallback((q: string) => go({ q: q || null }), [go]);
  const active = [params.event, params.year, params.place, params.author].filter(Boolean).length;

  const select = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    children: React.ReactNode,
    activeFilter: boolean,
  ) => (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={activeFilter ? 'border-2 border-brand' : undefined}
      >
        {children}
      </NativeSelect>
    </div>
  );

  const filterSelects = (suffix: string) => (
    <>
      {select(
        `mem-event${suffix}`,
        t('event'),
        params.event ?? '',
        (value) => go({ event: value || null }),
        <>
          <NativeSelectOption value="">{t('allEvents')}</NativeSelectOption>
          {options.events.map((event) => (
            <NativeSelectOption key={event.slug} value={event.slug}>
              {event.title}
            </NativeSelectOption>
          ))}
        </>,
        Boolean(params.event),
      )}
      {select(
        `mem-year${suffix}`,
        t('year'),
        params.year ? String(params.year) : '',
        (value) => go({ year: value || null }),
        <>
          <NativeSelectOption value="">{t('allYears')}</NativeSelectOption>
          {options.years.map((year) => (
            <NativeSelectOption key={year} value={year}>
              {year}
            </NativeSelectOption>
          ))}
        </>,
        Boolean(params.year),
      )}
      {select(
        `mem-place${suffix}`,
        t('place'),
        params.place ?? '',
        (value) => go({ place: value || null }),
        <>
          <NativeSelectOption value="">{t('allPlaces')}</NativeSelectOption>
          {options.places.map((place) => (
            <NativeSelectOption key={place} value={place}>
              {place}
            </NativeSelectOption>
          ))}
        </>,
        Boolean(params.place),
      )}
      {select(
        `mem-author${suffix}`,
        t('author'),
        params.author ?? '',
        (value) => go({ author: value || null }),
        <>
          <NativeSelectOption value="">{t('allAuthors')}</NativeSelectOption>
          {options.authors.map((author) => (
            <NativeSelectOption key={author.username} value={author.username}>
              {author.name}
            </NativeSelectOption>
          ))}
        </>,
        Boolean(params.author),
      )}
    </>
  );

  const sort = (id: string) =>
    select(
      id,
      t('sort'),
      params.sort,
      (value) => go({ sort: value }),
      <>
        <NativeSelectOption value="newest">{t('newest')}</NativeSelectOption>
        <NativeSelectOption value="oldest">{t('oldest')}</NativeSelectOption>
      </>,
      false,
    );

  return (
    <div
      className="flex flex-col gap-3 lg:gap-4"
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
    >
      <SearchBox value={params.q ?? ''} onSearch={search} />
      <div className="hidden gap-3 lg:grid lg:grid-cols-5">
        {filterSelects('')}
        {sort('mem-sort')}
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="secondary"
              className="border-line-input text-ink hover:text-ink"
              aria-label={active ? t('openCount', { count: active }) : t('open')}
            >
              <SlidersHorizontal aria-hidden />
              {t('open')}
              {active > 0 && (
                <span
                  aria-hidden
                  className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-brand px-1.5 text-small font-bold text-white"
                >
                  {active}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[88dvh]">
            <SheetHeader>
              <SheetTitle>{t('open')}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5">{filterSelects('-m')}</div>
            <SheetFooter className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-2.5">
              <Button
                variant="secondary"
                onClick={() => go({ event: null, year: null, place: null, author: null })}
                disabled={active === 0}
              >
                {t('clear')}
              </Button>
              <SheetClose asChild>
                <Button aria-busy={pending || undefined}>{t('show', { count: total })}</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {sort('mem-sort-m')}
      </div>
    </div>
  );
}

/** Search box: replaces the URL 400 ms after typing stops (and at once on Enter). */
function SearchBox({ value: urlValue, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const t = useTranslations('memories.filters');
  const [value, setValue] = React.useState(urlValue);
  const [lastUrlValue, setLastUrlValue] = React.useState(urlValue);
  // Clear all, a removed tag or the back button changed the URL: show its value.
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    setValue(urlValue);
  }
  React.useEffect(() => {
    if (value.trim() === urlValue) return;
    const id = window.setTimeout(() => onSearch(value.trim()), 400);
    return () => window.clearTimeout(id);
  }, [value, urlValue, onSearch]);

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <label htmlFor="mem-search" className="sr-only">
        {t('search')}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-ink"
        aria-hidden
      />
      <Input
        id="mem-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="pl-11"
        placeholder={t('searchPlaceholder')}
      />
    </form>
  );
}
