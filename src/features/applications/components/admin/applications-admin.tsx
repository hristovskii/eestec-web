'use client';

import { ClipboardList } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
  AdminBadge,
  type AdminBadgeTone,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
  TablePanel,
} from '@/shared/admin-ui/admin-page';
import { CellTitle, type Column, DataTable } from '@/shared/admin-ui/data-table';
import { formatDate, formatDateRange } from '@/shared/i18n/format';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';

import type { ApplicationEvent } from '../../admin-queries';
import type { ApplyPhase } from '../../domain/application-state';

/** Admin tones for the application state: red only where it needs action (closing soon). */
export const PHASE_TONE: Record<ApplyPhase, AdminBadgeTone> = {
  off: 'muted',
  opening_soon: 'outline',
  open: 'dark',
  deadline_soon: 'attention',
  closed: 'muted',
  full_waitlist: 'neutral',
  full: 'neutral',
};

const eventHref = (row: ApplicationEvent) => `/admin/applications?event=${row.id}`;

type ApplicationsAdminProps = {
  rows: ApplicationEvent[];
  tab: 'upcoming' | 'past';
  counts: { upcoming: number; past: number };
  access: 'full' | 'own';
};

/** /admin/applications: the events taking applications on this site (pattern: AdminEvents). */
export function ApplicationsAdmin({ rows, tab, counts, access }: ApplicationsAdminProps) {
  const t = useTranslations('admin.applications');
  const tStatus = useTranslations('admin.ui.status');

  const places = (row: ApplicationEvent) => {
    const taken = row.summary?.byStatus.accepted ?? 0;
    const max = row.applicationSettings.maxParticipants;
    return max === null ? t('placesNoLimit', { taken }) : t('places', { taken, max });
  };
  const applications = (row: ApplicationEvent) => (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <strong className="tabular-nums">{row.summary?.total ?? 0}</strong>
      {(row.summary?.newCount ?? 0) > 0 && (
        <AdminBadge tone="attention" dot={false}>
          {t('newCount', { count: row.summary!.newCount })}
        </AdminBadge>
      )}
    </span>
  );
  const deadline = (row: ApplicationEvent) =>
    row.applicationSettings.deadline
      ? formatDate(row.applicationSettings.deadline, 'en', 'dateTime')
      : t('noDeadline');
  // "21–22 Nov 2026 · Draft": admins see drafts too.
  const meta = (row: ApplicationEvent) =>
    [formatDateRange(row.startsAt, row.endsAt, 'en'), row.status !== 'published' && tStatus(row.status)]
      .filter(Boolean)
      .join(' · ');
  const phase = (row: ApplicationEvent) => (
    <AdminBadge tone={PHASE_TONE[row.apply.phase]}>{t(`phase.${row.apply.phase}`)}</AdminBadge>
  );

  const columns: Column<ApplicationEvent>[] = [
    {
      key: 'event',
      header: t('columns.event'),
      cell: (row) => (
        <CellTitle
          href={eventHref(row)}
          title={row.title}
          meta={formatDateRange(row.startsAt, row.endsAt, 'en')}
        />
      ),
    },
    { key: 'deadline', header: t('columns.deadline'), cell: deadline, className: 'whitespace-nowrap' },
    { key: 'applications', header: t('columns.applications'), cell: applications },
    { key: 'places', header: t('columns.places'), cell: places, className: 'whitespace-nowrap tabular-nums' },
    { key: 'status', header: t('columns.status'), cell: phase },
    {
      key: 'view',
      header: <span className="sr-only">{t('view')}</span>,
      className: 'text-right',
      cell: (row) => (
        <Button asChild variant="quiet" size="sm">
          <Link href={eventHref(row) as Route} aria-label={t('viewLabel', { title: row.title })}>
            {t('view')}
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('title')}
        description={access === 'own' ? t('descriptionOwn') : t('description')}
      />
      <TablePanel>
        <AdminTabs
          label={t('tabs.label')}
          tabs={(['upcoming', 'past'] as const).map((value) => ({
            href: value === 'upcoming' ? '/admin/applications' : '/admin/applications?tab=past',
            label: t(`tabs.${value}`),
            count: counts[value],
            current: tab === value,
          }))}
        />
        <DataTable
          label={t('title')}
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          rowLabel={(row) => row.title}
          card={(row) => (
            <div className="flex flex-col gap-1.5">
              <Link
                href={eventHref(row) as Route}
                className="font-medium text-ink no-underline hover:underline"
              >
                {row.title}
              </Link>
              <span className="text-[13px] text-muted-ink">
                {meta(row)} · {places(row)}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-[13px]">
                {phase(row)}
                {applications(row)}
              </span>
            </div>
          )}
          empty={
            <EmptyState variant="admin" icon={<ClipboardList />} title={t(`empty.${tab}Title`)}>
              {t(`empty.${tab}Text`)}
            </EmptyState>
          }
        />
      </TablePanel>
    </AdminPage>
  );
}
