'use client';

import { PenLine } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { formatDate } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { Chip } from '@/shared/ui/chip';
import { EmptyState } from '@/shared/ui/empty-state';
import { MediaImage } from '@/shared/ui/media-image';
import { Button } from '@/shared/ui/primitives/button';

import type { MemoryStatus, MyMemoryRow } from '../../types';

type Filter = 'all' | MemoryStatus;
const FILTERS: Filter[] = ['all', 'draft', 'pending', 'rejected', 'published'];

/**
 * My Memories on /profile (MyProfile › #memories): the member's stories with their status, filter
 * chips with counts, and the next step for each ("Continue writing", "Edit and resubmit"). A Memory
 * that was not approved shows the board's note under it.
 */
export function MyMemories({ rows }: { rows: MyMemoryRow[] }) {
  const t = useTranslations('memories.mine');
  const locale = useLocale();
  const [filter, setFilter] = React.useState<Filter>('all');
  const count = (key: Filter) =>
    key === 'all' ? rows.length : rows.filter((row) => row.status === key).length;
  const shown = filter === 'all' ? rows : rows.filter((row) => row.status === filter);

  if (rows.length === 0)
    return (
      <EmptyState
        variant="compact"
        icon={<PenLine />}
        title={t('empty.title')}
        actions={
          <Button asChild size="sm">
            <Link href="/memories/new">{t('create')}</Link>
          </Button>
        }
      >
        <p>{t('empty.text')}</p>
      </EmptyState>
    );

  const date = (iso: string | null, preset: 'dayMonth' | 'date' = 'dayMonth') =>
    iso ? formatDate(iso, locale, preset) : '';
  const meta = (row: MyMemoryRow) => {
    switch (row.status) {
      case 'draft':
        return t('meta.draft', { date: date(row.updatedAt) });
      case 'pending':
        return t('meta.pending', { date: date(row.submittedAt) });
      case 'rejected':
        return t('meta.rejected', { date: date(row.updatedAt) });
      case 'published':
        return t('meta.published', { date: date(row.publishedAt, 'date'), reads: row.readsCount });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t('filters.label')} className="flex flex-wrap gap-2">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-small font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
              filter === key
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-white text-ink hover:border-ink',
            )}
          >
            {t(`filters.${key}`)}
            <span className={cn('text-[13px]', filter === key ? 'text-white/80' : 'text-muted-ink')}>
              {count(key)}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p
          role="status"
          className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-small text-muted-ink"
        >
          {t('filters.none')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider border-y border-divider">
          {shown.map((row) => {
            const editHref = row.slug ? `/memories/${row.slug}/edit` : `/memories/new?draft=${row.id}`;
            return (
              <li key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-divider max-sm:hidden">
                  <MediaImage media={row.cover} preset="thumb" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <strong className="min-w-0 text-[16px] leading-snug">{row.title || t('untitled')}</strong>
                    <StatusChip status={row.status} />
                    {row.revision && (
                      <Chip size="sm" tone={row.revision === 'rejected' ? 'red' : 'outline'}>
                        {t(row.revision === 'rejected' ? 'status.changesRejected' : 'status.changesPending')}
                      </Chip>
                    )}
                  </div>
                  <p className="text-small text-muted-ink">
                    {row.eventTitle && <>{row.eventTitle} · </>}
                    {meta(row)}
                  </p>
                  {row.status === 'rejected' && row.rejectionReason && (
                    <p className="rounded-sm border-l-4 border-brand bg-brand-tint px-3 py-2 text-small">
                      <strong>{t('boardNote')}</strong> {row.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-small font-medium sm:pt-1">
                  {row.status === 'draft' && (
                    <Link href={editHref} className="text-brand-dark">
                      {t('action.continue')}
                    </Link>
                  )}
                  {row.status === 'pending' && row.slug && (
                    <Link href={`/memories/${row.slug}`} className="text-brand-dark">
                      {t('action.view')}
                    </Link>
                  )}
                  {row.status === 'rejected' && (
                    <Link href={editHref} className="font-bold text-brand-dark">
                      {t('action.resubmit')}
                    </Link>
                  )}
                  {row.status === 'published' && row.slug && (
                    <>
                      <Link href={`/memories/${row.slug}`} className="text-brand-dark">
                        {t('action.view')}
                      </Link>
                      <Link href={editHref} className="text-brand-dark">
                        {t('action.edit')}
                      </Link>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: MemoryStatus }) {
  const t = useTranslations('memories.mine.status');
  const tone = { draft: 'outline', pending: 'red', published: 'dark', rejected: 'red' } as const;
  return (
    <Chip size="sm" tone={tone[status]}>
      {t(status)}
    </Chip>
  );
}
