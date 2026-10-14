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

import { changeInquiryStatus, markAllInquiriesRead, setInquiryRead } from '../../actions/admin-inbox';
import { getInquiriesInbox } from '../../admin-queries';
import { INQUIRY_STATUSES, type PartnerInquiry } from '../../types';

const preview = (message: string) => message.replace(/\s+/g, ' ').trim();

/** Admin › Inbox › Partner inquiries: toolbar, the list and the open inquiry. */
export async function PartnersInbox({ params, canEdit }: { params: InboxParams; canEdit: boolean }) {
  const [t, data] = await Promise.all([getTranslations('admin.inbox'), getInquiriesInbox(params)]);
  const current = now();
  const statusLabel = (status: string) => t(`status.${status as 'new'}`);
  const interestLabel = (interest: PartnerInquiry['interests'][number]) =>
    t(`partners.interestNames.${interest}`);
  const filtered = Boolean(params.status || params.q);

  const rows: InboxRow[] = data.page.items.map((inquiry) => ({
    id: inquiry.id,
    name: inquiry.company,
    badge: inquiry.interests.map(interestLabel).join(' · '),
    preview: preview(inquiry.message),
    when: inboxTime(inquiry.createdAt, current),
    unread: inquiry.readAt === null,
  }));

  return (
    <>
      <FilterBar
        search={{ param: 'q', label: t('filters.searchLabel.partners'), placeholder: t('filters.search') }}
        filterParams={['status']}
      >
        <SegmentFilter
          param="status"
          label={t('filters.status')}
          options={[
            { value: '', label: `${t('filters.all')} · ${data.counts.all}` },
            ...INQUIRY_STATUSES.map((status) => ({
              value: status,
              label: status === 'new' ? `${statusLabel(status)} · ${data.counts.new}` : statusLabel(status),
            })),
          ]}
        />
        {canEdit && <MarkAllReadButton action={markAllInquiriesRead} disabled={data.counts.unread === 0} />}
      </FilterBar>
      <InboxSplitView
        label={t('partners.list')}
        rows={rows}
        openId={data.open?.id ?? null}
        detail={
          data.open && (
            <InquiryDetail
              inquiry={data.open}
              notes={data.notes}
              canEdit={canEdit}
              statusOptions={INQUIRY_STATUSES.map((value) => ({ value, label: statusLabel(value) }))}
              interests={data.open.interests.map(interestLabel).join(', ')}
              labels={{
                company: t('partners.company'),
                person: t('partners.person'),
                phone: t('partners.phone'),
                interests: t('partners.interests'),
                reference: t('partners.reference'),
                language: t('detail.language'),
                reply: t('detail.reply'),
                replySubject: t('partners.replySubject', { reference: data.open.reference }),
                markInProgress: t('partners.markInProgress'),
                markDone: t('partners.markDone'),
              }}
            />
          )
        }
        empty={
          filtered ? (
            <EmptyState
              variant="admin"
              icon={<SearchX />}
              title={t('partners.emptyFiltered')}
              actions={
                <Button asChild variant="quiet">
                  <Link href="/admin/inbox?tab=partners">{t('filters.clear')}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState variant="admin" icon={<Inbox />} title={t('partners.empty')}>
              {t('partners.emptyHelp')}
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

function InquiryDetail({
  inquiry,
  notes,
  canEdit,
  statusOptions,
  interests,
  labels,
}: {
  inquiry: PartnerInquiry;
  notes: Awaited<ReturnType<typeof getInquiriesInbox>>['notes'];
  canEdit: boolean;
  statusOptions: { value: string; label: string }[];
  interests: string;
  labels: Record<
    | 'company'
    | 'person'
    | 'phone'
    | 'interests'
    | 'reference'
    | 'language'
    | 'reply'
    | 'replySubject'
    | 'markInProgress'
    | 'markDone',
    string
  >;
}) {
  const unread = inquiry.readAt === null;
  const reply = `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${labels.replySubject}`)}`;
  return (
    <InboxDetail
      name={inquiry.contactPerson}
      initials={initials(inquiry.contactPerson)}
      email={inquiry.email}
      meta={`${formatDate(inquiry.createdAt, 'en', 'dayDateTime')} · ${inquiry.company} · ${inquiry.reference}`}
      controls={
        canEdit && (
          <>
            <StatusSelect
              key={`${inquiry.id}:${inquiry.status}`}
              id={inquiry.id}
              value={inquiry.status}
              options={statusOptions}
              action={changeInquiryStatus}
            />
            <ReadToggle
              key={`${inquiry.id}:${unread}`}
              id={inquiry.id}
              unread={unread}
              action={setInquiryRead}
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
          {canEdit && inquiry.status === 'new' && (
            <StatusButton
              id={inquiry.id}
              status="in_progress"
              label={labels.markInProgress}
              action={changeInquiryStatus}
            />
          )}
          {canEdit && inquiry.status !== 'done' && (
            <StatusButton
              id={inquiry.id}
              status="done"
              label={labels.markDone}
              action={changeInquiryStatus}
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
          entity={{ type: 'partner_inquiry', id: inquiry.id }}
          action={addNote}
          canAdd={canEdit}
          maxLength={NOTE_LIMITS.body}
        />
      }
    >
      {canEdit && <MarkReadOnOpen id={inquiry.id} unread={unread} action={setInquiryRead} />}
      <InboxFacts
        items={[
          { label: labels.company, value: inquiry.company },
          { label: labels.interests, value: interests },
          { label: labels.phone, value: inquiry.phone || '–' },
          { label: labels.language, value: inquiry.locale.toUpperCase() },
        ]}
      />
      {inquiry.message.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="break-words whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </InboxDetail>
  );
}
