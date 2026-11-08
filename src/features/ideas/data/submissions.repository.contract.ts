import { describe, expect, it } from 'vitest';

import type { FeedbackInput, IdeaInput } from '../types';
import type { SubmissionsRepository } from './submissions.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test adds submissions of its
// own and looks for those (the store is shared; nothing is ever deleted).

const NOW = new Date('2026-10-05T08:00:00.000Z');
const unique = () => crypto.randomUUID().slice(0, 8);

const ideaInput = (overrides: Partial<IdeaInput> = {}): IdeaInput => ({
  typeId: 'itype-workshop',
  title: `Idea ${unique()}`,
  description: 'A description that is long enough to be a real idea.',
  locale: 'en',
  attachment: null,
  sender: { name: 'Bojan Ilievski', email: 'bojan@example.org', userId: null, isAnonymous: false },
  ...overrides,
});

const feedbackInput = (overrides: Partial<FeedbackInput> = {}): FeedbackInput => ({
  eventId: 'ev-power-up-2026',
  otherEventName: '',
  eventTitle: 'Workshop: Power Up — Renewable Grids',
  rating: 4,
  text: `The lab day ${unique()} was the best part.`,
  locale: 'en',
  photos: [],
  memoryId: null,
  sender: { name: 'Marija Stojanovska', email: null, userId: 'u-marija', isAnonymous: false },
  ...overrides,
});

