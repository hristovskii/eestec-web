import { countWords } from '@/shared/lib/rich-text';

import type { MemoryListItem, MemoryPost, MemoryRecord, MemorySummary } from '../types';
import { excerptOf, readMinutes } from './memory-fields';

// What the screens read from a record, in one place so the mock and the database build the same
// cards, posts and lists from it.

/** A card on /memories, Home, an event page, a profile. */
export const summaryOf = (record: MemoryRecord): MemorySummary => ({
  id: record.id,
  slug: record.slug ?? record.id,
  title: record.content.title,
  excerpt: excerptOf(record.content.body),
  eventId: record.content.eventId,
  otherEventName: record.content.otherEventName,
  city: record.content.city,
  country: record.content.country,
  cover: record.content.cover,
  authorId: record.authorId,
  authorDeleted: record.authorDeleted,
  publishedAt: record.publishedAt ?? record.updatedAt,
});

/** The post page (the live content, or the author's draft in a preview). */
export function postOf(record: MemoryRecord): MemoryPost {
  const words = countWords(record.content.body);
  return {
    ...summaryOf(record),
    status: record.status,
    body: record.content.body,
    happenedOn: record.content.happenedOn,
    photos: record.content.photos,
    readMinutes: readMinutes(words),
    wordCount: words,
    featuredOnHome: record.featuredOnHome,
    readsCount: record.readsCount,
  };
}

/** One line of My Memories and of Admin › Memories. */
export const listItemOf = (record: MemoryRecord): MemoryListItem => ({
  id: record.id,
  slug: record.slug,
  title: record.content.title,
  status: record.status,
  revision: record.status === 'published' && record.revision ? record.revision.status : null,
  cover: record.content.cover,
  eventId: record.content.eventId,
  otherEventName: record.content.otherEventName,
  rejectionReason: record.status === 'rejected' ? record.rejectionReason : '',
  publishedAt: record.publishedAt,
  submittedAt: record.submittedAt,
  updatedAt: record.updatedAt,
  readsCount: record.readsCount,
});
