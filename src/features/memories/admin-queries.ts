import 'server-only';

import { listEventOptions } from '@/features/events/server';
import type { Paged } from '@/shared/data/paged';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';
import type { AnyMedia } from '@/shared/types/media';

import { memoriesRepository } from './data';
import { memoryImage } from './data/memory-photos';
import { submitProblems, textFacts } from './domain/memory-fields';
import { placeLabel } from './domain/memory-place';
import type {
  AdminMemoriesQuery,
  AdminMemoryCounts,
  AdminMemoryRow,
  MemoryChange,
  MemoryContent,
  MemoryQueueItem,
  MemoryRecord,
} from './types';

// Admin reads: never cached, callers check the permission (Approvals and Memories, D18).

/** The approval queue, oldest first, with the event's title for the row. */
export async function getMemoryQueue(): Promise<(MemoryQueueItem & { eventTitle: string })[]> {
  const [queue, events] = await Promise.all([
    (await memoriesRepository('session')).queue(),
    listEventOptions(),
  ]);
  return queue.map((item) => ({
    ...item,
    eventTitle: events.find((event) => event.id === item.eventId)?.title ?? item.otherEventName,
  }));
}

export type MemoryReviewView = {
  id: string;
  kind: 'memory' | 'revision';
  title: string;
  /** Sanitized HTML. */
  body: string;
  cover: AnyMedia | null;
  photos: AnyMedia[];
  eventTitle: string;
  /** The admin page of the linked event; null for "Other". */
  eventId: string | null;
  place: string;
  happenedOn: string | null;
  words: number;
  minutes: number;
  authorId: string | null;
  authorApproved: number;
  submittedAt: string;
  changes: MemoryChange[];
  featuredOnHome: boolean;
  /** Same rules as the author's checklist, as lines the reviewer can read. */
  checks: { coverAlt: boolean; realEvent: boolean; missingPhotoAlt: number };
};

/** One waiting Memory (or waiting changes) as the reviewer sees it; null when nothing waits at that id. */
export async function getMemoryReview(id: string): Promise<MemoryReviewView | null> {
  const [review, events] = await Promise.all([
    (await memoriesRepository('session')).review(id),
    listEventOptions(),
  ]);
  if (!review) return null;
  const { content } = review;
  const facts = textFacts(content.body);
  const problems = submitProblems(content);
  const photoAlt = problems.find((problem) => problem.field === 'photoAlt');
  return {
    id: review.record.id,
    kind: review.kind,
    title: content.title,
    body: sanitizeRichText(content.body),
    cover: content.cover ? memoryImage(content.cover) : null,
    photos: content.photos.map((photo) => memoryImage(photo)),
    eventTitle: events.find((event) => event.id === content.eventId)?.title ?? content.otherEventName,
    eventId: content.eventId && events.some((event) => event.id === content.eventId) ? content.eventId : null,
    place: placeLabel(content.city, content.country),
    happenedOn: content.happenedOn,
    words: facts.words,
    minutes: facts.minutes,
    authorId: review.record.authorId,
    authorApproved: review.authorApproved,
    submittedAt: review.submittedAt,
    changes: review.changes,
    featuredOnHome: review.record.featuredOnHome,
    checks: {
      coverAlt: !problems.some((problem) => problem.field === 'coverAlt' || problem.field === 'cover'),
      realEvent: Boolean(content.eventId) && events.some((event) => event.id === content.eventId),
      missingPhotoAlt: photoAlt && photoAlt.field === 'photoAlt' ? photoAlt.count : 0,
    },
  };
}

/** Admin › Memories: every Memory, filtered and paged, with the tab counts. */
export async function getAdminMemories(
  query: AdminMemoriesQuery,
): Promise<Paged<AdminMemoryRow & { eventTitle: string }> & { counts: AdminMemoryCounts }> {
  const [page, events] = await Promise.all([
    (await memoriesRepository('session')).adminList(query),
    listEventOptions(),
  ]);
  return {
    ...page,
    items: page.items.map((row) => ({
      ...row,
      eventTitle: events.find((event) => event.id === row.eventId)?.title ?? row.otherEventName,
    })),
  };
}

/** The edit form's data: the record and the events to choose from. */
export async function getMemoryForAdmin(
  id: string,
): Promise<{ record: MemoryRecord; events: { id: string; title: string }[]; editing: MemoryContent } | null> {
  const [record, events] = await Promise.all([
    (await memoriesRepository('session')).adminGet(id),
    listEventOptions(),
  ]);
  if (!record) return null;
  return {
    record,
    events: events.map((event) => ({ id: event.id, title: event.title })),
    // A waiting revision is what the board edits; otherwise the content itself.
    editing: record.revision?.status === 'pending' ? record.revision.content : record.content,
  };
}
