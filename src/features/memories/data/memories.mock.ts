/* eslint-disable @typescript-eslint/require-await -- the mock answers at once; the real repository awaits the database */
import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { paginate } from '@/shared/data/paged';
import { countWords } from '@/shared/lib/rich-text';

import { changesBetween } from '../domain/memory-changes';
import { excerptOf, readMinutes } from '../domain/memory-fields';
import { placeLabel, samePlace } from '../domain/memory-place';
import { memorySlug } from '../domain/memory-slug';
import type {
  AdminMemoryCounts,
  AdminMemoryRow,
  MemoryContent,
  MemoryFacets,
  MemoryListItem,
  MemoryPost,
  MemoryQueueItem,
  MemoryRecord,
  MemoryStatus,
  MemorySummary,
  OwnMemory,
} from '../types';
import { MEMORIES_PAGE_SIZE, MEMORY_STATUSES } from '../types';
import { memoriesFixture } from './fixtures/memories';
import type { MemoriesRepository } from './memories.repository';
import { deleteMockMemoryPhoto } from './memory-photos';

const tables = () =>
  mockTable<{ memories: MemoryRecord[] }>('memories', () => ({ memories: memoriesFixture }));

const plain = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
const newId = () => `mem-${crypto.randomUUID().slice(0, 8)}`;
const clone = <T>(value: T): T => structuredClone(value);

const fileIdsOf = (content: MemoryContent): string[] =>
  [content.cover?.fileId, ...content.photos.map((photo) => photo.fileId)].filter((id): id is string => !!id);

const allFileIds = (record: MemoryRecord): string[] => [
  ...fileIdsOf(record.content),
  ...(record.revision ? fileIdsOf(record.revision.content) : []),
];

/** Deletes the files of a Memory that is gone, unless another Memory still uses them. */
function dropFiles(record: MemoryRecord, others: MemoryRecord[]) {
  const used = new Set(others.flatMap(allFileIds));
  for (const id of allFileIds(record)) if (!used.has(id)) deleteMockMemoryPhoto(id);
}

/** Deletes files that `before` used and `after` no longer does. */
function dropUnused(before: string[], after: string[]) {
  const keep = new Set(after);
  for (const id of before) if (!keep.has(id)) deleteMockMemoryPhoto(id);
}

const yearOf = (record: MemoryRecord) =>
  Number((record.content.happenedOn ?? record.publishedAt ?? record.createdAt).slice(0, 4));

