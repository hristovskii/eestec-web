'use client';

import { ArrowLeft, Download, ExternalLink, Inbox, Mail, Paperclip } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { formatBytes } from '@/features/media';
import { AdminPageCrumb } from '@/shared/layout/admin/admin-shell';
import {
  AdminBadge,
  type AdminBadgeTone,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
  TablePanel,
} from '@/shared/admin-ui/admin-page';
import { CellTitle, type Column, DataTable } from '@/shared/admin-ui/data-table';
import { FilterBar, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { Paged } from '@/shared/data/paged';
import { formatDate } from '@/shared/i18n/format';
import { resolveText } from '@/shared/i18n/localized';
import { hrefWithParams } from '@/shared/lib/search-params';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/primitives/sheet';

import { markApplicationRead, setApplicationsStatus } from '../../actions/admin/admin-applications';
import type { ApplicationEvent } from '../../admin-queries';
import {
  type AdminApplicationsParams,
  APPLICATION_PAGE_SIZES,
} from '../../schemas/admin-applications-params.schema';
import {
  type Application,
  type ApplicationField,
  type ApplicationRow,
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type StatusCounts,
} from '../../types';
import { PHASE_TONE } from './applications-admin';

/** The verb of each status change (bulk bar, row menu). */
const MOVE_TO = { pending: 'pending', accepted: 'accept', waitlist: 'waitlist', rejected: 'reject' } as const;

export const STATUS_TONE: Record<ApplicationStatus, AdminBadgeTone> = {
  pending: 'outline',
  accepted: 'dark',
  waitlist: 'neutral',
  rejected: 'muted',
};

type EventApplicationsAdminProps = {
  event: ApplicationEvent;
  page: Paged<ApplicationRow> & { counts: StatusCounts };
  params: AdminApplicationsParams;
  fields: ApplicationField[];
  opened: Application | null;
  canEdit: boolean;
  canEditEvent: boolean;
  /** The event's public page ("/upcoming/ai-at-the-edge"). */
  publicPath: string;
  /** Accepted applicants, for "E-mail accepted" (Bcc). */
  acceptedEmails: string[];
};

/** /admin/applications?event=: one event's applications (pattern: AdminEvents + a detail panel). */
export function EventApplicationsAdmin({
  event,
  page,
  params,
  fields,
  opened,
  canEdit,
  canEditEvent,
  publicPath,
  acceptedEmails,
}: EventApplicationsAdminProps) {
  const t = useTranslations('admin.applications.event');
  const tApps = useTranslations('admin.applications');
  const router = useRouter();
  const { hrefWith, params: urlParams } = useUrlParams();
  const [, startTransition] = React.useTransition();

  const accepted = event.summary?.byStatus.accepted ?? 0;
  const max = event.applicationSettings.maxParticipants;
  const statusLabel = (status: ApplicationStatus) => t(`status.${status}`);

  const changeStatus = (ids: string[], status: ApplicationStatus, done?: () => void) =>
    startTransition(async () => {
      const result = await setApplicationsStatus({ eventId: event.id, ids, status });
      if (!result.ok) {
        toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
        return;
      }
      done?.();
      if (result.data.changed === 0) toast(t('toasts.unchanged'));
      else toast.success(t('toasts.changed', { count: result.data.changed, status: statusLabel(status) }));
    });

  const openHref = (row: { id: string }) => hrefWith({ open: row.id });
  const status = (row: Pick<ApplicationRow, 'status' | 'waitlistPosition'>) => (
    <AdminBadge tone={STATUS_TONE[row.status]}>
      {row.status === 'waitlist' && row.waitlistPosition
        ? t('waitlistPosition', { position: row.waitlistPosition })
        : statusLabel(row.status)}
    </AdminBadge>
  );
  const isNew = (row: ApplicationRow) =>
    !row.readAt && (
      <AdminBadge tone="attention" dot={false}>
        {t('new')}
      </AdminBadge>
    );

  const columns: Column<ApplicationRow>[] = [
    {
      key: 'applicant',
      header: t('columns.applicant'),
      cell: (row) => (
        <span className="flex items-center gap-2">
          <CellTitle href={openHref(row)} title={row.name} meta={row.email} />
          {isNew(row)}
        </span>
      ),
    },
    {
      key: 'reference',
      header: t('columns.reference'),
      cell: (row) => row.reference,
      className: 'tabular-nums',
    },
    {
      key: 'submitted',
      header: t('columns.submitted'),
      cell: (row) => formatDate(row.createdAt, 'en', 'dateTime'),
      className: 'whitespace-nowrap',
    },
    { key: 'status', header: t('columns.status'), cell: status },
  ];

  const filtered = Boolean(params.q || params.status);
  const exportHref = hrefWithParams('/api/export/applications', urlParams.toString(), {
    page: null,
    size: null,
    open: null,
  });
  const mailto = `mailto:?bcc=${acceptedEmails.map(encodeURIComponent).join(',')}`;

  return (
    <AdminPage>
      <AdminPageCrumb label={event.title} />
      <Link
        href="/admin/applications"
        className="-mt-2 inline-flex items-center gap-1.5 self-start text-small font-medium text-ink-2 no-underline hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>
      <AdminPageHeader
        title={event.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={PHASE_TONE[event.apply.phase]}>
              {tApps(`phase.${event.apply.phase}`)}
            </AdminBadge>
            <span>
              {t('summary', {
                total: event.summary?.total ?? 0,
                accepted,
                max: max === null ? 'none' : String(max),
                waitlist: event.summary?.byStatus.waitlist ?? 0,
              })}
            </span>
            <span aria-hidden>·</span>
            <span>{t('admission', { admission: event.applicationSettings.admission })}</span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <a href={publicPath} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                {t('viewOnSite')}
              </a>
            </Button>
            {canEditEvent && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/events/${event.id}` as Route}>{t('editEvent')}</Link>
              </Button>
            )}
            {canEdit && event.applicationSettings.via === 'form' && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/applications/${event.id}/form` as Route}>{t('editForm')}</Link>
              </Button>
            )}
            <Button asChild variant="quiet" size="sm">
              <a href={exportHref} download>
                <Download aria-hidden />
                {t('export')}
              </a>
            </Button>
            {acceptedEmails.length > 0 && (
              <Button asChild variant="quiet" size="sm">
                <a href={mailto} title={t('emailAcceptedHelp')}>
                  <Mail aria-hidden />
                  {t('emailAccepted', { count: acceptedEmails.length })}
                </a>
              </Button>
            )}
          </>
        }
      />
      {max !== null && accepted > max && (
        <p
          role="status"
          className="rounded-md border border-brand/35 bg-brand-tint px-4 py-3 text-small text-brand-dark"
        >
          {t('overLimit', { accepted, max, count: accepted - max })}
        </p>
      )}

      <TablePanel>
        <AdminTabs
          label={t('tabs.label')}
          tabs={([undefined, ...APPLICATION_STATUSES] as const).map((value) => ({
            href: hrefWith({ status: value ?? null, page: null, open: null, sort: null }),
            label: t(`tabs.${value ?? 'all'}`),
            count: page.counts[value ?? 'all'],
            current: params.status === value,
          }))}
        />
        <FilterBar
          search={{ param: 'q', label: t('filters.search'), placeholder: t('filters.searchPlaceholder') }}
          filterParams={['sort']}
        >
          <SelectFilter
            param="sort"
            label={t('filters.sort')}
            anyLabel={params.status === 'waitlist' ? t('filters.waitlist') : t('filters.newest')}
            width="170px"
            options={(['newest', 'oldest', 'name', 'waitlist'] as const)
              .filter((value) => value !== (params.status === 'waitlist' ? 'waitlist' : 'newest'))
              .map((value) => ({ value, label: t(`filters.${value}`) }))}
          />
        </FilterBar>
        <DataTable
          label={t('tabs.label')}
          rows={page.items}
          columns={columns}
          rowKey={(row) => row.id}
          rowLabel={(row) => row.name}
          bulkActions={
            canEdit
              ? (selected, clear) => (
                  <>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => changeStatus(selected, 'accepted', clear)}
                    >
                      {t('bulk.accept')}
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => changeStatus(selected, 'waitlist', clear)}
                    >
                      {t('bulk.waitlist')}
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => changeStatus(selected, 'rejected', clear)}
                    >
                      {t('bulk.reject')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => changeStatus(selected, 'pending', clear)}
                    >
                      {t('bulk.pending')}
                    </Button>
                  </>
                )
              : undefined
          }
          rowActions={(row) => (
            <>
              <DropdownMenuItem asChild>
                <Link href={openHref(row)} scroll={false}>
                  {t('open')}
                </Link>
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  {APPLICATION_STATUSES.filter((value) => value !== row.status).map((value) => (
                    <DropdownMenuItem key={value} onSelect={() => changeStatus([row.id], value)}>
                      {t(`bulk.${MOVE_TO[value]}`)}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </>
          )}
          card={(row) => (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <Link
                  href={openHref(row)}
                  scroll={false}
                  className="font-medium text-ink no-underline hover:underline"
                >
                  {row.name}
                </Link>
                {isNew(row)}
              </span>
              <span className="truncate text-[13px] text-muted-ink">{row.email}</span>
              <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-ink">
                {status(row)}
                {row.reference} · {formatDate(row.createdAt, 'en', 'dayMonth')}
              </span>
            </div>
          )}
          empty={
            filtered ? (
              <EmptyState
                variant="admin"
                title={t('empty.filteredTitle')}
                actions={
                  <Button asChild variant="quiet" size="sm">
                    <Link href={hrefWith({ q: null, status: null, page: null })} scroll={false}>
                      {t('empty.clear')}
                    </Link>
                  </Button>
                }
              >
                {t('empty.filteredText')}
              </EmptyState>
            ) : (
              <EmptyState variant="admin" icon={<Inbox />} title={t('empty.noneTitle')}>
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
            sizes={APPLICATION_PAGE_SIZES}
          />
        )}
      </TablePanel>

      <ApplicationSheet
        eventId={event.id}
        application={opened}
        fields={fields}
        canEdit={canEdit}
        onStatus={(status) => opened && changeStatus([opened.id], status)}
        onClose={() => router.replace(hrefWith({ open: null }), { scroll: false })}
      />
    </AdminPage>
  );
}

/** One application: contact, status and every answer (CVs download from the private bucket). */
function ApplicationSheet({
  eventId,
  application,
  fields,
  canEdit,
  onStatus,
  onClose,
}: {
  eventId: string;
  application: Application | null;
  fields: ApplicationField[];
  canEdit: boolean;
  onStatus: (status: ApplicationStatus) => void;
  onClose: () => void;
}) {
  const t = useTranslations('admin.applications.detail');
  const tEvent = useTranslations('admin.applications.event');

  // Opening it is reading it: no longer "new".
  const unreadId = application && !application.readAt ? application.id : null;
  React.useEffect(() => {
    if (unreadId) void markApplicationRead({ eventId, id: unreadId });
  }, [eventId, unreadId]);

  const answer = (field: ApplicationField) => {
    const value = application?.answers[field.key];
    if (value === undefined || value === '' || value === false)
      return <span className="text-muted-ink">{t('noAnswer')}</span>;
    if (value === true) return t('yes');
    if (typeof value === 'object')
      return (
        <a
          href={`/api/applications/files/${value.fileId}`}
          download
          className="inline-flex items-center gap-1.5 font-medium text-brand-dark"
        >
          <Paperclip className="size-4" aria-hidden />
          {t('download', { name: value.fileName, size: formatBytes(value.size) })}
        </a>
      );
    if (field.type === 'select') {
      const option = field.options?.find((candidate) => candidate.value === value);
      return option ? resolveText(option.label, 'en').text : value;
    }
    return <span className="whitespace-pre-line">{value}</span>;
  };

  // Answers to questions the board has since removed from the form.
  const removed: ApplicationField[] = Object.keys(application?.answers ?? {})
    .filter((key) => !fields.some((field) => field.key === key))
    .map((key) => ({
      key,
      type: 'text',
      label: { mk: key },
      required: false,
      help: { mk: '' },
      placeholder: { mk: '' },
    }));

  return (
    <Sheet open={application !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[520px] max-w-full">
        {application && (
          <>
            <SheetHeader className="gap-1 border-b border-line px-5 pt-5 pr-16 pb-4">
              <SheetTitle className="text-[20px] font-bold">{application.name}</SheetTitle>
              <SheetDescription className="text-small text-muted-ink">
                {t('title', { reference: application.reference })} ·{' '}
                {t('submitted', { date: formatDate(application.createdAt, 'en', 'dateTime') })}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 px-5 py-5">
              <section aria-label={t('status')} className="flex flex-col gap-2.5">
                <span className="text-small font-medium">{canEdit ? t('setStatus') : t('status')}</span>
                {canEdit ? (
                  <div role="group" aria-label={t('setStatus')} className="flex flex-wrap gap-2">
                    {APPLICATION_STATUSES.map((value) => (
                      <Button
                        key={value}
                        size="sm"
                        variant="quiet"
                        // Calmer admin: the current status is dark, red stays for primary actions.
                        className={
                          application.status === value
                            ? 'border-ink bg-ink text-white hover:border-ink'
                            : undefined
                        }
                        aria-pressed={application.status === value}
                        onClick={() => onStatus(value)}
                      >
                        {value === 'waitlist' &&
                        application.status === 'waitlist' &&
                        application.waitlistPosition
                          ? tEvent('waitlistPosition', { position: application.waitlistPosition })
                          : tEvent(`status.${value}`)}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <span>
                    <AdminBadge tone={STATUS_TONE[application.status]}>
                      {tEvent(`status.${application.status}`)}
                    </AdminBadge>
                  </span>
                )}
              </section>
              <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-4 gap-y-3 text-small">
                <dt className="text-muted-ink">{t('email')}</dt>
                <dd>
                  <a href={`mailto:${application.email}`} className="font-medium text-brand-dark">
                    {application.email}
                  </a>
                </dd>
                <dt className="text-muted-ink">{t('language')}</dt>
                <dd>{t(`languages.${application.locale}`)}</dd>
              </dl>
              <section aria-labelledby="application-answers" className="flex flex-col gap-3">
                <h3 id="application-answers" className="text-[16px] font-bold">
                  {t('answers')}
                </h3>
                <dl className="flex flex-col divide-y divide-divider text-small">
                  {fields.map((field) => (
                    <div key={field.key} className="flex flex-col gap-1 py-2.5">
                      <dt className="text-muted-ink">{resolveText(field.label, 'en').text}</dt>
                      <dd>{answer(field)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              {removed.length > 0 && (
                <section aria-labelledby="application-removed" className="flex flex-col gap-2">
                  <h3 id="application-removed" className="text-[16px] font-bold">
                    {t('removed')}
                  </h3>
                  <p className="text-[13px] text-muted-ink">{t('removedHelp')}</p>
                  <dl className="flex flex-col divide-y divide-divider text-small">
                    {removed.map((field) => (
                      <div key={field.key} className="flex flex-col gap-1 py-2.5">
                        <dt className="text-muted-ink">{field.key}</dt>
                        <dd>{answer(field)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              <p className="text-[13px] text-muted-ink">
                {t('consent', { date: formatDate(application.consentAt, 'en', 'dateTime') })}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
