'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { FilterChip } from '@/shared/ui/chip';
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

import { archiveHref, type ArchiveParams } from '../schemas/archive-params.schema';
import type { ArchiveTypeOption } from '../types';

type ArchiveFiltersProps = {
  params: ArchiveParams;
  types: ArchiveTypeOption[];
  years: number[];
  /** Events matching the current filters ("Show 14 events" in the sheet). */
  total: number;
};

/**
 * Search, year and sort on /events (EventsList). Every value lives in the URL; chips are links
 * (no JavaScript needed), search and selects replace the URL. On phones type and year move into a
 * bottom sheet whose results update behind it.
 */
export function ArchiveFilters({ params, types, years, total }: ArchiveFiltersProps) {
  const t = useTranslations('events.filters');
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const go = React.useCallback(
    (patch: Parameters<typeof archiveHref>[1]) =>
      startTransition(() => router.replace(archiveHref(params, patch), { scroll: false })),
    [params, router],
  );

  const search = React.useCallback((q: string) => go({ q: q || null }), [go]);
  const active = (params.type ? 1 : 0) + (params.year ? 1 : 0);

  const sortSelect = (id: string, className?: string) => (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {t('sort')}
      </label>
      <NativeSelect id={id} value={params.sort} onChange={(event) => go({ sort: event.target.value })}>
        <NativeSelectOption value="newest">{t('newest')}</NativeSelectOption>
        <NativeSelectOption value="oldest">{t('oldest')}</NativeSelectOption>
        <NativeSelectOption value="title">{t('title')}</NativeSelectOption>
      </NativeSelect>
    </div>
  );

  return (
    <div
      className="flex flex-col gap-3 lg:gap-4.5"
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
    >
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_180px_200px]">
        <SearchBox value={params.q ?? ''} onSearch={search} />
        <div className="hidden lg:block">
          <label htmlFor="ev-year" className="sr-only">
            {t('year')}
          </label>
          <NativeSelect
            id="ev-year"
            value={params.year ? String(params.year) : ''}
            onChange={(event) => go({ year: event.target.value || null })}
          >
            <NativeSelectOption value="">{t('allYears')}</NativeSelectOption>
            {years.map((year) => (
              <NativeSelectOption key={year} value={year}>
                {year}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {sortSelect('ev-sort', 'hidden lg:block')}

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
              <div className="flex flex-col gap-6 overflow-y-auto px-5 pb-5">
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-3 text-[16px] font-bold">{t('typeLegend')}</legend>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip href={archiveHref(params, { type: null })} pressed={!params.type}>
                      {t('allTypes')}
                    </FilterChip>
                    {types.map((type) => (
                      <FilterChip
                        key={type.id}
                        href={archiveHref(params, { type: type.slug })}
                        pressed={params.type === type.slug}
                      >
                        {type.name}
                      </FilterChip>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-3 text-[16px] font-bold">{t('yearLegend')}</legend>
                  <div className="grid grid-cols-4 gap-2 [&_a]:justify-center [&_a]:px-0">
                    <FilterChip href={archiveHref(params, { year: null })} pressed={!params.year}>
                      {t('allYears')}
                    </FilterChip>
                    {years.map((year) => (
                      <FilterChip
                        key={year}
                        href={archiveHref(params, { year: params.year === year ? null : year })}
                        pressed={params.year === year}
                      >
                        {year}
                      </FilterChip>
                    ))}
                  </div>
                </fieldset>
              </div>
              <SheetFooter className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-2.5">
                <Button
                  variant="secondary"
                  onClick={() => go({ type: null, year: null })}
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
          {sortSelect('ev-sort-m')}
        </div>
      </div>

      <div role="group" aria-label={t('types')} className="hidden flex-wrap gap-2 lg:flex">
        <FilterChip href={archiveHref(params, { type: null })} pressed={!params.type}>
          {t('allTypes')}
        </FilterChip>
        {types.map((type) => (
          <FilterChip
            key={type.id}
            href={archiveHref(params, { type: type.slug })}
            pressed={params.type === type.slug}
          >
            {type.name}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

/** Search box: replaces the URL 400 ms after typing stops (and at once on Enter). */
function SearchBox({ value: urlValue, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const t = useTranslations('events.filters');
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
      <label htmlFor="ev-search" className="sr-only">
        {t('search')}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-ink"
        aria-hidden
      />
      <Input
        id="ev-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={cn('pl-11')}
        placeholder={t('searchPlaceholder')}
      />
    </form>
  );
}
