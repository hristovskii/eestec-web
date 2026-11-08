import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { paginate } from '@/shared/data/paged';

import type { EventRating, Feedback, Idea, SubmissionCounts, SubmissionStatus } from '../types';
import { SUBMISSION_STATUSES } from '../types';
import { feedbackFixture } from './fixtures/feedback';
import { ideasFixture } from './fixtures/ideas';
import type { SubmissionsRepository } from './submissions.repository';

const tables = () =>
  mockTable<{ ideas: Idea[]; feedback: Feedback[] }>('submissions', () => ({
    ideas: structuredClone(ideasFixture),
    feedback: structuredClone(feedbackFixture),
  }));

const newestFirst = <T extends { createdAt: string }>(rows: readonly T[]) =>
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const matches = (text: string[], q: string | undefined) => {
  const needle = q?.trim().toLowerCase();
  return !needle || text.some((part) => part.toLowerCase().includes(needle));
};

function counts(rows: readonly { status: SubmissionStatus }[]): SubmissionCounts {
  const result = { all: rows.length, new: 0, under_review: 0, accepted: 0, archived: 0 };
  for (const status of SUBMISSION_STATUSES)
    result[status] = rows.filter((row) => row.status === status).length;
  return result;
}

const eventKey = (row: Feedback) => row.eventId ?? `other:${row.otherEventName.trim().toLowerCase()}`;

/** What an anonymous sender leaves behind: nothing (D28). */
function sender(
  input: { name: string | null; email: string | null; userId: string | null; isAnonymous: boolean },
  now: Date,
) {
  if (input.isAnonymous) return { name: null, email: null, consentAt: null, userId: null, isAnonymous: true };
  return {
    name: input.name?.trim() || null,
    email: input.email?.trim() || null,
    consentAt: input.email?.trim() ? now.toISOString() : null,
    userId: input.userId,
    isAnonymous: false,
  };
}

function apply<T extends { status: SubmissionStatus; ownerId: string | null; ownerName: string | null }>(
  row: T,
  patch: { status?: SubmissionStatus; owner?: { id: string; name: string } | null },
) {
  if (patch.status) row.status = patch.status;
  if (patch.owner !== undefined) {
    row.ownerId = patch.owner?.id ?? null;
    row.ownerName = patch.owner?.name ?? null;
  }
}

