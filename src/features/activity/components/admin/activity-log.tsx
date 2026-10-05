'use client';

import { useTranslations } from 'next-intl';

import { AdminBadge, AdminPage, AdminPageHeader, TablePanel } from '@/shared/admin-ui/admin-page';
import { type Column, DataTable } from '@/shared/admin-ui/data-table';
import { FilterBar, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { Paged } from '@/shared/data/paged';
import { formatDate } from '@/shared/i18n/format';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';

import { ACTIVITY_PAGE_SIZES, type ActivityParams } from '../../schemas/activity-params.schema';
import { ACTIVITY_AREAS, type ActivityActor, type ActivityEntry } from '../../types';
import { ActivitySentence } from './activity-feed';

/** /admin/activity: the full log with area and person filters (read-only). */
export function ActivityLog({
  page,
  params,
}: {
  page: Paged<ActivityEntry> & { actors: ActivityActor[] };
  params: ActivityParams;
}) {
  const t = useTranslations('admin.activity');
  const { update } = useUrlParams();
  const filtered = Boolean(params.area || params.person);

  const columns: Column<ActivityEntry>[] = [
    {
      key: 'when',
      header: t('columns.when'),
      className: 'whitespace-nowrap text-muted-ink',
      cell: (entry) => formatDate(entry.at, 'en', 'dateTime'),
    },
    { key: 'what', header: t('columns.what'), cell: (entry) => <ActivitySentence entry={entry} /> },
    {
      key: 'area',
      header: t('columns.area'),
      cell: (entry) => <AdminBadge tone="neutral">{t(`areas.${entry.area}`)}</AdminBadge>,
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader title={t('title')} description={t('description')} />
      <TablePanel>
        <FilterBar filterParams={['area', 'person']}>
          <SelectFilter
            param="area"
            label={t('filters.area')}
            anyLabel={t('filters.areaAny')}
            width="170px"
            options={ACTIVITY_AREAS.map((area) => ({ value: area, label: t(`areas.${area}`) }))}
          />
          <SelectFilter
            param="person"
            label={t('filters.person')}
            anyLabel={t('filters.personAny')}
            width="200px"
            options={page.actors.map((actor) => ({ value: actor.userId, label: actor.name }))}
          />
        </FilterBar>
        <DataTable
          label={t('title')}
          rows={page.items}
          columns={columns}
          rowKey={(entry) => entry.id}
          rowLabel={(entry) => entry.target}
          card={(entry) => (
            <div className="flex flex-col gap-1 text-small">
              <ActivitySentence entry={entry} />
              <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-ink">
                {formatDate(entry.at, 'en', 'dateTime')}
                <AdminBadge tone="neutral">{t(`areas.${entry.area}`)}</AdminBadge>
              </span>
            </div>
          )}
          empty={
            <EmptyState
              variant="admin"
              title={filtered ? t('empty.filteredTitle') : t('empty.title')}
              actions={
                filtered && (
                  <Button variant="quiet" size="sm" onClick={() => update({ area: null, person: null })}>
                    {t('empty.clear')}
                  </Button>
                )
              }
            />
          }
        />
        {page.total > 0 && (
          <TablePagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            sizes={ACTIVITY_PAGE_SIZES}
            sizeLabel={t('perPage')}
          />
        )}
      </TablePanel>
    </AdminPage>
  );
}
