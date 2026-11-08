import { Inbox, Reply, SearchX, Star } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { type Actor } from '@/features/auth';
import { NOTE_LIMITS } from '@/features/notes';
import { addNote } from '@/features/notes';
import { Notice } from '@/shared/ui/notice';
import { FilterBar, SegmentFilter, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { InboxDetail } from '@/shared/admin-ui/inbox-detail';
import { StatusButton, StatusSelect } from '@/shared/admin-ui/inbox-controls';
import { type InboxRow, InboxSplitView } from '@/shared/admin-ui/inbox-split-view';
import { NotesPanelView } from '@/shared/admin-ui/notes-panel-view';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { formatDate } from '@/shared/i18n/format';
import { cn } from '@/shared/lib/cn';
import { inboxTime } from '@/shared/lib/inbox';
import { initials } from '@/shared/lib/initials';
import { now } from '@/shared/lib/now';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';

import { getFeedbackList, getIdeasList, listIdeaOwners } from '../../admin-queries';
import { changeFeedbackStatus, changeIdeaStatus } from '../../actions/admin-ideas';
import { IDEAS_PAGE_SIZES, type AdminIdeasParams } from '../../schemas/admin-ideas-params.schema';
import { type Feedback, type Idea, SUBMISSION_STATUSES, type SubmissionFile } from '../../types';
import { AcceptIdeaButton, OwnerSelect } from './idea-controls';

type Translate = Awaited<ReturnType<typeof getTranslations<'admin.ideas'>>>;

const KB = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;

/** "Bojan Ilievski", the address when there is no name, or "Anonymous". */
function senderOf(row: Idea | Feedback, t: Translate) {
  if (row.isAnonymous) return t('sender.anonymous');
  return row.name ?? row.email ?? t('sender.noName');
}

function paragraphs(text: string) {
  return text.split(/\n{2,}/).map((paragraph, index) => (
    <p key={index} className="break-words whitespace-pre-line">
      {paragraph}
    </p>
  ));
}

/** A file that came with a submission: its name, its size and the download (board only). */
function FileCard({ file, label, download }: { file: SubmissionFile; label: string; download: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface-2 px-3.5 py-3">
      <span className="flex h-8 min-w-10 items-center justify-center rounded-sm bg-white px-1.5 text-[11px] font-bold text-ink-2 uppercase">
        {file.mime === 'application/pdf' ? 'PDF' : file.mime.replace('image/', '')}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-small font-medium">{file.name}</span>
        <span className="text-[13px] text-muted-ink">
          {label} · {KB(file.size)}
        </span>
      </span>
      <Button asChild variant="quiet" size="sm">
        <a href={`/api/dev-submissions/${file.id}`} download={file.name}>
          {download}
        </a>
      </Button>
    </div>
  );
}

function StarsRead({ rating, label }: { rating: number | null; label: string }) {
  if (rating === null) return <span className="text-small text-muted-ink">{label}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(
              'size-5',
              n <= rating ? 'fill-brand text-brand' : 'fill-line-strong text-line-strong',
            )}
          />
        ))}
      </span>
      <span className="text-small font-medium">{label}</span>
    </span>
  );
}

// ─── Ideas ───