export function createMockSubmissionsRepository(): SubmissionsRepository {
  const db = tables();
  return {
    submitIdea(input, now) {
      const idea: Idea = {
        id: `idea-${crypto.randomUUID().slice(0, 8)}`,
        typeId: input.typeId,
        title: input.title,
        description: input.description,
        attachment: input.attachment ? structuredClone(input.attachment) : null,
        ...sender(input.sender, now),
        status: 'new',
        ownerId: null,
        ownerName: null,
        eventDraftId: null,
        locale: input.locale,
        createdAt: now.toISOString(),
      };
      db.ideas.unshift(idea);
      return Promise.resolve(structuredClone(idea));
    },

    submitFeedback(input, now) {
      const feedback: Feedback = {
        id: `fb-${crypto.randomUUID().slice(0, 8)}`,
        eventId: input.eventId,
        otherEventName: input.eventId ? '' : input.otherEventName,
        eventTitle: input.eventTitle,
        rating: input.rating,
        text: input.text,
        photos: structuredClone(input.photos),
        memoryId: input.memoryId,
        ...sender(input.sender, now),
        status: 'new',
        ownerId: null,
        ownerName: null,
        locale: input.locale,
        createdAt: now.toISOString(),
      };
      db.feedback.unshift(feedback);
      return Promise.resolve(structuredClone(feedback));
    },

    listIdeas(query) {
      const rows = newestFirst(db.ideas).filter(
        (idea) =>
          (!query.status || idea.status === query.status) &&
          (!query.typeId || idea.typeId === query.typeId) &&
          matches([idea.title, idea.description, idea.name ?? ''], query.q),
      );
      return Promise.resolve(structuredClone(paginate(rows, query.page, query.pageSize)));
    },
    ideaCounts: () => Promise.resolve(counts(db.ideas)),
    getIdea(id) {
      const idea = db.ideas.find((candidate) => candidate.id === id);
      return Promise.resolve(idea ? structuredClone(idea) : null);
    },
    updateIdea(id, patch) {
      const idea = db.ideas.find((candidate) => candidate.id === id);
      if (!idea) return Promise.resolve(null);
      apply(idea, patch);
      return Promise.resolve(structuredClone(idea));
    },
    linkEventDraft(id, eventDraftId) {
      const idea = db.ideas.find((candidate) => candidate.id === id);
      if (!idea) return Promise.resolve(null);
      idea.eventDraftId = eventDraftId;
      return Promise.resolve(structuredClone(idea));
    },
    fileOwner(fileId) {
      if (db.ideas.some((idea) => idea.attachment?.id === fileId))
        return Promise.resolve({ kind: 'idea' as const });
      const row = db.feedback.find((candidate) => candidate.photos.some((photo) => photo.id === fileId));
      return Promise.resolve(row ? { kind: 'feedback' as const, eventId: row.eventId } : null);
    },
    countIdeasOfType: (typeId) => Promise.resolve(db.ideas.filter((idea) => idea.typeId === typeId).length),

    listFeedback(query) {
      const rows = newestFirst(db.feedback).filter(
        (row) =>
          (!query.status || row.status === query.status) &&
          (!query.eventKey || eventKey(row) === query.eventKey) &&
          (!query.onlyEventIds || (row.eventId !== null && query.onlyEventIds.includes(row.eventId))) &&
          matches([row.text, row.eventTitle, row.name ?? ''], query.q),
      );
      return Promise.resolve(structuredClone(paginate(rows, query.page, query.pageSize)));
    },
    feedbackCounts: (onlyEventIds) =>
      Promise.resolve(
        counts(
          db.feedback.filter(
            (row) => !onlyEventIds || (row.eventId !== null && onlyEventIds.includes(row.eventId)),
          ),
        ),
      ),
    getFeedback(id) {
      const row = db.feedback.find((candidate) => candidate.id === id);
      return Promise.resolve(row ? structuredClone(row) : null);
    },
    updateFeedback(id, patch) {
      const row = db.feedback.find((candidate) => candidate.id === id);
      if (!row) return Promise.resolve(null);
      apply(row, patch);
      return Promise.resolve(structuredClone(row));
    },
    feedbackEvents(onlyEventIds) {
      const seen = new Map<string, string>();
      for (const row of newestFirst(db.feedback)) {
        if (onlyEventIds && !(row.eventId !== null && onlyEventIds.includes(row.eventId))) continue;
        const key = eventKey(row);
        if (!seen.has(key)) seen.set(key, row.eventTitle);
      }
      return Promise.resolve([...seen].map(([key, title]) => ({ key, title })));
    },

    ratings(query) {
      const groups = new Map<string, Feedback[]>();
      for (const row of newestFirst(db.feedback)) {
        if (row.rating === null) continue;
        if (query.from && row.createdAt < query.from) continue;
        if (query.until && row.createdAt >= query.until) continue;
        if (query.onlyEventIds && !(row.eventId !== null && query.onlyEventIds.includes(row.eventId)))
          continue;
        const key = eventKey(row);
        groups.set(key, [...(groups.get(key) ?? []), row]);
      }
      const result: EventRating[] = [];
      for (const [key, rows] of groups) {
        const distribution: EventRating['distribution'] = [0, 0, 0, 0, 0];
        let sum = 0;
        for (const row of rows) {
          const stars = row.rating ?? 1;
          distribution[stars - 1] = (distribution[stars - 1] ?? 0) + 1;
          sum += stars;
        }
        const commented = rows.find((row) => row.text.trim() !== '');
        const first = rows[0];
        if (!first) continue;
        result.push({
          key,
          eventId: first.eventId,
          eventTitle: first.eventTitle,
          average: Math.round((sum / rows.length) * 10) / 10,
          count: rows.length,
          distribution,
          latestComment: commented ? { text: commented.text, createdAt: commented.createdAt } : null,
          latestAt: first.createdAt,
        });
      }
      return Promise.resolve(result.sort((a, b) => b.latestAt.localeCompare(a.latestAt)));
    },

    allIdeas: () => Promise.resolve(structuredClone(newestFirst(db.ideas))),
    allFeedback: (onlyEventIds) =>
      Promise.resolve(
        structuredClone(
          newestFirst(db.feedback).filter(
            (row) => !onlyEventIds || (row.eventId !== null && onlyEventIds.includes(row.eventId)),
          ),
        ),
      ),
  };
}
