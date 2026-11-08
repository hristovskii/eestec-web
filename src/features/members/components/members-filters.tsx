'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/shared/i18n/navigation';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { membersHref, type MembersParams } from '../schemas/members-href';

/** Search box: replaces the URL 400 ms after typing stops (and at once on Enter). */
function SearchBox({
  id,
  label,
  placeholder,
  value: urlValue,
  onSearch,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onSearch: (q: string) => void;
}) {
  const [value, setValue] = React.useState(urlValue);
  const [lastUrlValue, setLastUrlValue] = React.useState(urlValue);
  // Clear all, a removed tag or the back button changed the URL: show its value.
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    setValue(urlValue);
  }
  React.useEffect(() => {
    if (value.trim() === urlValue) return;
    const timer = window.setTimeout(() => onSearch(value.trim()), 400);
    return () => window.clearTimeout(timer);
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
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-ink"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="pl-11"
        placeholder={placeholder}
      />
    </form>
  );
}

function useNavigate(params: MembersParams) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const go = React.useCallback(
    (patch: Parameters<typeof membersHref>[1]) =>
      startTransition(() => router.replace(membersHref(params, patch), { scroll: false })),
    [params, router],
  );
  return { go, pending };
}

/** Search, year joined and sort of the active members (every value lives in the URL). Year and sort are for large screens only (drawn that way). */
export function MembersFilters({
  params,
  joinedOptions,
}: {
  params: MembersParams;
  joinedOptions: { value: string; year: number; earlier: boolean }[];
}) {
  const t = useTranslations('members.active');
  const { go, pending } = useNavigate(params);
  const search = React.useCallback((q: string) => go({ q: q || null }), [go]);

  return (
    <div
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_180px]"
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
    >
      <SearchBox
        id="mb-q"
        label={t('search')}
        placeholder={t('searchPlaceholder')}
        value={params.q ?? ''}
        onSearch={search}
      />
      <div className="hidden lg:block">
        <label htmlFor="mb-year" className="sr-only">
          {t('year')}
        </label>
        <NativeSelect
          id="mb-year"
          value={params.year ?? ''}
          onChange={(event) => go({ year: event.target.value || null })}
        >
          <NativeSelectOption value="">{t('anyYear')}</NativeSelectOption>
          {joinedOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.earlier ? t('earlier', { year: option.year }) : option.year}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="hidden lg:block">
        <label htmlFor="mb-sort" className="sr-only">
          {t('sort')}
        </label>
        <NativeSelect id="mb-sort" value={params.sort} onChange={(event) => go({ sort: event.target.value })}>
          <NativeSelectOption value="name">{t('sortName')}</NativeSelectOption>
          <NativeSelectOption value="newest">{t('sortNewest')}</NativeSelectOption>
          <NativeSelectOption value="longest">{t('sortLongest')}</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}

/** "Show board": one board at a time, the address keeps the choice (`board=2025/2026`). */
export function BoardSelect({
  params,
  mandates,
  selected,
}: {
  params: MembersParams;
  mandates: { label: string; isCurrent: boolean }[];
  selected: string;
}) {
  const t = useTranslations('members.board');
  const { go, pending } = useNavigate(params);
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-60" aria-busy={pending || undefined}>
      <label htmlFor="mb-board" className="text-small font-medium max-sm:sr-only">
        {t('show')}
      </label>
      <NativeSelect
        id="mb-board"
        value={selected}
        onChange={(event) => {
          const current = mandates.find((mandate) => mandate.isCurrent)?.label;
          go({ board: event.target.value === current ? null : event.target.value });
        }}
      >
        {mandates.map((mandate) => (
          <NativeSelectOption key={mandate.label} value={mandate.label}>
            {mandate.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

/** Search in the alumni block (`aq=`); desktop only, as drawn. */
export function AlumniSearch({ params }: { params: MembersParams }) {
  const t = useTranslations('members.alumni');
  const { go } = useNavigate(params);
  const search = React.useCallback((q: string) => go({ aq: q || null }), [go]);
  return (
    <div className="w-full sm:w-[300px]">
      <SearchBox
        id="al-q"
        label={t('search')}
        placeholder={t('search')}
        value={params.aq ?? ''}
        onSearch={search}
      />
    </div>
  );
}
