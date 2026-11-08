import { SearchX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { MemoryApprovalsView, MemoryReview } from '@/features/memories/admin';
import { getMemoryQueue, getMemoryReview } from '@/features/memories/server';
import { getAuthorCards } from '@/features/members/server';
import type { ApprovalRow } from '@/shared/admin-ui/approval-split-view';
import { waitingTime } from '@/shared/lib/approvals';
import type { ApprovalsParams } from '@/shared/lib/approvals-params';
import { now } from '@/shared/lib/now';
import { EmptyState } from '@/shared/ui/empty-state';

/**
 * Admin › Approvals › Memories: the queue (waiting Memories and waiting changes to published ones,
 * oldest first) and the open one. The route brings the authors from `members`, because `memories`
 * does not know them.
 */
export async function MemoryApprovals({ params, canEdit }: { params: ApprovalsParams; canEdit: boolean }) {
  const [t, queue] = await Promise.all([getTranslations('admin.approvals.memories'), getMemoryQueue()]);
  const items = params.sort === 'newest' ? [...queue].reverse() : queue;
  const authors = await getAuthorCards(
    'member',
    'en',
    items.flatMap((item) => (item.authorId ? [item.authorId] : [])),
  );
  const current = now();
  const author = (authorId: string | null) => (authorId ? (authors[authorId] ?? null) : null);

  const rows: ApprovalRow[] = items.map((item) => ({
    id: item.id,
    kind: item.kind === 'revision' ? t('kindRevision') : t('kindMemory'),
    title: item.title,
    extra: t('rowExtra', {
      author: author(item.authorId)?.name ?? t('former'),
      event: item.eventTitle || t('noEvent'),
      photos: item.photoCount > 0 ? t('photos', { count: item.photoCount }) : t('noPhotos'),
    }),
    when: `${waitingTime(item.submittedAt, current)} ago`,
  }));
  const index = items.findIndex((item) => item.id === params.open);
  const open = index >= 0 ? items[index] : undefined;
  const review = open ? await getMemoryReview(open.id) : null;
  const person = open ? author(open.authorId) : null;

  return (
    <MemoryApprovalsView
      rows={rows}
      openId={review ? (open?.id ?? null) : null}
      waitingLabel={t('waiting', { count: items.length })}
      canDecide={canEdit}
      empty={
        <EmptyState
          variant="admin"
          icon={<SearchX className="size-6" aria-hidden />}
          title={t('empty.title')}
        >
          {t('empty.text')}
        </EmptyState>
      }
      detail={
        open &&
        review && (
          <MemoryReview
            review={review}
            author={person ? { name: person.name, since: person.since } : null}
            position={{ index: index + 1, total: items.length }}
            previousId={items[index - 1]?.id ?? null}
            nextId={items[index + 1]?.id ?? null}
            waiting={waitingTime(open.submittedAt, current)}
            canDecide={canEdit}
          />
        )
      }
    />
  );
}
