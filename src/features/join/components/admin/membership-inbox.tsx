import { Inbox, Reply, SearchX } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { addNote, NOTE_LIMITS } from '@/features/notes';
import { FilterBar, SegmentFilter } from '@/shared/admin-ui/filter-bar';
import {
  MarkAllReadButton,
  MarkReadOnOpen,
  ReadToggle,
  StatusButton,
  StatusSelect,
} from '@/shared/admin-ui/inbox-controls';
import { InboxDetail, InboxFacts } from '@/shared/admin-ui/inbox-detail';
import { type InboxRow, InboxSplitView } from '@/shared/admin-ui/inbox-split-view';
import { NotesPanelView } from '@/shared/admin-ui/notes-panel-view';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { formatDate } from '@/shared/i18n/format';
import { inboxTime } from '@/shared/lib/inbox';
import { INBOX_PAGE_SIZES, type InboxParams } from '@/shared/lib/inbox-params';
import { initials } from '@/shared/lib/initials';
import { now } from '@/shared/lib/now';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';

import {
  changeApplicationStatus,
  markAllApplicationsRead,
  setApplicationRead,
} from '../../actions/admin-membership';
import { getApplicationsInbox } from '../../admin-queries';
import { MEMBERSHIP_STATUSES, type MembershipApplication } from '../../types';

/** Admin › Inbox › Membership applications: toolbar, the list and the open application. */
export async function MembershipInbox({ params, canEdit }: { params: InboxParams; canEdit: boolean }) {
  const [t, tYears, data] = await Promise.all([
    getTranslations('admin.inbox'),
    getTranslations('join.form.years'),
    getApplicationsInbox(params),
  ]);
  const current = now();
  const statusLabel = (status: string) => t(`status.${status as 'new'}`);
  const yearLabel = (year: string) =>
    year in { '1': 1, '2': 1, '3': 1, '4': 1, master: 1, phd: 1 } ? tYears(year as '1') : year;
  const filtered = Boolean(params.status || params.q);

  const rows: InboxRow[] = data.page.items.map((application) => ({
    id: application.id,
    name: application.name,
    badge: application.faculty,
    preview: `${application.studyProgram} · ${yearLabel(application.yearOfStudy)}`,
    when: inboxTime(application.createdAt, current),
    unread: application.readAt === null,
  }));

  return (
    <>
      <FilterBar
        search={{ param: 'q', label: t('filters.searchLabel.membership'), placeholder: t('filters.search') }}
        filterParams={['status']}
      >
        <SegmentFilter
          param="status"
          label={t('filters.status')}
          options={[
            { value: '', label: `${t('filters.all')} · ${data.counts.all}` },
            ...MEMBERSHIP_STATUSES.map((status) => ({
              value: status,
              label: status === 'new' ? `${statusLabel(status)} · ${data.counts.new}` : statusLabel(status),
            })),
          ]}
        />
        {canEdit && (
          <MarkAllReadButton action={markAllApplicationsRead} disabled={data.counts.unread === 0} />
        )}
      </FilterBar>
      <InboxSplitView
        label={t('membership.list')}
        rows={rows}
        openId={data.open?.id ?? null}
        detail={
          data.open && (
            <ApplicationDetail
              application={data.open}
              notes={data.notes}
              canEdit={canEdit}
              statusOptions={MEMBERSHIP_STATUSES.map((value) => ({ value, label: statusLabel(value) }))}
              year={yearLabel(data.open.yearOfStudy)}
              labels={{
                faculty: t('membership.faculty'),
                program: t('membership.program'),
                year: t('membership.year'),
                phone: t('membership.phone'),
                interests: t('membership.interests'),
                heardFrom: t('membership.heardFrom'),
                none: t('membership.none'),
                language: t('detail.language'),
                reply: t('detail.reply'),
                replySubject: t('membership.replySubject'),
                markContacted: t('membership.markContacted'),
              }}
            />
          )
        }
        empty={
          filtered ? (
            <EmptyState
              variant="admin"
              icon={<SearchX />}
              title={t('membership.emptyFiltered')}
              actions={
                <Button asChild variant="quiet">
                  <Link href="/admin/inbox?tab=membership">{t('filters.clear')}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState variant="admin" icon={<Inbox />} title={t('membership.empty')}>
              {t('membership.emptyHelp')}
            </EmptyState>
          )
        }
        footer={
          data.page.total > 0 && (
            <TablePagination
              page={data.page.page}
              pageSize={data.page.pageSize}
              total={data.page.total}
              sizes={INBOX_PAGE_SIZES}
            />
          )
        }
      />
    </>
  );
}

function ApplicationDetail({
  application,
  notes,
  canEdit,
  statusOptions,
  year,
  labels,
}: {
  application: MembershipApplication;
  notes: Awaited<ReturnType<typeof getApplicationsInbox>>['notes'];
  canEdit: boolean;
  statusOptions: { value: string; label: string }[];
  year: string;
  labels: Record<
    | 'faculty'
    | 'program'
    | 'year'
    | 'phone'
    | 'interests'
    | 'heardFrom'
    | 'none'
    | 'language'
    | 'reply'
    | 'replySubject'
    | 'markContacted',
    string
  >;
}) {
  const unread = application.readAt === null;
  const reply = `mailto:${application.email}?subject=${encodeURIComponent(labels.replySubject)}`;
  return (
    <InboxDetail
      name={application.name}
      initials={initials(application.name)}
      email={application.email}
      meta={formatDate(application.createdAt, 'en', 'dayDateTime')}
      controls={
        canEdit && (
          <>
            <StatusSelect
              key={`${application.id}:${application.status}`}
              id={application.id}
              value={application.status}
              options={statusOptions}
              action={changeApplicationStatus}
            />
            <ReadToggle
              key={`${application.id}:${unread}`}
              id={application.id}
              unread={unread}
              action={setApplicationRead}
            />
          </>
        )
      }
      actions={
        <>
          <Button asChild>
            <a href={reply}>
              <Reply aria-hidden />
              {labels.reply}
            </a>
          </Button>
          {canEdit && application.status === 'new' && (
            <StatusButton
              id={application.id}
              status="contacted"
              label={labels.markContacted}
              action={changeApplicationStatus}
            />
          )}
        </>
      }
      notes={
        <NotesPanelView
          notes={notes.map((note) => ({
            id: note.id,
            authorName: note.authorName,
            initials: note.authorInitials,
            when: formatDate(note.createdAt, 'en', 'shortDateTime'),
            body: note.body,
          }))}
          entity={{ type: 'membership_application', id: application.id }}
          action={addNote}
          canAdd={canEdit}
          maxLength={NOTE_LIMITS.body}
        />
      }
    >
      {canEdit && <MarkReadOnOpen id={application.id} unread={unread} action={setApplicationRead} />}
      <InboxFacts
        items={[
          { label: labels.faculty, value: application.faculty },
          { label: labels.program, value: application.studyProgram },
          { label: labels.year, value: year },
          { label: labels.phone, value: application.phone || '–' },
          {
            label: labels.interests,
            value: application.interests.length > 0 ? application.interests.join(', ') : labels.none,
          },
          { label: labels.heardFrom, value: application.heardFrom || '–' },
          { label: labels.language, value: application.locale.toUpperCase() },
        ]}
      />
    </InboxDetail>
  );
}
