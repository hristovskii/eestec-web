import { Inbox, Reply, SearchX } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { addNote } from '@/features/notes';
import { FilterBar, SegmentFilter, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { InboxDetail } from '@/shared/admin-ui/inbox-detail';
import {
  MarkAllReadButton,
  MarkReadOnOpen,
  ReadToggle,
  StatusButton,
  StatusSelect,
} from '@/shared/admin-ui/inbox-controls';
import { type InboxRow, InboxSplitView } from '@/shared/admin-ui/inbox-split-view';
import { NotesPanelView } from '@/shared/admin-ui/notes-panel-view';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { formatDate } from '@/shared/i18n/format';
import { initials } from '@/shared/lib/initials';
import { inboxTime } from '@/shared/lib/inbox';
import { INBOX_PAGE_SIZES, type InboxParams } from '@/shared/lib/inbox-params';
import { now } from '@/shared/lib/now';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import { NOTE_LIMITS } from '@/features/notes';

import { getContactInbox } from '../../admin-queries';
import { changeMessageStatus, markAllMessagesRead, setMessageRead } from '../../actions/admin-inbox';
import { CONTACT_STATUSES, type ContactMessage } from '../../types';

type ContactInboxProps = { params: InboxParams; canEdit: boolean };

const preview = (message: string) => message.replace(/\s+/g, ' ').trim();

/** Admin › Inbox › Contact messages (AdminInbox): toolbar, the list and the open message. */
export async function ContactInbox({ params, canEdit }: ContactInboxProps) {
  const [t, data] = await Promise.all([getTranslations('admin.inbox'), getContactInbox(params)]);
  const current = now();
  const statusLabel = (status: string) => t(`status.${status as 'new'}`);
  const filtered = Boolean(params.status || params.subject || params.q);

  const rows: InboxRow[] = data.page.items.map((message) => ({
    id: message.id,
    name: message.name,
    badge: message.subject,
    preview: preview(message.message),
    when: inboxTime(message.createdAt, current),
    unread: message.readAt === null,
  }));

  return (
    <>
      <FilterBar
        search={{ param: 'q', label: t('filters.searchLabel.contact'), placeholder: t('filters.search') }}
        filterParams={['status', 'subject']}
      >
        <SegmentFilter
          param="status"
          label={t('filters.status')}
          options={[
            { value: '', label: `${t('filters.all')} · ${data.counts.all}` },
            ...CONTACT_STATUSES.map((status) => ({
              value: status,
              label: status === 'new' ? `${statusLabel(status)} · ${data.counts.new}` : statusLabel(status),
            })),
          ]}
        />
        <SelectFilter
          param="subject"
          label={t('filters.subject')}
          anyLabel={t('filters.allSubjects')}
          width="170px"
          options={data.subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
        />
        {canEdit && <MarkAllReadButton action={markAllMessagesRead} disabled={data.counts.unread === 0} />}
      </FilterBar>
      <InboxSplitView
        label={t('contact.list')}
        rows={rows}
        openId={data.open?.id ?? null}
        detail={
          data.open && (
            <ContactMessageDetail
              message={data.open}
              notes={data.notes}
              canEdit={canEdit}
              statusOptions={CONTACT_STATUSES.map((value) => ({ value, label: statusLabel(value) }))}
              labels={{
                subject: t('contact.subject'),
                sentTo: t('contact.sentTo'),
                reply: t('detail.reply'),
                markAnswered: t('contact.markAnswered'),
                archive: t('contact.archive'),
              }}
            />
          )
        }
        empty={
          filtered ? (
            <EmptyState
              variant="admin"
              icon={<SearchX />}
              title={t('contact.emptyFiltered')}
              actions={
                <Button asChild variant="quiet">
                  <Link href="/admin/inbox?tab=contact">{t('filters.clear')}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState variant="admin" icon={<Inbox />} title={t('contact.empty')}>
              {t('contact.emptyHelp')}
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

/** The open message: who and when, the status, the text, the reply and the internal notes. */
function ContactMessageDetail({
  message,
  notes,
  canEdit,
  statusOptions,
  labels,
}: {
  message: ContactMessage;
  notes: Awaited<ReturnType<typeof getContactInbox>>['notes'];
  canEdit: boolean;
  statusOptions: { value: string; label: string }[];
  labels: { subject: string; sentTo: string; reply: string; markAnswered: string; archive: string };
}) {
  const unread = message.readAt === null;
  const reply = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
  return (
    <InboxDetail
      name={message.name}
      initials={initials(message.name)}
      email={message.email}
      meta={`${formatDate(message.createdAt, 'en', 'dayDateTime')} · ${labels.subject}: ${message.subject} · ${labels.sentTo} ${message.routedTo} · ${message.reference}`}
      controls={
        canEdit && (
          <>
            <StatusSelect
              key={`${message.id}:${message.status}`}
              id={message.id}
              value={message.status}
              options={statusOptions}
              action={changeMessageStatus}
            />
            <ReadToggle
              key={`${message.id}:${unread}`}
              id={message.id}
              unread={unread}
              action={setMessageRead}
            />
            {message.status !== 'archived' && (
              <StatusButton
                id={message.id}
                status="archived"
                label={labels.archive}
                icon="archive"
                action={changeMessageStatus}
              />
            )}
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
          {canEdit && message.status !== 'answered' && (
            <StatusButton
              id={message.id}
              status="answered"
              label={labels.markAnswered}
              action={changeMessageStatus}
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
          entity={{ type: 'contact_message', id: message.id }}
          action={addNote}
          canAdd={canEdit}
          maxLength={NOTE_LIMITS.body}
        />
      }
    >
      {canEdit && <MarkReadOnOpen id={message.id} unread={unread} action={setMessageRead} />}
      {message.message.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="break-words whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </InboxDetail>
  );
}