/** Admin › Ideas & Feedback › Ideas: toolbar, the list and the open idea. */
export async function IdeasList({ params, canEdit }: { params: AdminIdeasParams; canEdit: boolean }) {
  const [t, data, owners] = await Promise.all([
    getTranslations('admin.ideas'),
    getIdeasList(params),
    canEdit ? listIdeaOwners() : Promise.resolve([]),
  ]);
  const current = now();
  const typeName = (id: string) => {
    const type = data.types.find((candidate) => candidate.id === id);
    return type ? (type.name.en ?? type.name.mk) : '—';
  };
  const statusLabel = (status: string) => t(`status.${status as 'new'}`);
  const filtered = Boolean(params.status || params.type || params.q);

  const rows: InboxRow[] = data.page.items.map((idea) => ({
    id: idea.id,
    name: idea.title,
    badge: typeName(idea.typeId),
    preview: idea.status === 'new' ? senderOf(idea, t) : `${senderOf(idea, t)} · ${statusLabel(idea.status)}`,
    when: inboxTime(idea.createdAt, current),
    unread: idea.status === 'new',
  }));

  return (
    <>
      <FilterBar
        search={{ param: 'q', label: t('filters.searchIdeas'), placeholder: t('filters.search') }}
        filterParams={['status', 'type']}
      >
        <SegmentFilter
          param="status"
          label={t('filters.status')}
          options={[
            { value: '', label: `${t('filters.all')} · ${data.counts.all}` },
            ...SUBMISSION_STATUSES.map((status) => ({
              value: status,
              label: status === 'new' ? `${statusLabel(status)} · ${data.counts.new}` : statusLabel(status),
            })),
          ]}
        />
        <SelectFilter
          param="type"
          label={t('filters.type')}
          anyLabel={t('filters.allTypes')}
          width="190px"
          options={data.types.map((type) => ({ value: type.id, label: type.name.en ?? type.name.mk }))}
        />
      </FilterBar>
      <InboxSplitView
        label={t('ideas.list')}
        rows={rows}
        openId={data.open?.id ?? null}
        detail={
          data.open && (
            <IdeaDetail
              idea={data.open}
              typeName={typeName(data.open.typeId)}
              notes={data.notes}
              canEdit={canEdit}
              owners={owners}
              t={t}
            />
          )
        }
        empty={
          filtered ? (
            <EmptyState
              variant="admin"
              icon={<SearchX />}
              title={t('ideas.emptyFiltered')}
              actions={
                <Button asChild variant="quiet">
                  <Link href="/admin/ideas?tab=ideas">{t('filters.clear')}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState variant="admin" icon={<Inbox />} title={t('ideas.empty')}>
              {t('ideas.emptyHelp')}
            </EmptyState>
          )
        }
        footer={
          data.page.total > 0 && (
            <TablePagination
              page={data.page.page}
              pageSize={data.page.pageSize}
              total={data.page.total}
              sizes={IDEAS_PAGE_SIZES}
            />
          )
        }
      />
    </>
  );
}

function IdeaDetail({
  idea,
  typeName,
  notes,
  canEdit,
  owners,
  t,
}: {
  idea: Idea;
  typeName: string;
  notes: Awaited<ReturnType<typeof getIdeasList>>['notes'];
  canEdit: boolean;
  owners: { id: string; name: string }[];
  t: Translate;
}) {
  const statusOptions = SUBMISSION_STATUSES.map((value) => ({ value, label: t(`status.${value}`) }));
  const who = senderOf(idea, t);
  const kind = idea.isAnonymous
    ? ''
    : idea.userId
      ? ` · ${t('sender.member')}`
      : ` · ${t('sender.notMember')}`;
  return (
    <InboxDetail
      name={who}
      initials={initials(who)}
      email={idea.email}
      meta={`${formatDate(idea.createdAt, 'en', 'dayDateTime')} · ${typeName}${kind}`}
      controls={
        canEdit && (
          <>
            <StatusSelect
              key={`${idea.id}:${idea.status}`}
              id={idea.id}
              value={idea.status}
              options={statusOptions}
              action={changeIdeaStatus}
            />
            <OwnerSelect
              key={`${idea.id}:${idea.ownerId}`}
              kind="idea"
              id={idea.id}
              ownerId={idea.ownerId}
              owners={owners}
            />
          </>
        )
      }
      actions={
        <>
          {idea.email && (
            <Button asChild>
              <a href={`mailto:${idea.email}?subject=${encodeURIComponent(`Re: ${idea.title}`)}`}>
                <Reply aria-hidden />
                {t('detail.reply')}
              </a>
            </Button>
          )}
          {canEdit && <AcceptIdeaButton id={idea.id} eventDraftId={idea.eventDraftId} />}
          {canEdit && idea.status !== 'archived' && (
            <StatusButton
              id={idea.id}
              status="archived"
              label={t('detail.archive')}
              icon="archive"
              action={changeIdeaStatus}
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
          entity={{ type: 'idea', id: idea.id }}
          action={addNote}
          canAdd={canEdit}
          maxLength={NOTE_LIMITS.body}
        />
      }
    >
      <h3 className="text-[17px] font-bold">{idea.title}</h3>
      {paragraphs(idea.description)}
      {idea.attachment && (
        <FileCard file={idea.attachment} label={t('ideas.attachment')} download={t('ideas.download')} />
      )}
      {idea.isAnonymous && <p className="text-small text-muted-ink">{t('detail.anonymousNote')}</p>}
    </InboxDetail>
  );
}

// ─── Event feedback ───

/** Admin › Ideas & Feedback › Event feedback (an event manager sees their own events' feedback, read-only). */
export async function FeedbackList({
  params,
  actor,
  canEdit,
}: {
  params: AdminIdeasParams;
  actor: Actor;
  canEdit: boolean;
}) {
  const [t, data, owners] = await Promise.all([
    getTranslations('admin.ideas'),
    getFeedbackList(actor, params),
    canEdit ? listIdeaOwners() : Promise.resolve([]),
  ]);
  const current = now();
  const statusLabel = (status: string) => t(`status.${status as 'new'}`);
  const filtered = Boolean(params.status || params.event || params.q);

  const rows: InboxRow[] = data.page.items.map((row) => ({
    id: row.id,
    name: row.eventTitle,
    ...(row.rating !== null ? { badge: `★ ${row.rating}` } : {}),
    preview: [
      senderOf(row, t),
      row.memoryId ? t('feedback.memoryBadge') : null,
      row.status === 'new' ? null : statusLabel(row.status),
    ]
      .filter(Boolean)
      .join(' · '),
    when: inboxTime(row.createdAt, current),
    unread: row.status === 'new',
  }));

  return (
    <>
      <FilterBar
        search={{ param: 'q', label: t('filters.searchFeedback'), placeholder: t('filters.search') }}
        filterParams={['status', 'event']}
      >
        <SegmentFilter
          param="status"
          label={t('filters.status')}
          options={[
            { value: '', label: `${t('filters.all')} · ${data.counts.all}` },
            ...SUBMISSION_STATUSES.map((status) => ({
              value: status,
              label: status === 'new' ? `${statusLabel(status)} · ${data.counts.new}` : statusLabel(status),
            })),
          ]}
        />
        <SelectFilter
          param="event"
          label={t('filters.event')}
          anyLabel={t('filters.allEvents')}
          width="220px"
          options={data.events.map((event) => ({ value: event.key, label: event.title }))}
        />
      </FilterBar>
      <InboxSplitView
        label={t('feedback.list')}
        rows={rows}
        openId={data.open?.id ?? null}
        detail={
          data.open && (
            <FeedbackDetail feedback={data.open} notes={data.notes} canEdit={canEdit} owners={owners} t={t} />
          )
        }
        empty={
          filtered ? (
            <EmptyState
              variant="admin"
              icon={<SearchX />}
              title={t('feedback.emptyFiltered')}
              actions={
                <Button asChild variant="quiet">
                  <Link href="/admin/ideas?tab=feedback">{t('filters.clear')}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState variant="admin" icon={<Inbox />} title={t('feedback.empty')}>
              {t('feedback.emptyHelp')}
            </EmptyState>
          )
        }
        footer={
          data.page.total > 0 && (
            <TablePagination
              page={data.page.page}
              pageSize={data.page.pageSize}
              total={data.page.total}
              sizes={IDEAS_PAGE_SIZES}
            />
          )
        }
      />
    </>
  );
}

function FeedbackDetail({
  feedback,
  notes,
  canEdit,
  owners,
  t,
}: {
  feedback: Feedback;
  notes: Awaited<ReturnType<typeof getFeedbackList>>['notes'];
  canEdit: boolean;
  owners: { id: string; name: string }[];
  t: Translate;
}) {
  const statusOptions = SUBMISSION_STATUSES.map((value) => ({ value, label: t(`status.${value}`) }));
  const who = senderOf(feedback, t);
  const kind = feedback.isAnonymous
    ? ''
    : feedback.userId
      ? ` · ${t('sender.member')}`
      : ` · ${t('sender.notMember')}`;
  return (
    <InboxDetail
      name={who}
      initials={initials(who)}
      email={feedback.email}
      meta={`${formatDate(feedback.createdAt, 'en', 'dayDateTime')}${kind}`}
      controls={
        canEdit && (
          <>
            <StatusSelect
              key={`${feedback.id}:${feedback.status}`}
              id={feedback.id}
              value={feedback.status}
              options={statusOptions}
              action={changeFeedbackStatus}
            />
            <OwnerSelect
              key={`${feedback.id}:${feedback.ownerId}`}
              kind="feedback"
              id={feedback.id}
              ownerId={feedback.ownerId}
              owners={owners}
            />
          </>
        )
      }
      actions={
        <>
          {canEdit && feedback.email && (
            <Button asChild>
              <a
                href={`mailto:${feedback.email}?subject=${encodeURIComponent(`Re: ${feedback.eventTitle}`)}`}
              >
                <Reply aria-hidden />
                {t('detail.reply')}
              </a>
            </Button>
          )}
          {canEdit && feedback.status !== 'archived' && (
            <StatusButton
              id={feedback.id}
              status="archived"
              label={t('detail.archive')}
              icon="archive"
              action={changeFeedbackStatus}
            />
          )}
        </>
      }
      notes={
        canEdit && (
          <NotesPanelView
            notes={notes.map((note) => ({
              id: note.id,
              authorName: note.authorName,
              initials: note.authorInitials,
              when: formatDate(note.createdAt, 'en', 'shortDateTime'),
              body: note.body,
            }))}
            entity={{ type: 'feedback', id: feedback.id }}
            action={addNote}
            canAdd
            maxLength={NOTE_LIMITS.body}
          />
        )
      }
    >
      <div className="flex flex-col gap-1.5">
        <StarsRead
          rating={feedback.rating}
          label={
            feedback.rating === null ? t('feedback.unrated') : t('feedback.rated', { count: feedback.rating })
          }
        />
        <h3 className="text-[17px] font-bold">{feedback.eventTitle}</h3>
      </div>
      {feedback.memoryId && canEdit && (
        <Notice
          actions={
            <Button asChild variant="quiet" size="sm">
              <Link href="/admin/approvals?type=memories">{t('feedback.openApprovals')}</Link>
            </Button>
          }
        >
          {t('feedback.alsoMemory')}
        </Notice>
      )}
      {paragraphs(feedback.text)}
      {feedback.photos.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-small font-medium">{t('feedback.photos')}</h4>
          {feedback.photos.map((photo, index) => (
            <FileCard
              key={photo.id}
              file={photo}
              label={t('feedback.photoOf', { n: index + 1 })}
              download={t('feedback.download', { n: index + 1 })}
            />
          ))}
        </div>
      )}
    </InboxDetail>
  );
}
