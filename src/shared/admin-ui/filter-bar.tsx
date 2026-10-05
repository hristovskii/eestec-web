'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
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

import { useUrlParams } from './use-url-params';

// Admin list filters (AdminEvents, AdminMobileViews). Every value lives in the URL; changing one
// returns to page 1. Below 768 px the filters move into a bottom sheet behind a "Filters" button.

/** Inline (desktop row) or stacked in the mobile sheet, where labels are visible. */
const LayoutContext = React.createContext<'inline' | 'sheet'>('inline');

type FilterBarProps = {
  /** The search box (always visible). */
  search?: { param: string; label: string; placeholder: string };
  /** URL params of the filters below: counted on the mobile button and removed by "Clear filters". */
  filterParams: string[];
  children: React.ReactNode;
};

export function FilterBar({ search, filterParams, children }: FilterBarProps) {
  const t = useTranslations('admin.ui.filters');
  const { params, update } = useUrlParams();
  const activeFilters = filterParams.filter((name) => params.get(name)).length;
  const hasActive = activeFilters > 0 || (search !== undefined && !!params.get(search.param));

  const clear = () =>
    update(
      Object.fromEntries([...filterParams, ...(search ? [search.param] : [])].map((name) => [name, null])),
    );

  return (
    // Phones get 44 px touch targets; the desktop row uses the compact admin height.
    <div className="flex flex-wrap items-center gap-2.5 border-b border-divider px-4 py-3.5 max-md:[--control-h:44px] md:px-5">
      {search && <SearchFilter {...search} />}
      <div className="hidden md:contents">{children}</div>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="quiet"
            size="icon"
            aria-label={activeFilters ? t('openFilters', { count: activeFilters }) : t('filters')}
            className="relative size-11 md:hidden"
          >
            <SlidersHorizontal aria-hidden />
            {activeFilters > 0 && (
              <span
                aria-hidden
                className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white"
              >
                {activeFilters}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t('filters')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-5 pb-5">
            <LayoutContext value="sheet">{children}</LayoutContext>
          </div>
          <SheetFooter>
            <Button variant="quiet" size="lg" className="flex-1" onClick={clear} disabled={!hasActive}>
              {t('clear')}
            </Button>
            <SheetClose asChild>
              <Button size="lg" className="flex-1">
                {t('showResults')}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {hasActive && (
        <Button variant="ghost" size="sm" className="hidden text-brand-dark md:inline-flex" onClick={clear}>
          {t('clear')}
        </Button>
      )}
    </div>
  );
}

function SearchFilter({ param, label, placeholder }: { param: string; label: string; placeholder: string }) {
  const { params, update } = useUrlParams();
  const urlValue = params.get(param) ?? '';
  const [value, setValue] = React.useState(urlValue);
  const [lastUrlValue, setLastUrlValue] = React.useState(urlValue);
  // The URL changed from outside (Clear filters, back button): show its value.
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    setValue(urlValue);
  }

  // Type, then search 300 ms after the last key press.
  React.useEffect(() => {
    if (value === urlValue) return;
    const id = window.setTimeout(() => update({ [param]: value.trim() || null }), 300);
    return () => window.clearTimeout(id);
  }, [value, urlValue, param, update]);

  return (
    <label className="relative min-w-0 flex-1 md:max-w-[360px] md:min-w-[240px]">
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-ink"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="pl-9 md:text-small"
      />
    </label>
  );
}

type Option = { value: string; label: string };

/** A select filter; the first option ("Any status") is the empty value. Active = dark border. */
export function SelectFilter({
  param,
  label,
  options,
  anyLabel,
  width,
}: {
  param: string;
  label: string;
  options: Option[];
  anyLabel: string;
  /** Desktop width, e.g. "170px". */
  width?: string;
}) {
  const layout = React.use(LayoutContext);
  const { params, update } = useUrlParams();
  const value = params.get(param) ?? '';
  return (
    <label
      className="flex w-full flex-col gap-1.5 md:w-(--filter-w)"
      style={{ '--filter-w': width ?? '160px' } as React.CSSProperties}
    >
      <span className={layout === 'inline' ? 'sr-only' : 'text-small font-medium'}>{label}</span>
      <NativeSelect
        value={value}
        onChange={(event) => update({ [param]: event.target.value || null })}
        className={cn('[&_select]:md:text-small', value && '[&_select]:border-ink [&_select]:font-medium')}
      >
        <NativeSelectOption value="">{anyLabel}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}

/** Segmented filter (All · Local · International); the first option is the empty value. */
export function SegmentFilter({
  param,
  label,
  options,
}: {
  param: string;
  label: string;
  options: Option[];
}) {
  const layout = React.use(LayoutContext);
  const { params, update } = useUrlParams();
  const value = params.get(param) ?? '';
  const labelId = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className={layout === 'inline' ? 'sr-only' : 'text-small font-medium'}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="inline-flex w-fit rounded-sm border border-line-strong bg-white p-[3px]"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => update({ [param]: option.value || null })}
            className={cn(
              'h-[calc(var(--control-h,36px)-8px)] cursor-pointer rounded-sm px-3 text-[13px] font-medium',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
              value === option.value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