const summary = (record: MemoryRecord): MemorySummary => ({
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

function post(record: MemoryRecord): MemoryPost {
  const words = countWords(record.content.body);
  return {
    ...summary(record),
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

const listItem = (record: MemoryRecord): MemoryListItem => ({
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

const byNewest = (a: MemoryRecord, b: MemoryRecord) =>
  Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt);

const isWaiting = (record: MemoryRecord) =>
  record.status === 'pending' || (record.status === 'published' && record.revision?.status === 'pending');

export function createMockMemoriesRepository(): MemoriesRepository {
  const all = () => tables().memories;
  const published = () => all().filter((record) => record.status === 'published');
  const find = (id: string) => all().find((record) => record.id === id) ?? null;
  const takenSlug = (slug: string) => all().some((record) => record.slug === slug);
  const own = (userId: string, ref: { slug: string } | { id: string }) =>
    all().find(
      (record) =>
        record.authorId === userId && ('id' in ref ? record.id === ref.id : record.slug === ref.slug),
    ) ?? null;

  const ownView = (record: MemoryRecord): OwnMemory => ({
    record: clone(record),
    editing: clone(record.revision ? record.revision.content : record.content),
    mode: record.status === 'published' ? 'live' : 'draft',
  });

  const adminRow = (record: MemoryRecord): AdminMemoryRow => ({
    ...listItem(record),
    authorId: record.authorId,
    authorDeleted: record.authorDeleted,
    featuredOnHome: record.featuredOnHome,
    source: record.source,
  });

  const queueItem = (record: MemoryRecord): MemoryQueueItem => {
    const revision = record.status === 'published' ? record.revision : null;
    const content = revision ? revision.content : record.content;
    return {
      id: record.id,
      kind: revision ? 'revision' : 'memory',
      title: content.title,
      authorId: record.authorId,
      eventId: content.eventId,
      otherEventName: content.otherEventName,
      photoCount: content.photos.length,
      submittedAt: revision ? revision.submittedAt : (record.submittedAt ?? record.updatedAt),
    };
  };

  return {
    async list(query) {
      const needle = query.q.trim().toLowerCase();
      const matches = published().filter(
        (record) =>
          (!query.eventId || record.content.eventId === query.eventId) &&
          (query.year === null || yearOf(record) === query.year) &&
          (!query.place || samePlace(placeLabel(record.content.city, record.content.country), query.place)) &&
          (!query.authorId || record.authorId === query.authorId) &&
          (!needle ||
            record.content.title.toLowerCase().includes(needle) ||
            plain(record.content.body).includes(needle) ||
            placeLabel(record.content.city, record.content.country).toLowerCase().includes(needle) ||
            record.content.otherEventName.toLowerCase().includes(needle)),
      );
      matches.sort(byNewest);
      if (query.sort === 'oldest') matches.reverse();
      return paginate(matches.map(summary), query.page, MEMORIES_PAGE_SIZE);
    },

    async facets() {
      const rows = published();
      const events = new Map<string, number>();
      const authors = new Map<string, number>();
      const places = new Map<string, string>();
      for (const record of rows) {
        if (record.content.eventId)
          events.set(record.content.eventId, (events.get(record.content.eventId) ?? 0) + 1);
        if (record.authorId) authors.set(record.authorId, (authors.get(record.authorId) ?? 0) + 1);
        const place = placeLabel(record.content.city, record.content.country);
        if (place && !places.has(place.toLowerCase())) places.set(place.toLowerCase(), place);
      }
      const named = new Set(
        rows
          .filter((record) => !record.content.eventId && record.content.otherEventName)
          .map((record) => record.content.otherEventName.toLowerCase()),
      );
      const cities = new Set(rows.map((record) => record.content.city.trim().toLowerCase()).filter(Boolean));
      const facets: MemoryFacets = {
        events: [...events].map(([eventId, count]) => ({ eventId, count })),
        years: [...new Set(rows.map(yearOf))].sort((a, b) => b - a),
        places: [...places.values()].sort((a, b) => a.localeCompare(b)),
        authors: [...authors].map(([authorId, count]) => ({ authorId, count })),
        totals: { stories: rows.length, events: events.size + named.size, cities: cities.size },
      };
      return facets;
    },

    async findPost(slug) {
      const record = published().find((candidate) => candidate.slug === slug);
      return record ? post(record) : null;
    },

    async listByEvent(eventId, { limit, excludeId }) {
      return published()
        .filter((record) => record.content.eventId === eventId && record.id !== excludeId)
        .sort(byNewest)
        .slice(0, limit)
        .map(summary);
    },
    async countByEvent(eventId) {
      return published().filter((record) => record.content.eventId === eventId).length;
    },
    async listByAuthor(authorId, { limit }) {
      return published()
        .filter((record) => record.authorId === authorId)
        .sort(byNewest)
        .slice(0, limit)
        .map(summary);
    },
    async countByAuthor(authorId) {
      return published().filter((record) => record.authorId === authorId).length;
    },
    async latest(limit) {
      const rows = published().sort(byNewest);
      return [
        ...rows.filter((record) => record.featuredOnHome),
        ...rows.filter((record) => !record.featuredOnHome),
      ]
        .slice(0, limit)
        .map(summary);
    },
    async listSlugs() {
      return published().flatMap((record) => (record.slug ? [record.slug] : []));
    },
    async countRead(slug) {
      const record = published().find((candidate) => candidate.slug === slug);
      if (record) record.readsCount += 1;
    },

    async listMine(userId) {
      return all()
        .filter((record) => record.authorId === userId)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map(listItem);
    },
    async countPublishedBy(userId) {
      return published().filter((record) => record.authorId === userId).length;
    },
    async findMine(userId, ref) {
      const record = own(userId, ref);
      return record ? ownView(record) : null;
    },
    async findMinePost(userId, slug) {
      const record = own(userId, { slug });
      return record ? { post: post(record), own: ownView(record) } : null;
    },

    async saveDraft(userId, id, content, now) {
      const stamp = now.toISOString();
      if (id === null) {
        const record: MemoryRecord = {
          id: newId(),
          slug: null,
          authorId: userId,
          authorDeleted: false,
          status: 'draft',
          source: 'editor',
          content: clone(content),
          rejectionReason: '',
          reviewedByName: '',
          reviewedAt: null,
          submittedAt: null,
          publishedAt: null,
          featuredOnHome: false,
          readsCount: 0,
          revision: null,
          createdAt: stamp,
          updatedAt: stamp,
        };
        all().push(record);
        return { status: 'saved', record: clone(record) };
      }
      const record = own(userId, { id });
      if (!record) return { status: 'not_found' };
      if (record.status === 'pending' || record.status === 'published') return { status: 'locked' };
      const before = fileIdsOf(record.content);
      record.content = clone(content);
      dropUnused(before, fileIdsOf(content));
      record.updatedAt = stamp;
      return { status: 'saved', record: clone(record) };
    },

    async submit(userId, id, content, now) {
      const record = own(userId, { id });
      if (!record) return { status: 'not_found' };
      if (record.status === 'pending') return { status: 'locked' };
      const stamp = now.toISOString();
      if (record.status === 'published') {
        const before = record.revision ? fileIdsOf(record.revision.content) : [];
        record.revision = {
          id: `rev-${crypto.randomUUID().slice(0, 8)}`,
          content: clone(content),
          status: 'pending',
          reason: '',
          submittedAt: stamp,
          reviewedByName: '',
          reviewedAt: null,
        };
        dropUnused(before, [...fileIdsOf(content), ...fileIdsOf(record.content)]);
        record.updatedAt = stamp;
        return { status: 'submitted', record: clone(record), revision: true };
      }
      const before = fileIdsOf(record.content);
      record.content = clone(content);
      dropUnused(before, fileIdsOf(content));
      record.slug ??= memorySlug(content.title, takenSlug);
      record.status = 'pending';
      record.rejectionReason = '';
      record.submittedAt = stamp;
      record.updatedAt = stamp;
      return { status: 'submitted', record: clone(record), revision: false };
    },

    async createFromImpression(userId, content, source, now) {
      const stamp = now.toISOString();
      const record: MemoryRecord = {
        id: newId(),
        slug: memorySlug(content.title, takenSlug),
        authorId: userId,
        authorDeleted: false,
        status: 'pending',
        source,
        content: clone(content),
        rejectionReason: '',
        reviewedByName: '',
        reviewedAt: null,
        submittedAt: stamp,
        publishedAt: null,
        featuredOnHome: false,
        readsCount: 0,
        revision: null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      all().push(record);
      return clone(record);
    },

    async discard(userId, id) {
      const record = own(userId, { id });
      if (!record || (record.status !== 'draft' && record.status !== 'rejected')) return false;
      all().splice(all().indexOf(record), 1);
      dropFiles(record, all());
      return true;
    },

    async retire(userId, deletePublished) {
      let deleted = 0;
      let kept = 0;
      for (const record of all().filter((candidate) => candidate.authorId === userId)) {
        if (record.status === 'published' && !deletePublished) {
          if (record.revision) dropUnused(fileIdsOf(record.revision.content), fileIdsOf(record.content));
          record.revision = null;
          record.authorId = null;
          record.authorDeleted = true;
          kept += 1;
        } else {
          all().splice(all().indexOf(record), 1);
          dropFiles(record, all());
          deleted += 1;
        }
      }
      return { deleted, kept };
    },

    async adminList(query) {
      const needle = query.q.trim().toLowerCase();
      const byStatus = Object.fromEntries(MEMORY_STATUSES.map((status) => [status, 0])) as Record<
        MemoryStatus,
        number
      >;
      for (const record of all()) byStatus[record.status] += 1;
      const counts: AdminMemoryCounts = {
        ...byStatus,
        all: all().length,
        revisions: all().filter(
          (record) => record.status === 'published' && record.revision?.status === 'pending',
        ).length,
      };
      const rows = all()
        .filter(
          (record) =>
            (query.status === 'all' || record.status === query.status) &&
            (!needle || record.content.title.toLowerCase().includes(needle)),
        )
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map(adminRow);
      return { ...paginate(rows, query.page, query.pageSize), counts };
    },

    async queue() {
      return all()
        .filter(isWaiting)
        .map(queueItem)
        .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
    },
    async queueCount() {
      return all().filter(isWaiting).length;
    },
    async review(id) {
      const record = find(id);
      if (!record || !isWaiting(record)) return null;
      const authorApproved = published().filter(
        (other) => other.id !== record.id && other.authorId !== null && other.authorId === record.authorId,
      ).length;
      const item = queueItem(record);
      const revision = record.status === 'published' ? record.revision : null;
      return {
        record: clone(record),
        content: clone(revision ? revision.content : record.content),
        kind: item.kind,
        submittedAt: item.submittedAt,
        authorApproved,
        changes: revision ? changesBetween(record.content, revision.content) : [],
      };
    },

    async adminGet(id) {
      const record = find(id);
      return record ? clone(record) : null;
    },
    async adminSave(id, content, { featuredOnHome, revision }, now) {
      const record = find(id);
      if (!record) return null;
      if (revision && record.revision) {
        const before = fileIdsOf(record.revision.content);
        record.revision.content = clone(content);
        dropUnused(before, [...fileIdsOf(content), ...fileIdsOf(record.content)]);
      } else {
        const before = fileIdsOf(record.content);
        record.content = clone(content);
        dropUnused(before, [
          ...fileIdsOf(content),
          ...(record.revision ? fileIdsOf(record.revision.content) : []),
        ]);
      }
      record.featuredOnHome = record.status === 'published' ? featuredOnHome : false;
      record.updatedAt = now.toISOString();
      return clone(record);
    },
    async approve(id, { reviewerName, featuredOnHome, now }) {
      const record = find(id);
      if (!record) return { status: 'not_found' };
      const stamp = now.toISOString();
      if (record.status === 'pending') {
        record.status = 'published';
        record.publishedAt = stamp;
        record.reviewedByName = reviewerName;
        record.reviewedAt = stamp;
        record.rejectionReason = '';
        record.slug ??= memorySlug(record.content.title, takenSlug);
        if (featuredOnHome !== undefined) record.featuredOnHome = featuredOnHome;
        record.updatedAt = stamp;
        return { status: 'approved', record: clone(record), kind: 'memory' };
      }
      if (record.status === 'published' && record.revision?.status === 'pending') {
        const before = fileIdsOf(record.content);
        record.content = record.revision.content;
        dropUnused(before, fileIdsOf(record.content));
        record.revision = null;
        record.reviewedByName = reviewerName;
        record.reviewedAt = stamp;
        if (featuredOnHome !== undefined) record.featuredOnHome = featuredOnHome;
        record.updatedAt = stamp;
        return { status: 'approved', record: clone(record), kind: 'revision' };
      }
      return { status: 'not_pending' };
    },
    async reject(id, { reviewerName, reason, now }) {
      const record = find(id);
      if (!record) return { status: 'not_found' };
      const stamp = now.toISOString();
      if (record.status === 'pending') {
        record.status = 'rejected';
        record.rejectionReason = reason.trim();
        record.reviewedByName = reviewerName;
        record.reviewedAt = stamp;
        record.updatedAt = stamp;
        return { status: 'rejected', record: clone(record), kind: 'memory' };
      }
      if (record.status === 'published' && record.revision?.status === 'pending') {
        record.revision.status = 'rejected';
        record.revision.reason = reason.trim();
        record.revision.reviewedByName = reviewerName;
        record.revision.reviewedAt = stamp;
        record.updatedAt = stamp;
        return { status: 'rejected', record: clone(record), kind: 'revision' };
      }
      return { status: 'not_pending' };
    },
    async unpublish(id) {
      const record = find(id);
      if (!record) return null;
      if (record.status !== 'published') return clone(record);
      if (record.revision) dropUnused(fileIdsOf(record.revision.content), fileIdsOf(record.content));
      record.status = 'draft';
      record.revision = null;
      record.publishedAt = null;
      record.featuredOnHome = false;
      record.updatedAt = new Date().toISOString();
      return clone(record);
    },
    async remove(id) {
      const record = find(id);
      if (!record) return false;
      all().splice(all().indexOf(record), 1);
      dropFiles(record, all());
      return true;
    },
    async setFeatured(id, featured) {
      const record = find(id);
      if (!record) return null;
      if (record.status === 'published') record.featuredOnHome = featured;
      return clone(record);
    },
  };
}
