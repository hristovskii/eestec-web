'use client';

import { CalendarPlus, Download, Plus, Trash2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { MediaItem } from '@/features/media';
import {
  AdminBadge,
  type AdminBadgeTone,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
  TablePanel,
} from '@/shared/admin-ui/admin-page';
import { CellTitle, type Column, DataTable } from '@/shared/admin-ui/data-table';
import { ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { FilterBar, SegmentFilter, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { Paged } from '@/shared/data/paged';
import type { ActionResult } from '@/shared/forms/action-result';
import { dayInSkopje, formatDate, formatDateRange } from '@/shared/i18n/format';
import { hrefWithParams } from '@/shared/lib/search-params';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu';

import { deleteEvents, duplicateEvent, setEventsStatus } from '../../actions/admin-events';
import {
  type AdminEventsParams,
  EVENT_PAGE_SIZES,
  hasEventFilters,
} from '../../schemas/admin-events-params.schema';
import type { AdminEventCounts, AdminEventRow, ContentStatus } from '../../types';
import { EventThumb } from './event-thumb';

const STATUS_TONE: Record<ContentStatus, AdminBadgeTone> = {
  published: 'dark',
  draft: 'outline',
  hidden: 'muted',
};

type EventsAdminListProps = {
  page: Paged<AdminEventRow> & { counts: AdminEventCounts };
  params: AdminEventsParams;
  years: number[];
  types: { id: string; name: string }[];
  covers: Record<string, MediaItem>;
  /** 'own': event managers (D18) see, edit and publish only the events they manage. */
  access: 'full' | 'own';
  canCreate: boolean;
  canDelete: boolean;
  canEditTypes: boolean;
  /** Server "now" (ISO), for "Today, 16:02" / "Yesterday". */
  now: string;
};

/** /admin/events (AdminEvents, AdminEvents-Empty): tabs, filters, bulk actions, pages. */
export function EventsAdminList({
  page,
  params,
  years,
  types,
  covers,
  access,
  canCreate,
  canDelete,
  canEditTypes,
  now,
}: EventsAdminListProps) {
  const t = useTranslations('admin.events');
  const tStatus = useTranslations('admin.ui.status');
  const router = useRouter();
  const { hrefWith, update, params: urlParams } = useUrlParams();
  const [toDelete, setToDelete] = React.useState<AdminEventRow[] | null>(null);
  const [, startTransition] = React.useTransition();

  const tab = (value: 'upcoming' | 'past' | null, label: string, count: number) => ({
    href: hrefWith({ tab: value }),
    label,
    count,
    current: (params.tab ?? null) === value,
  });

  const failed = (result: Exclude<ActionResult<unknown>, { ok: true }>) => {
    toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
  };

  const changeStatus = (ids: string[], status: ContentStatus, clear: () => void) =>
    startTransition(async () => {
      const result = await setEventsStatus({ ids, status });
      if (!result.ok) return failed(result);
      clear();
      const { changed, notReady, defaultCover } = result.data;
      if (changed > 0)
        toast.success(t(`toasts.${status}`, { count: changed }), {
          description:
            defaultCover.length > 0
              ? t('toasts.defaultCover', { count: defaultCover.length, title: defaultCover[0]! })
              : undefined,
        });
      else if (notReady.length === 0) toast(t('toasts.unchanged'));
      if (notReady.length > 0)
        toast.error(t('toasts.notReady', { count: notReady.length, title: notReady[0]! }), {
          description: t(notReady.length === 1 ? 'toasts.notReadyText' : 'toasts.notReadyTextMany'),
        });
    });

  const duplicate = (row: AdminEventRow) =>
    startTransition(async () => {
      const result = await duplicateEvent(row.id);
      if (!result.ok) return failed(result);
      toast.success(t('toasts.duplicated'));
      router.push(`/admin/events/${result.data.id}` as Route);
    });

  const editedAt = (row: AdminEventRow) => {
    const day = dayInSkopje(row.updatedAt);
    const today = dayInSkopje(now);
    const yesterday = dayInSkopje(new Date(Date.parse(now) - 24 * 60 * 60 * 1000));
    if (day === today) return t('edited.today', { time: formatDate(row.updatedAt, 'en', 'time') });
    if (day === yesterday) return t('edited.yesterday');
    return day.slice(0, 4) === today.slice(0, 4)
      ? formatDate(row.updatedAt, 'en', 'dayMonth')
      : formatDate(row.updatedAt, 'en', 'date');
  };

  const applications = (row: AdminEventRow) => {
    const summary = row.applications;
    switch (summary.kind) {
      case 'none':
        return t('applications.none');
      case 'external':
        return t('applications.external');
      case 'count':
        return summary.full ? t('applications.full', { count: summary.count }) : String(summary.count);
    }
  };

  const status = (row: AdminEventRow) => (
    <AdminBadge tone={STATUS_TONE[row.status]}>{tStatus(row.status)}</AdminBadge>
  );
  const dates = (row: AdminEventRow) => formatDateRange(row.startsAt, row.endsAt, 'en');
  const editHref = (row: AdminEventRow) => `/admin/events/${row.id}`;
  const path = (row: AdminEventRow) => `/${row.timing === 'upcoming' ? 'upcoming' : 'events'}/${row.slug}`;
  const thumb = (row: AdminEventRow) => (
    <EventThumb item={row.cover ? covers[row.cover.mediaId] : undefined} />
  );

  const columns: Column<AdminEventRow>[] = [
    {
      key: 'event',
      header: t('columns.event'),
      sort: 'title',
      cell: (row) => (
        <span className="flex items-center gap-3">
          {thumb(row)}
          <CellTitle href={editHref(row)} title={row.title || t('untitled')} meta={path(row)} />
        </span>
      ),
    },
    { key: 'dates', header: t('columns.dates'), sort: 'dates', cell: dates, className: 'whitespace-nowrap' },
    { key: 'type', header: t('columns.type'), cell: (row) => row.typeName },
    { key: 'category', header: t('columns.category'), cell: (row) => t(`scopes.${row.scope}`) },
    { key: 'status', header: t('columns.status'), cell: status },
    {
      key: 'applications',
      header: t('columns.applications'),
      cell: applications,
      className: 'whitespace-nowrap',
    },
    {
      key: 'edited',
      header: t('columns.edited'),
      cell: (row) => (
        <span className="flex flex-col whitespace-nowrap">
          {editedAt(row)}
          <span className="text-[13px] text-muted-ink">{row.updatedBy.name}</span>
        </span>
      ),
    },
  ];

  // "Hidden · Competition · 2019", like AdminEvents-Empty.
  const filtersInWords = [
    params.status && tStatus(params.status),
    params.type && types.find((type) => type.id === params.type)?.name,
    params.year,
    params.scope && t(`scopes.${params.scope}`),
  ]
    .filter(Boolean)
    .join(' · ');
  const clearFilters = () => update({ q: null, status: null, type: null, year: null, scope: null });

  const addButton = canCreate && (
    <Button asChild size="sm">
      <Link href="/admin/events/new">
        <Plus aria-hidden />
        {t('add')}
      </Link>
    </Button>
  );

  const empty = hasEventFilters(params) ? (
    <EmptyState
      variant="admin"
      title={t('empty.filteredTitle')}
      actions={
        <>
          <Button variant="quiet" size="sm" onClick={clearFilters}>
            {t('empty.clear')}
          </Button>
          {addButton}
        </>
      }
    >
      {t('empty.filteredText', { query: params.q || 'none', filters: filtersInWords || 'none' })}
    </EmptyState>
  ) : (
    <EmptyState
      variant="admin"
      icon={<CalendarPlus />}
      title={t(
        access === 'own' && !params.tab
          ? 'empty.noneOwnTitle'
          : params.tab === 'upcoming'
            ? 'empty.upcomingTitle'
            : params.tab === 'past'
              ? 'empty.pastTitle'
              : 'empty.noneTitle',
      )}
      actions={!params.tab && addButton}
    >
      {t(
        access === 'own' && !params.tab
          ? 'empty.noneOwnText'
          : params.tab === 'upcoming'
            ? 'empty.upcomingText'
            : params.tab === 'past'
              ? 'empty.pastText'
              : 'empty.noneText',
      )}
    </EmptyState>
  );

  const exportHref = hrefWithParams('/api/export/events', urlParams.toString(), { page: null, size: null });

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('title')}
        description={access === 'own' ? t('descriptionOwn') : t('description')}
        actions={
          <>
            {canEditTypes && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/events/types">{t('eventTypes')}</Link>
              </Button>
            )}
            <Button asChild variant="quiet" size="sm">
              {/* A file download: a plain link, so the browser handles it. */}
              <a href={exportHref} download>
                <Download aria-hidden />
                {t('export')}
              </a>
            </Button>
            {addButton}
          </>
        }
      />

      <TablePanel>
        <AdminTabs
          label={t('tabs.label')}
          tabs={[
            tab(null, t('tabs.all'), page.counts.all),
            tab('upcoming', t('tabs.upcoming'), page.counts.upcoming),
            tab('past', t('tabs.past'), page.counts.past),
          ]}
        />
        <FilterBar
          search={{ param: 'q', label: t('filters.search'), placeholder: t('filters.searchPlaceholder') }}
          filterParams={['status', 'type', 'year', 'scope']}
        >
          <SelectFilter
            param="status"
            label={t('filters.status')}
            anyLabel={t('filters.statusAny')}
            width="130px"
            options={(['published', 'draft', 'hidden'] as const).map((value) => ({
              value,
              label: tStatus(value),
            }))}
          />
          <SelectFilter
            param="type"
            label={t('filters.type')}
            anyLabel={t('filters.typeAny')}
            width="170px"
            options={types.map((type) => ({ value: type.id, label: type.name }))}
          />
          <SelectFilter
            param="year"
            label={t('filters.year')}
            anyLabel={t('filters.yearAny')}
            width="110px"
            options={years.map((year) => ({ value: String(year), label: String(year) }))}
          />
          <SegmentFilter
            param="scope"
            label={t('filters.scope')}
            options={[
              { value: '', label: t('filters.scopeAll') },
              { value: 'local', label: t('scopes.local') },
              { value: 'international', label: t('scopes.international') },
            ]}
          />
        </FilterBar>

        <DataTable
          label={t('title')}
          rows={page.items}
          columns={columns}
          rowKey={(row) => row.id}
          rowLabel={(row) => row.title || t('untitled')}
          bulkActions={(selected, clear) => (
            <>
              <Button variant="quiet" size="sm" onClick={() => changeStatus(selected, 'published', clear)}>
                {t('bulk.publish')}
              </Button>
              <Button variant="quiet" size="sm" onClick={() => changeStatus(selected, 'draft', clear)}>
                {t('bulk.draft')}
              </Button>
              <Button variant="quiet" size="sm" onClick={() => changeStatus(selected, 'hidden', clear)}>
                {t('bulk.hide')}
              </Button>
              {canDelete && (
                <Button
                  variant="dangerOutline"
                  size="sm"
                  onClick={() => setToDelete(page.items.filter((row) => selected.includes(row.id)))}
                >
                  <Trash2 aria-hidden />
                  {t('bulk.delete')}
                </Button>
              )}
            </>
          )}
          rowActions={(row) => (
            <>
              <DropdownMenuItem asChild>
                <Link href={editHref(row) as Route}>{t('row.edit')}</Link>
              </DropdownMenuItem>
              {canCreate && (
                <DropdownMenuItem onSelect={() => duplicate(row)}>{t('row.duplicate')}</DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setToDelete([row])}>
                    <Trash2 aria-hidden />
                    {t('row.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
          card={(row) => (
            <div className="flex gap-3">
              {thumb(row)}
              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  href={editHref(row) as Route}
                  className="truncate font-medium text-ink no-underline hover:underline"
                >
                  {row.title || t('untitled')}
                </Link>
                <span className="text-[13px] text-muted-ink">
                  {dates(row)} · {row.typeName}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-ink">
                  {status(row)}
                  {row.applications.kind === 'count'
                    ? row.applications.full
                      ? t('applications.full', { count: row.applications.count })
                      : t('applications.count', { count: row.applications.count })
                    : row.applications.kind === 'external' && t('applications.external')}
                </span>
              </div>
            </div>
          )}
          empty={empty}
        />
        {page.items.length > 0 && (
          <TablePagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            sizes={EVENT_PAGE_SIZES}
          />
        )}
      </TablePanel>

      <ConfirmDeleteDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={
          toDelete?.length === 1
            ? t('delete.titleOne', { title: toDelete[0]!.title || t('untitled') })
            : t('delete.titleMany', { count: toDelete?.length ?? 0 })
        }
        description={
          toDelete?.length === 1
            ? t.rich('delete.textOne', {
                applications:
                  toDelete[0]!.applications.kind === 'count' ? toDelete[0]!.applications.count : 0,
                strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
              })
            : t('delete.textMany')
        }
        confirmLabel={toDelete?.length === 1 ? t('delete.confirmOne') : t('delete.confirmMany')}
        onConfirm={async () => {
          if (!toDelete) return;
          const result = await deleteEvents(toDelete.map((row) => row.id));
          if (!result.ok) return failed(result);
          setToDelete(null);
          toast.success(t('toasts.deleted', { count: result.data.deleted }));
        }}
      />
    </AdminPage>
  );
}
