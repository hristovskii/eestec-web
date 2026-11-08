'use client';

import { ExternalLink, Pencil, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminBadge, AdminPage, AdminPageHeader, AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';
import { type Column, DataTable } from '@/shared/admin-ui/data-table';
import { AdminDialog, ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { FilterBar, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { Paged } from '@/shared/data/paged';
import { formatDate } from '@/shared/i18n/format';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu';

import { deleteMemory, setMemoryFeatured, unpublishMemory } from '../../actions/admin-memories';
import { MEMORY_PAGE_SIZES, type AdminMemoriesParams } from '../../schemas/admin-memories-params.schema';
import { MEMORY_STATUSES, type AdminMemoryCounts, type AdminMemoryRow } from '../../types';

type Row = AdminMemoryRow & { eventTitle: string };

const statusTone = {
  draft: 'neutral',
  pending: 'attention',
  published: 'dark',
  rejected: 'attention',
} as const;

/** /admin/memories: every Memory with its status, filters, and Edit / Unpublish / Delete / Feature on Home. */
export function MemoriesAdmin({
  page,
  counts,
  params,
  authors,
  canEdit,
  canDelete,
}: {
  page: Paged<Row>;
  counts: AdminMemoryCounts;
  params: AdminMemoriesParams;
  /** From `members`, by user id: the route brings them because `memories` does not know people. */
  authors: Record<string, string>;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations('admin.memories');
  const { update, hrefWith } = useUrlParams();
  const [toUnpublish, setToUnpublish] = React.useState<Row | null>(null);
  const [toDelete, setToDelete] = React.useState<Row | null>(null);
  const filtered = Boolean(params.q) || params.status !== 'all';
  const author = (row: Row) => (row.authorId ? (authors[row.authorId] ?? '—') : t('former'));

  const failed = (result: { ok: boolean; error?: string } | null) =>
    toast.error(result?.error === 'forbidden' ? t('toasts.forbidden') : t('toasts.error'));

  async function feature(row: Row) {
    const result = await setMemoryFeatured({ id: row.id, featured: !row.featuredOnHome }).catch(() => null);
    if (result?.ok) toast.success(row.featuredOnHome ? t('toasts.unfeatured') : t('toasts.featured'));
    else failed(result);
  }

  const columns: Column<Row>[] = [
    {
      key: 'title',
      header: t('columns.title'),
      cell: (row) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <Link href={`/admin/memories/${row.id}` as never} className="font-medium text-ink hover:underline">
            {row.title || '—'}
          </Link>
          {row.featuredOnHome && (
            <span className="inline-flex items-center gap-1 text-[12px] text-brand-dark">
              <Star className="size-3" aria-hidden />
              {t('status.featured')}
            </span>
          )}
        </span>
      ),
    },
    { key: 'author', header: t('columns.author'), cell: author },
    {
      key: 'event',
      header: t('columns.event'),
      cell: (row) => row.eventTitle || <span className="text-muted-ink">{t('noEvent')}</span>,
    },
    {
      key: 'status',
      header: t('columns.status'),
      cell: (row) => <StatusBadges row={row} />,
    },
    {
      key: 'updated',
      header: t('columns.updated'),
      className: 'whitespace-nowrap text-muted-ink',
      cell: (row) => formatDate(row.updatedAt, 'en', 'date'),
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader title={t('title')} description={t('description')} />
      <TablePanel>
        <AdminTabs
          label={t('tabsLabel')}
          tabs={(['all', ...MEMORY_STATUSES] as const).map((status) => ({
            href: hrefWith({ status: status === 'all' ? null : status, page: null }) as never,
            current: params.status === status,
            label: (
              <>
                {t(`tabs.${status}`)}
                <span className="ml-1.5 text-[13px] text-muted-ink">{counts[status]}</span>
              </>
            ),
          }))}
        />
        <FilterBar
          search={{ label: t('search'), param: 'q', placeholder: t('search') }}
          filterParams={['status']}
        >
          <SelectFilter
            param="status"
            label={t('columns.status')}
            anyLabel={t('tabs.all')}
            width="170px"
            options={MEMORY_STATUSES.map((status) => ({ value: status, label: t(`tabs.${status}`) }))}
          />
        </FilterBar>
        <DataTable
          label={t('title')}
          rows={page.items}
          columns={columns}
          rowKey={(row) => row.id}
          rowLabel={(row) => row.title}
          rowActions={(row) => (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/admin/memories/${row.id}` as never}>
                  <Pencil aria-hidden />
                  {t('rowActions.edit')}
                </Link>
              </DropdownMenuItem>
              {row.status === 'published' && row.slug && (
                <DropdownMenuItem asChild>
                  <a href={`/en/memories/${row.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden />
                    {t('rowActions.view')}
                  </a>
                </DropdownMenuItem>
              )}
              {canEdit && row.status === 'published' && (
                <DropdownMenuItem onSelect={() => void feature(row)}>
                  <Star aria-hidden />
                  {row.featuredOnHome ? t('rowActions.unfeature') : t('rowActions.feature')}
                </DropdownMenuItem>
              )}
              {canEdit && row.status === 'published' && (
                <DropdownMenuItem onSelect={() => setToUnpublish(row)}>
                  {t('rowActions.unpublish')}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(row)}>
                    <Trash2 aria-hidden />
                    {t('rowActions.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
          card={(row) => (
            <div className="flex min-w-0 flex-col gap-1.5">
              <Link href={`/admin/memories/${row.id}` as never} className="font-medium text-ink">
                {row.title || '—'}
              </Link>
              <span className="text-small text-muted-ink">
                {author(row)} · {row.eventTitle || t('noEvent')}
              </span>
              <StatusBadges row={row} />
            </div>
          )}
          empty={
            <EmptyState
              variant="admin"
              title={filtered ? t('empty.filteredTitle') : t('empty.title')}
              actions={
                filtered && (
                  <Button variant="quiet" size="sm" onClick={() => update({ status: null, q: null })}>
                    {t('empty.clear')}
                  </Button>
                )
              }
            >
              {!filtered && t('empty.text')}
            </EmptyState>
          }
        />
        {page.total > 0 && (
          <TablePagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            sizes={MEMORY_PAGE_SIZES}
            sizeLabel={t('perPage')}
          />
        )}
      </TablePanel>

      <AdminDialog
        open={toUnpublish !== null}
        onOpenChange={(open) => !open && setToUnpublish(null)}
        title={t('unpublish.title', { title: toUnpublish?.title ?? '' })}
        description={t('unpublish.text')}
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setToUnpublish(null)}>
              {t('unpublish.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!toUnpublish) return;
                const result = await unpublishMemory(toUnpublish.id).catch(() => null);
                if (result?.ok) toast.success(t('toasts.unpublished'));
                else failed(result);
                setToUnpublish(null);
              }}
            >
              {t('unpublish.confirm')}
            </Button>
          </>
        }
      />
      <ConfirmDeleteDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('delete.title', { title: toDelete?.title ?? '' })}
        description={t('delete.text')}
        confirmLabel={t('delete.confirm')}
        onConfirm={async () => {
          if (!toDelete) return;
          const result = await deleteMemory(toDelete.id).catch(() => null);
          if (result?.ok) toast.success(t('toasts.deleted'));
          else failed(result);
          setToDelete(null);
        }}
      />
    </AdminPage>
  );
}

function StatusBadges({ row }: { row: Row }) {
  const t = useTranslations('admin.memories.status');
  return (
    <span className="flex flex-wrap gap-1.5">
      <AdminBadge tone={statusTone[row.status]}>{t(row.status)}</AdminBadge>
      {row.revision && (
        <AdminBadge tone="attention">
          {t(row.revision === 'rejected' ? 'changesRejected' : 'changesPending')}
        </AdminBadge>
      )}
    </span>
  );
}
