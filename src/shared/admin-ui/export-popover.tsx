'use client';

import { ChevronDown, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { EXPORT_RANGES, type ExportRange } from '@/shared/lib/inbox';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/primitives/popover';

import { useUrlParams } from './use-url-params';

type ExportPopoverProps = {
  /** Which list is exported: picks the wording ("messages", "inquiries", "applications"). */
  kind: 'contact' | 'partners' | 'membership';
  /** `/api/export/<resource>` */
  resource: string;
  /** What the list is filtered by right now ("New · Membership"); null: no filter. */
  currentFilter: string | null;
};

/** The URL params of the list that "Only the current filter" passes on. */
const FILTER_PARAMS = ['status', 'subject', 'q'] as const;

/**
 * "Export CSV" (AdminInbox): a small panel with the date range, whether finished items are in, and
 * whether only the current filter is. It shows how many rows the file will have.
 */
export function ExportPopover({ kind, resource, currentFilter }: ExportPopoverProps) {
  const t = useTranslations('admin.inbox.export');
  const { params } = useUrlParams();
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<ExportRange>('30d');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [closed, setClosed] = React.useState(true);
  const [current, setCurrent] = React.useState(false);
  const [count, setCount] = React.useState<number | null>(null);
  const id = React.useId();

  const query = React.useMemo(() => {
    const search = new URLSearchParams({ range, closed: closed ? '1' : '0' });
    if (range === 'custom') {
      if (from) search.set('from', from);
      if (to) search.set('to', to);
    }
    if (current) {
      search.set('current', '1');
      for (const name of FILTER_PARAMS) {
        const value = params.get(name);
        if (value) search.set(name, value);
      }
    }
    return search.toString();
  }, [range, from, to, closed, current, params]);

  // How many rows the file will have: asked again when an option changes.
  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/export/${resource}?${query}&count=1`, { signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<{ count: number }>) : null))
        .then((body) => setCount(body ? body.count : null))
        .catch(() => undefined);
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, resource, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="quiet" aria-haspopup="dialog">
          <Download aria-hidden />
          {t('button')}
          <ChevronDown aria-hidden className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent role="dialog" aria-label={t('dialog')} className="flex flex-col gap-3.5">
        <strong>{t(`title.${kind}`)}</strong>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-range`} className="text-[13px] font-medium">
            {t('range')}
          </label>
          <NativeSelect
            id={`${id}-range`}
            value={range}
            onChange={(event) => setRange(event.target.value as ExportRange)}
          >
            {EXPORT_RANGES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {t(`ranges.${value}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              {t('from')}
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              {t('to')}
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        )}
        <label className="flex items-center gap-2.5 text-[13px]">
          <input
            type="checkbox"
            className="size-4.5 accent-brand"
            checked={closed}
            onChange={(event) => setClosed(event.target.checked)}
          />
          {t(`closed.${kind}`)}
        </label>
        <label className="flex items-center gap-2.5 text-[13px]">
          <input
            type="checkbox"
            className="size-4.5 accent-brand"
            checked={current && currentFilter !== null}
            disabled={currentFilter === null}
            onChange={(event) => setCurrent(event.target.checked)}
          />
          {currentFilter === null ? t('currentNone') : t('current', { filter: currentFilter })}
        </label>
        <span role="status" className="text-[13px] text-muted-ink">
          {count === null ? '…' : t(`count.${kind}`, { count })} · {t('opensIn')}
        </span>
        <Button asChild>
          <a href={`/api/export/${resource}?${query}`} download onClick={() => setOpen(false)}>
            {t('download')}
          </a>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