export function describeSubmissionsRepository(
  name: string,
  createRepo: () => SubmissionsRepository | Promise<SubmissionsRepository>,
) {
  describe(`SubmissionsRepository (${name})`, () => {
    it('stores an idea as new, with the consent recorded when there is an e-mail', async () => {
      const repo = await createRepo();
      const stored = await repo.submitIdea(ideaInput(), NOW);
      expect(stored).toMatchObject({
        status: 'new',
        ownerId: null,
        name: 'Bojan Ilievski',
        email: 'bojan@example.org',
        consentAt: NOW.toISOString(),
        isAnonymous: false,
        eventDraftId: null,
      });
      expect(await repo.getIdea(stored.id)).toEqual(stored);
    });

    it('keeps no identity of an anonymous idea, whatever came with it', async () => {
      const repo = await createRepo();
      const stored = await repo.submitIdea(
        ideaInput({
          sender: { name: 'Marija', email: 'marija@example.org', userId: 'u-marija', isAnonymous: true },
        }),
        NOW,
      );
      expect(stored).toMatchObject({
        isAnonymous: true,
        name: null,
        email: null,
        consentAt: null,
        userId: null,
      });
      expect(JSON.stringify(await repo.getIdea(stored.id))).not.toContain('marija');
    });

    it('keeps no consent when there is no e-mail', async () => {
      const repo = await createRepo();
      const stored = await repo.submitIdea(
        ideaInput({ sender: { name: null, email: null, userId: null, isAnonymous: false } }),
        NOW,
      );
      expect(stored).toMatchObject({ name: null, email: null, consentAt: null });
    });

    it('lists ideas newest first, by status, type and search, with page numbers', async () => {
      const repo = await createRepo();
      const mine = await repo.submitIdea(
        ideaInput({ title: `Zebra ${unique()}`, typeId: 'itype-event' }),
        NOW,
      );
      const all = await repo.listIdeas({ page: 1, pageSize: 100 });
      expect(all.items.map((idea) => idea.createdAt)).toEqual(
        [...all.items.map((idea) => idea.createdAt)].sort().reverse(),
      );
      const found = await repo.listIdeas({ q: mine.title, page: 1, pageSize: 10 });
      expect(found.items.map((idea) => idea.id)).toEqual([mine.id]);
      const events = await repo.listIdeas({ typeId: 'itype-event', status: 'new', page: 1, pageSize: 100 });
      expect(events.items.some((idea) => idea.id === mine.id)).toBe(true);
      expect(events.items.every((idea) => idea.typeId === 'itype-event' && idea.status === 'new')).toBe(true);
      const paged = await repo.listIdeas({ page: 2, pageSize: 3 });
      expect(paged).toMatchObject({ page: 2, pageSize: 3 });
      expect(paged.items.length).toBeLessThanOrEqual(3);
    });

    it('changes status and owner, and remembers an event draft', async () => {
      const repo = await createRepo();
      const stored = await repo.submitIdea(ideaInput(), NOW);
      const updated = await repo.updateIdea(stored.id, {
        status: 'accepted',
        owner: { id: 'u-ana', name: 'Ana Trajkovska' },
      });
      expect(updated).toMatchObject({ status: 'accepted', ownerId: 'u-ana', ownerName: 'Ana Trajkovska' });
      expect((await repo.updateIdea(stored.id, { owner: null }))?.ownerId).toBeNull();
      expect((await repo.linkEventDraft(stored.id, 'ev-draft'))?.eventDraftId).toBe('ev-draft');
      expect(await repo.updateIdea('no-such-id', { status: 'archived' })).toBeNull();
      expect(await repo.linkEventDraft('no-such-id', 'ev-draft')).toBeNull();
      expect(await repo.getIdea('no-such-id')).toBeNull();
    });

    it('counts ideas by status and by type', async () => {
      const repo = await createRepo();
      const before = await repo.ideaCounts();
      const usedBefore = await repo.countIdeasOfType('itype-other');
      await repo.submitIdea(ideaInput({ typeId: 'itype-other' }), NOW);
      const after = await repo.ideaCounts();
      expect(after.all).toBe(before.all + 1);
      expect(after.new).toBe(before.new + 1);
      expect(await repo.countIdeasOfType('itype-other')).toBe(usedBefore + 1);
      expect(await repo.countIdeasOfType('no-such-type')).toBe(0);
    });

    it('stores feedback with its rating, photos and the event it is about', async () => {
      const repo = await createRepo();
      const photo = { id: 'file-1', name: 'lab.jpg', size: 1200, mime: 'image/jpeg' };
      const stored = await repo.submitFeedback(feedbackInput({ photos: [photo], memoryId: 'mem-1' }), NOW);
      expect(stored).toMatchObject({
        status: 'new',
        rating: 4,
        eventId: 'ev-power-up-2026',
        photos: [photo],
        memoryId: 'mem-1',
        userId: 'u-marija',
      });
      expect(await repo.getFeedback(stored.id)).toEqual(stored);
      const other = await repo.submitFeedback(
        feedbackInput({
          eventId: null,
          otherEventName: 'Study visit',
          eventTitle: 'Study visit',
          rating: null,
        }),
        NOW,
      );
      expect(other).toMatchObject({ eventId: null, otherEventName: 'Study visit', rating: null });
    });

    it('keeps no identity of anonymous feedback', async () => {
      const repo = await createRepo();
      const stored = await repo.submitFeedback(
        feedbackInput({
          sender: { name: 'Marija', email: 'marija@example.org', userId: 'u-marija', isAnonymous: true },
        }),
        NOW,
      );
      expect(stored).toMatchObject({
        isAnonymous: true,
        name: null,
        email: null,
        userId: null,
        consentAt: null,
      });
    });

    it('lists feedback by status, event and search, and limits it to some events', async () => {
      const repo = await createRepo();
      const mine = await repo.submitFeedback(
        feedbackInput({ text: `Needle ${unique()} in the haystack` }),
        NOW,
      );
      const found = await repo.listFeedback({
        q: 'needle',
        eventKey: 'ev-power-up-2026',
        page: 1,
        pageSize: 100,
      });
      expect(found.items.some((row) => row.id === mine.id)).toBe(true);
      expect(found.items.every((row) => row.eventId === 'ev-power-up-2026')).toBe(true);
      const limited = await repo.listFeedback({
        onlyEventIds: ['ev-soft-skills-academy-2026'],
        page: 1,
        pageSize: 100,
      });
      expect(limited.items.length).toBeGreaterThan(0);
      expect(limited.items.every((row) => row.eventId === 'ev-soft-skills-academy-2026')).toBe(true);
      const none = await repo.listFeedback({ onlyEventIds: [], page: 1, pageSize: 100 });
      expect(none.total).toBe(0);
      const events = await repo.feedbackEvents();
      expect(events.some((event) => event.key === 'ev-power-up-2026')).toBe(true);
      expect(events.some((event) => event.key === 'other:study visit at makstil')).toBe(false);
    });

    it('changes status and owner of feedback, and counts it', async () => {
      const repo = await createRepo();
      const before = await repo.feedbackCounts();
      const stored = await repo.submitFeedback(feedbackInput(), NOW);
      expect((await repo.feedbackCounts()).new).toBe(before.new + 1);
      const updated = await repo.updateFeedback(stored.id, {
        status: 'under_review',
        owner: { id: 'u-ana', name: 'Ana Trajkovska' },
      });
      expect(updated).toMatchObject({ status: 'under_review', ownerId: 'u-ana' });
      expect(await repo.updateFeedback('no-such-id', { status: 'archived' })).toBeNull();
      expect(await repo.getFeedback('no-such-id')).toBeNull();
    });

    it('computes the average, the spread and the latest comment per event from the rated feedback', async () => {
      const repo = await createRepo();
      const eventId = `ev-ratings-${unique()}`;
      const give = (rating: FeedbackInput['rating'], text: string, at: string) =>
        repo.submitFeedback(
          feedbackInput({ eventId, eventTitle: 'A rated event', rating, text }),
          new Date(at),
        );
      await give(5, 'first', '2026-10-05T08:00:00.000Z');
      await give(4, 'second', '2026-10-05T09:00:00.000Z');
      await give(4, 'third', '2026-10-05T10:00:00.000Z');
      await give(null, 'no stars', '2026-10-05T11:00:00.000Z');
      const row = (await repo.ratings({})).find((rating) => rating.key === eventId);
      expect(row).toMatchObject({
        eventId,
        eventTitle: 'A rated event',
        count: 3,
        average: 4.3,
        distribution: [0, 0, 0, 2, 1],
        latestComment: { text: 'third' },
      });
      const early = (await repo.ratings({ until: '2026-10-05T09:30:00.000Z' })).find(
        (rating) => rating.key === eventId,
      );
      expect(early).toMatchObject({ count: 2, average: 4.5 });
      expect(
        (await repo.ratings({ onlyEventIds: ['ev-soft-skills-academy-2026'] })).map((r) => r.eventId),
      ).toEqual(['ev-soft-skills-academy-2026']);
    });

    it('knows whose file it is', async () => {
      const repo = await createRepo();
      const file = (id: string) => ({ id, name: `${id}.pdf`, size: 10, mime: 'application/pdf' });
      const ideaFile = `file-${unique()}`;
      const photo = `file-${unique()}`;
      await repo.submitIdea(ideaInput({ attachment: file(ideaFile) }), NOW);
      await repo.submitFeedback(feedbackInput({ photos: [file(photo)] }), NOW);
      expect(await repo.fileOwner(ideaFile)).toEqual({ kind: 'idea' });
      expect(await repo.fileOwner(photo)).toEqual({ kind: 'feedback', eventId: 'ev-power-up-2026' });
      expect(await repo.fileOwner('no-such-file')).toBeNull();
    });

    it('lists everything for the export', async () => {
      const repo = await createRepo();
      expect((await repo.allIdeas()).length).toBeGreaterThan(0);
      expect((await repo.allFeedback()).length).toBeGreaterThan(0);
      expect((await repo.allFeedback([])).length).toBe(0);
    });
  });
}
