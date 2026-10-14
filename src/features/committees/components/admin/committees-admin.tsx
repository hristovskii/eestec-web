'use client';

import { Download, MapPin, Plus, Trash2, Upload } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import {
  AdminBadge,
  type AdminBadgeTone,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
  TablePanel,
} from '@/shared/admin-ui/admin-page';
import { type Column, DataTable } from '@/shared/admin-ui/data-table';
import { ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { FilterBar, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { Paged } from '@/shared/data/paged';
import { countryName } from '@/shared/i18n/country';
import { resolveLocalized } from '@/shared/i18n/localized';
import { hrefWithParams } from '@/shared/lib/search-params';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu';

import { deleteCommittees } from '../../actions/admin-committees';
import {
  type AdminCommitteesParams,
  COMMITTEE_PAGE_SIZES,
  hasCommitteeFilters,
} from '../../schemas/admin-committees-params.schema';
import { COMMITTEE_STATUSES, type Committee, type CommitteeCounts, type CommitteeStatus } from '../../types';
import { CommitteeDialog } from './committee-dialog';
import { ImportDialog } from './import-dialog';

const TYPE_TONE: Record<CommitteeStatus, AdminBadgeTone> = {
  lc: 'dark',
  observer: 'outline',
  jlc: 'neutral',
};

type CommitteesAdminProps = {
  page: Paged<Committee> & { counts: CommitteeCounts; countries: string[] };
  params: AdminCommitteesParams;
  totals: { committees: number; countries: number };
  canEdit: boolean;
};

/** /admin/pages/map: the committees of the Home map (pattern: AdminEvents). */
export function CommitteesAdmin({ page, params, totals, canEdit }: CommitteesAdminProps) {
  const t = useTranslations('admin.committees');
  const { hrefWith, update, params: urlParams } = useUrlParams();
  const [editing, setEditing] = React.useState<{ committee: Committee | null; key: number } | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Committee[] | null>(null);
  const [, startTransition] = React.useTransition();

  const type = (committee: Committee) => (
    <AdminBadge tone={TYPE_TONE[committee.status]}>{t(`typesShort.${committee.status}`)}</AdminBadge>
  );
  const website = (committee: Committee) =>
    committee.url ? (
      <a
        href={committee.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-dark"
      >
        {new URL(committee.url).hostname.replace(/^www\./, '')}
      </a>
    ) : (
      <span className="text-muted-ink">{t('row.none')}</span>
    );
  const open = (committee: Committee | null) => setEditing({ committee, key: Date.now() });

  const columns: Column<Committee>[] = [
    {
      key: 'committee',
      header: t('columns.committee'),
      sort: 'name',
      cell: (committee) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="flex min-w-0 flex-col items-start">
            {canEdit ? (
              <button
                type="button"
                onClick={() => open(committee)}
                className="cursor-pointer text-left font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {committee.name}
              </button>
            ) : (
              <span className="font-medium">{committee.name}</span>
            )}
            <span className="text-[13px] text-muted-ink">{resolveLocalized(committee.city, 'en')}</span>
          </span>
          {committee.isHome && (
            <AdminBadge tone="neutral" dot={false}>
              {t('ours')}
            </AdminBadge>
          )}
        </span>
      ),
    },
    {
      key: 'country',
      header: t('columns.country'),
      sort: 'country',
      cell: (committee) => countryName(committee.country, 'en'),
    },
    { key: 'type', header: t('columns.type'), sort: 'status', cell: type },
    { key: 'website', header: t('columns.website'), cell: website },
  ];

  const clearFilters = () => update({ q: null, status: null, country: null });
  const exportHref = hrefWithParams('/api/export/committees', urlParams.toString(), {
    page: null,
    size: null,
  });
  const removalBlocked = toDelete?.length === 1 && toDelete[0]!.isHome;

  const actions = (
    <>
      <Button asChild variant="quiet" size="sm">
        {/* A file download: a plain link, so the browser handles it. */}
        <a href={exportHref} download>
          <Download aria-hidden />
          {t('export')}
        </a>
      </Button>
      {canEdit && (
        <>
          <Button variant="quiet" size="sm" onClick={() => setImporting(true)}>
            <Upload aria-hidden />
            {t('importCsv')}
          </Button>
          <Button size="sm" onClick={() => open(null)}>
            <Plus aria-hidden />
            {t('add')}
          </Button>
        </>
      )}
    </>
  );

  return (
    <AdminPage>
      <AdminPageHeader title={t('title')} description={t('description')} actions={actions} />
      <p className="-mt-2 rounded-md bg-surface px-4 py-3 text-small text-ink-2">
        {t.rich('hint', {
          committees: totals.committees,
          countries: totals.countries,
          link: (chunks) => (
            <Link href={'/admin/pages/home' as Route} className="font-medium text-brand-dark">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <TablePanel>
        <AdminTabs
          label={t('tabs.label')}
          tabs={[
            {
              href: hrefWith({ status: null, page: null }),
              label: t('tabs.all'),
              count: page.counts.all,
              current: !params.status,
            },
            ...COMMITTEE_STATUSES.map((status) => ({
              href: hrefWith({ status, page: null }),
              label: t(`types.${status}`),
              count: page.counts[status],
              current: params.status === status,
            })),
          ]}
        />
        <FilterBar
          search={{ param: 'q', label: t('filters.search'), placeholder: t('filters.searchPlaceholder') }}
          filterParams={['country']}
        >
          <SelectFilter
            param="country"
            label={t('filters.country')}
            anyLabel={t('filters.countryAny')}
            width="200px"
            options={page.countries.map((code) => ({ value: code, label: countryName(code, 'en') }))}
          />
        </FilterBar>
        <DataTable
          label={t('title')}
          rows={page.items}
          columns={columns}
          rowKey={(committee) => committee.id}
          rowLabel={(committee) => committee.name}
          bulkActions={
            canEdit
              ? (selected) => (
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    onClick={() =>
                      setToDelete(page.items.filter((committee) => selected.includes(committee.id)))
                    }
                  >
                    <Trash2 aria-hidden />
                    {t('bulk.delete')}
                  </Button>
                )
              : undefined
          }
          rowActions={
            canEdit
              ? (committee) => (
                  <>
                    <DropdownMenuItem onSelect={() => open(committee)}>{t('row.edit')}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setToDelete([committee])}>
                      <Trash2 aria-hidden />
                      {t('row.delete')}
                    </DropdownMenuItem>
                  </>
                )
              : undefined
          }
          card={(committee) => (
            <div className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <strong className="font-medium">{committee.name}</strong>
                {committee.isHome && (
                  <AdminBadge tone="neutral" dot={false}>
                    {t('ours')}
                  </AdminBadge>
                )}
              </span>
              <span className="text-[13px] text-muted-ink">
                {resolveLocalized(committee.city, 'en')}, {countryName(committee.country, 'en')}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-[13px]">
                {type(committee)}
                {website(committee)}
              </span>
            </div>
          )}
          empty={
            hasCommitteeFilters(params) ? (
              <EmptyState
                variant="admin"
                title={t('empty.filteredTitle')}
                actions={
                  <Button variant="quiet" size="sm" onClick={clearFilters}>
                    {t('empty.clear')}
                  </Button>
                }
              >
                {t('empty.filteredText')}
              </EmptyState>
            ) : (
              <EmptyState variant="admin" icon={<MapPin />} title={t('empty.noneTitle')}>
                {t('empty.noneText')}
              </EmptyState>
            )
          }
        />
        {page.items.length > 0 && (
          <TablePagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            sizes={COMMITTEE_PAGE_SIZES}
          />
        )}
      </TablePanel>

      {editing && (
        <CommitteeDialog
          key={editing.key}
          committee={editing.committee}
          open
          onOpenChange={(next) => !next && setEditing(null)}
        />
      )}
      {importing && <ImportDialog open onOpenChange={(next) => !next && setImporting(false)} />}

      <ConfirmDeleteDialog
        open={toDelete !== null}
        onOpenChange={(next) => !next && setToDelete(null)}
        title={
          toDelete?.length === 1
            ? t('delete.titleOne', { name: toDelete[0]!.name })
            : t('delete.titleMany', { count: toDelete?.length ?? 0 })
        }
        description={removalBlocked ? t('delete.textHome') : t('delete.text')}
        confirmLabel={toDelete?.length === 1 ? t('delete.confirmOne') : t('delete.confirmMany')}
        onConfirm={() => {
          const ids = toDelete?.map((committee) => committee.id) ?? [];
          startTransition(async () => {
            const result = await deleteCommittees(ids);
            if (!result.ok) {
              toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
              return;
            }
            setToDelete(null);
            if (result.data.deleted > 0) toast.success(t('toasts.deleted', { count: result.data.deleted }));
            if (result.data.keptHome) toast.error(t('toasts.keptHome'));
          });
        }}
      />
    </AdminPage>
  );
}
