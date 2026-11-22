import { describe, expect, it } from 'vitest';

import type { FeedbackInput, IdeaInput } from '../types';
import type { SubmissionsRepository } from './submissions.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test adds submissions of its
// own and looks for those (the store is shared; nothing is ever deleted).

const NOW = new Date('2026-10-05T08:00:00.000Z');
const unique = () => crypto.randomUUID().slice(0, 8);

/**
 * `ids` maps the fixture ids (idea types, events, people) to the ids a database seed uses. `member` is a person who
 * may write Memories: a database needs a real account whose verified e-mail goes with the submission.
 */
export type SubmissionsContractOptions = {
  ids?: (id: string) => string;
  /** Read when a test runs (the account is made then). */
  member?: () => { userId: string; email: string | null };
};

const PDF = new Uint8Array([37, 80, 68, 70, 45, 49]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);

export function describeSubmissionsRepository(
  name: string,
  createRepo: () => SubmissionsRepository | Promise<SubmissionsRepository>,
  options: SubmissionsContractOptions = {},
) {
  const id = options.ids ?? ((value: string) => value);
  const member = () => options.member?.() ?? { userId: 'u-marija', email: null };
  const typeOf = (key: string) => id(`itype-${key}`);

  const ideaInput = (overrides: Partial<IdeaInput> = {}): IdeaInput => ({
    typeId: typeOf('workshop'),
    title: `Idea ${unique()}`,
    description: 'A description that is long enough to be a real idea.',
    locale: 'en',
    attachment: null,
    sender: { name: 'Bojan Ilievski', email: 'bojan@example.org', userId: null, isAnonymous: false },
    ...overrides,
  });

  const feedbackInput = (overrides: Partial<FeedbackInput> = {}): FeedbackInput => ({
    eventId: id('ev-power-up-2026'),
    otherEventName: '',
    eventTitle: 'Workshop: Power Up — Renewable Grids',
    rating: 4,
    text: `The lab day ${unique()} was the best part.`,
    locale: 'en',
    photos: [],
    memory: null,
    sender: {
      name: 'Marija Stojanovska',
      email: member().email,
      userId: member().userId,
      isAnonymous: false,
    },
    ...overrides,
  });

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
        createdAt: NOW.toISOString(),
      });
      expect(await repo.getIdea(stored.id)).toEqual(stored);
    });

    it('keeps no identity of an anonymous idea, whatever came with it', async () => {
      const repo = await createRepo();
      const stored = await repo.submitIdea(
        ideaInput({
          sender: { name: 'Marija', email: 'marija@example.org', userId: member().userId, isAnonymous: true },
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

    it('keeps an attachment with the idea and knows whose file it is', async () => {
      const repo = await createRepo();
      const file = await repo.storeFile({ bytes: PDF, mimeType: 'application/pdf', name: 'plan.pdf' });
      expect(file).toMatchObject({ name: 'plan.pdf', size: PDF.length, mime: 'application/pdf' });
      const stored = await repo.submitIdea(ideaInput({ attachment: file }), NOW);
      expect(stored.attachment).toEqual(file);
      expect(await repo.getIdea(stored.id)).toEqual(stored);
      expect(await repo.fileOwner(file.id)).toEqual({ kind: 'idea' });
      expect(await repo.readFile(file.id)).toEqual({
        bytes: PDF,
        mimeType: 'application/pdf',
        name: 'plan.pdf',
      });
      expect(await repo.fileOwner('no-such-file')).toBeNull();
      expect(await repo.readFile('no-such-file')).toBeNull();
    });

    it('lists ideas newest first, by status, type and search, with page numbers', async () => {
      const repo = await createRepo();
      const mine = await repo.submitIdea(
        ideaInput({ title: `Zebra ${unique()}`, typeId: typeOf('event') }),
        NOW,
      );
      const all = await repo.listIdeas({ page: 1, pageSize: 100 });
      expect(all.items.map((idea) => idea.createdAt)).toEqual(
        [...all.items.map((idea) => idea.createdAt)].sort().reverse(),
      );
      const found = await repo.listIdeas({ q: mine.title, page: 1, pageSize: 10 });
      expect(found.items.map((idea) => idea.id)).toEqual([mine.id]);
      const events = await repo.listIdeas({ typeId: typeOf('event'), status: 'new', page: 1, pageSize: 100 });
      expect(events.items.some((idea) => idea.id === mine.id)).toBe(true);
      expect(events.items.every((idea) => idea.typeId === typeOf('event') && idea.status === 'new')).toBe(
        true,
      );
      const paged = await repo.listIdeas({ page: 2, pageSize: 3 });
      expect(paged).toMatchObject({ page: 2, pageSize: 3 });
      expect(paged.items.length).toBeLessThanOrEqual(3);
    });

    it('changes status and owner, and remembers an event draft', async () => {
      const repo = await createRepo();
      const stored = await repo.submitIdea(ideaInput(), NOW);
      const updated = await repo.updateIdea(stored.id, {
        status: 'accepted',
        owner: { id: id('u-ana'), name: 'Ana Trajkovska' },
      });
      expect(updated).toMatchObject({
        status: 'accepted',
        ownerId: id('u-ana'),
        ownerName: 'Ana Trajkovska',
      });
      expect((await repo.updateIdea(stored.id, { owner: null }))?.ownerId).toBeNull();
      expect((await repo.updateIdea(stored.id, { status: 'archived' }))?.status).toBe('archived');
      const draft = id('ev-power-up-2026');
      expect((await repo.linkEventDraft(stored.id, draft))?.eventDraftId).toBe(draft);
      expect(await repo.updateIdea('no-such-id', { status: 'archived' })).toBeNull();
      expect(await repo.linkEventDraft('no-such-id', draft)).toBeNull();
      expect(await repo.getIdea('no-such-id')).toBeNull();
    });

    it('counts ideas by status and by type', async () => {
      const repo = await createRepo();
      const before = await repo.ideaCounts();
      const usedBefore = await repo.countIdeasOfType(typeOf('other'));
      await repo.submitIdea(ideaInput({ typeId: typeOf('other') }), NOW);
      const after = await repo.ideaCounts();
      expect(after.all).toBe(before.all + 1);
      expect(after.new).toBe(before.new + 1);
      expect(await repo.countIdeasOfType(typeOf('other'))).toBe(usedBefore + 1);
      expect(await repo.countIdeasOfType('no-such-type')).toBe(0);
    });

    it('stores feedback with its rating, photos and the event it is about', async () => {
      const repo = await createRepo();
      const photo = await repo.storeFile({ bytes: JPEG, mimeType: 'image/jpeg', name: 'lab.jpg' });
      const stored = await repo.submitFeedback(feedbackInput({ photos: [photo] }), NOW);
      expect(stored).toMatchObject({
        status: 'new',
        rating: 4,
        eventId: id('ev-power-up-2026'),
        photos: [photo],
        memoryId: null,
        userId: member().userId,
        createdAt: NOW.toISOString(),
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

    it('makes the Memory a member asked for together with the feedback', async () => {
      const repo = await createRepo();
      const stored = await repo.submitFeedback(
        feedbackInput({
          memory: {
            title: `From an impression ${unique()}`,
            eventId: id('ev-power-up-2026'),
            otherEventName: '',
            city: 'Skopje',
            country: 'North Macedonia',
            happenedOn: null,
            body: '<p>The lab day was the best part.</p>',
            cover: null,
            photos: [],
          },
        }),
        NOW,
      );
      expect(stored.memoryId).toEqual(expect.any(String));
      expect(stored.memoryId).not.toBe('');
      const without = await repo.submitFeedback(feedbackInput(), NOW);
      expect(without.memoryId).toBeNull();
    });

    it('keeps no identity of anonymous feedback', async () => {
      const repo = await createRepo();
      const stored = await repo.submitFeedback(
        feedbackInput({
          sender: { name: 'Marija', email: 'marija@example.org', userId: member().userId, isAnonymous: true },
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
      const power = id('ev-power-up-2026');
      const mine = await repo.submitFeedback(
        feedbackInput({ text: `Needle ${unique()} in the haystack` }),
        NOW,
      );
      const found = await repo.listFeedback({ q: 'needle', eventKey: power, page: 1, pageSize: 100 });
      expect(found.items.some((row) => row.id === mine.id)).toBe(true);
      expect(found.items.every((row) => row.eventId === power)).toBe(true);
      const soft = id('ev-soft-skills-academy-2026');
      const limited = await repo.listFeedback({ onlyEventIds: [soft], page: 1, pageSize: 100 });
      expect(limited.items.length).toBeGreaterThan(0);
      expect(limited.items.every((row) => row.eventId === soft)).toBe(true);
      // An event manager gets the rating and the impression, nothing of the sender, owner, photos or Memory (D33).
      expect(
        limited.items.every(
          (row) =>
            row.name === null &&
            row.email === null &&
            row.userId === null &&
            row.ownerId === null &&
            row.photos.length === 0 &&
            row.memoryId === null,
        ),
      ).toBe(true);
      const none = await repo.listFeedback({ onlyEventIds: [], page: 1, pageSize: 100 });
      expect(none.total).toBe(0);
      const events = await repo.feedbackEvents();
      expect(events.some((event) => event.key === power)).toBe(true);
      expect(events.some((event) => event.key === 'other:study visit at makstil')).toBe(false);
      expect((await repo.feedbackEvents([soft])).map((event) => event.key)).toEqual([soft]);
    });

    it('changes status and owner of feedback, and counts it', async () => {
      const repo = await createRepo();
      const before = await repo.feedbackCounts();
      const stored = await repo.submitFeedback(feedbackInput(), NOW);
      expect((await repo.feedbackCounts()).new).toBe(before.new + 1);
      const updated = await repo.updateFeedback(stored.id, {
        status: 'under_review',
        owner: { id: id('u-ana'), name: 'Ana Trajkovska' },
      });
      expect(updated).toMatchObject({ status: 'under_review', ownerId: id('u-ana') });
      expect(await repo.updateFeedback('no-such-id', { status: 'archived' })).toBeNull();
      expect(await repo.getFeedback('no-such-id')).toBeNull();
    });

    it('computes the average, the spread and the latest comment per event from the rated feedback', async () => {
      const repo = await createRepo();
      // Feedback on an event that is not listed is grouped by its name: nothing else shares the group.
      const otherEventName = `Ratings ${unique()}`;
      const key = `other:${otherEventName.toLowerCase()}`;
      const give = (rating: FeedbackInput['rating'], text: string, at: string) =>
        repo.submitFeedback(
          feedbackInput({ eventId: null, otherEventName, eventTitle: otherEventName, rating, text }),
          new Date(at),
        );
      await give(5, 'first', '2026-10-05T08:00:00.000Z');
      await give(4, 'second', '2026-10-05T09:00:00.000Z');
      await give(4, 'third', '2026-10-05T10:00:00.000Z');
      await give(null, 'no stars', '2026-10-05T11:00:00.000Z');
      const row = (await repo.ratings({})).find((rating) => rating.key === key);
      expect(row).toMatchObject({
        eventId: null,
        eventTitle: otherEventName,
        count: 3,
        average: 4.3,
        distribution: [0, 0, 0, 2, 1],
        latestComment: { text: 'third' },
      });
      const early = (await repo.ratings({ until: '2026-10-05T09:30:00.000Z' })).find(
        (rating) => rating.key === key,
      );
      expect(early).toMatchObject({ count: 2, average: 4.5 });
      const soft = id('ev-soft-skills-academy-2026');
      expect((await repo.ratings({ onlyEventIds: [soft] })).map((r) => r.eventId)).toEqual([soft]);
    });

    it('knows whose file a photo is', async () => {
      const repo = await createRepo();
      const photo = await repo.storeFile({ bytes: JPEG, mimeType: 'image/jpeg', name: 'photo.jpg' });
      await repo.submitFeedback(feedbackInput({ photos: [photo] }), NOW);
      expect(await repo.fileOwner(photo.id)).toEqual({ kind: 'feedback', eventId: id('ev-power-up-2026') });
    });

    it('lists everything for the export', async () => {
      const repo = await createRepo();
      expect((await repo.allIdeas()).length).toBeGreaterThan(0);
      expect((await repo.allFeedback()).length).toBeGreaterThan(0);
      expect((await repo.allFeedback([])).length).toBe(0);
    });
  });
}
