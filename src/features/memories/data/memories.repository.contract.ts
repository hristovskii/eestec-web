import { describe, expect, it } from 'vitest';

import type { MemoryContent } from '../types';
import type { MemoriesRepository } from './memories.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test writes as its own author,
// so tests don't see each other's Memories; reads of the sample data only check what the samples
// guarantee (names, not counts).

const NOW = new Date('2026-10-10T10:00:00+02:00');
const unique = () => crypto.randomUUID().slice(0, 8);

const content = (patch: Partial<MemoryContent> = {}): MemoryContent => ({
  title: `Contract story ${unique()}`,
  eventId: 'ev-power-up-2026',
  otherEventName: '',
  city: 'Skopje',
  country: 'North Macedonia',
  happenedOn: '2026-05-20',
  body: '<p>One two three four five six seven eight nine ten.</p>',
  cover: { fileId: null, sample: 'Cover', alt: 'A cover', credit: '' },
  photos: [{ id: 'p1', fileId: null, sample: 'One', alt: 'First photo', caption: '' }],
  ...patch,
});

const author = () => `u-contract-${unique()}`;

export function describeMemoriesRepository(
  name: string,
  createRepo: () => MemoriesRepository | Promise<MemoriesRepository>,
) {
  describe(`MemoriesRepository (${name})`, () => {
    it('keeps a draft private and gives it no address until it is submitted', async () => {
      const repo = await createRepo();
      const userId = author();
      const saved = await repo.saveDraft(userId, null, content({ title: 'Private draft' }), NOW);
      expect(saved).toMatchObject({
        status: 'saved',
        record: { status: 'draft', slug: null, authorId: userId },
      });
      if (saved.status !== 'saved') return;
      expect(await repo.findMine(userId, { id: saved.record.id })).toMatchObject({ mode: 'draft' });
      expect(await repo.findMine(author(), { id: saved.record.id })).toBeNull();
      const mine = await repo.listMine(userId);
      expect(mine.map((item) => item.title)).toEqual(['Private draft']);
      const slugs = await repo.listSlugs();
      expect(slugs).not.toContain('private-draft');
    });

    it('overwrites a draft while it is saved again and refuses to save while waiting', async () => {
      const repo = await createRepo();
      const userId = author();
      const first = await repo.saveDraft(userId, null, content({ title: 'v1' }), NOW);
      if (first.status !== 'saved') throw new Error('expected saved');
      const second = await repo.saveDraft(userId, first.record.id, content({ title: 'v2' }), NOW);
      expect(second).toMatchObject({ status: 'saved', record: { content: { title: 'v2' } } });
      await repo.submit(userId, first.record.id, content({ title: 'v2' }), NOW);
      expect(await repo.saveDraft(userId, first.record.id, content({ title: 'v3' }), NOW)).toEqual({
        status: 'locked',
      });
      expect(await repo.saveDraft(author(), first.record.id, content(), NOW)).toEqual({
        status: 'not_found',
      });
    });

    it('submits for review, makes the address once and never uses the reserved ones', async () => {
      const repo = await createRepo();
      const userId = author();
      const saved = await repo.saveDraft(userId, null, content({ title: 'New' }), NOW);
      if (saved.status !== 'saved') throw new Error('expected saved');
      const submitted = await repo.submit(userId, saved.record.id, content({ title: 'New' }), NOW);
      expect(submitted).toMatchObject({
        status: 'submitted',
        revision: false,
        record: { status: 'pending' },
      });
      if (submitted.status !== 'submitted') return;
      expect(submitted.record.slug).not.toBe('new');
      expect(submitted.record.slug).toMatch(/^new/);
      expect(await repo.findPost(submitted.record.slug!)).toBeNull();
      expect((await repo.queue()).map((item) => item.id)).toContain(saved.record.id);
      expect(await repo.submit(userId, saved.record.id, content(), NOW)).toEqual({ status: 'locked' });
    });

    it('approving publishes it; the public sees it, counts reads and lists it', async () => {
      const repo = await createRepo();
      const userId = author();
      const title = `Approve me ${unique()}`;
      const saved = await repo.saveDraft(userId, null, content({ title }), NOW);
      if (saved.status !== 'saved') throw new Error('expected saved');
      await repo.submit(userId, saved.record.id, content({ title }), NOW);
      const approved = await repo.approve(saved.record.id, {
        reviewerName: 'Ivana Kostova',
        featuredOnHome: true,
        now: NOW,
      });
      expect(approved).toMatchObject({ status: 'approved', kind: 'memory', record: { status: 'published' } });
      if (approved.status !== 'approved') return;
      const slug = approved.record.slug!;
      const post = await repo.findPost(slug);
      expect(post).toMatchObject({ title, readMinutes: 1, authorId: userId });
      await repo.countRead(slug);
      expect((await repo.findPost(slug))?.readsCount).toBe(1);
      expect((await repo.latest(50)).map((item) => item.slug)).toContain(slug);
      expect(await repo.countByAuthor(userId)).toBe(1);
      expect(await repo.approve(saved.record.id, { reviewerName: 'x', now: NOW })).toEqual({
        status: 'not_pending',
      });
    });

    it('rejecting keeps the reason, shows it to the author, and lets them resubmit', async () => {
      const repo = await createRepo();
      const userId = author();
      const saved = await repo.saveDraft(userId, null, content({ title: 'Reject me' }), NOW);
      if (saved.status !== 'saved') throw new Error('expected saved');
      await repo.submit(userId, saved.record.id, content({ title: 'Reject me' }), NOW);
      const rejected = await repo.reject(saved.record.id, {
        reviewerName: 'Ivana Kostova',
        reason: '  Add alt text.  ',
        now: NOW,
      });
      expect(rejected).toMatchObject({ status: 'rejected', record: { rejectionReason: 'Add alt text.' } });
      const mine = await repo.listMine(userId);
      expect(mine[0]).toMatchObject({ status: 'rejected', rejectionReason: 'Add alt text.' });
      const again = await repo.submit(userId, saved.record.id, content({ title: 'Reject me' }), NOW);
      expect(again).toMatchObject({
        status: 'submitted',
        record: { status: 'pending', rejectionReason: '' },
      });
    });

    it('editing a published Memory queues a revision and keeps the live version', async () => {
      const repo = await createRepo();
      const userId = author();
      const saved = await repo.saveDraft(userId, null, content({ title: 'Live one' }), NOW);
      if (saved.status !== 'saved') throw new Error('expected saved');
      await repo.submit(userId, saved.record.id, content({ title: 'Live one' }), NOW);
      const approved = await repo.approve(saved.record.id, { reviewerName: 'Ivana', now: NOW });
      if (approved.status !== 'approved') throw new Error('expected approved');
      const slug = approved.record.slug!;

      const edit = content({ title: 'Live one', body: '<p>Changed text for review.</p>' });
      expect(await repo.saveDraft(userId, saved.record.id, edit, NOW)).toEqual({ status: 'locked' });
      const revision = await repo.submit(userId, saved.record.id, edit, NOW);
      expect(revision).toMatchObject({ status: 'submitted', revision: true });

      expect((await repo.findPost(slug))?.body).toContain('One two three');
      const own = await repo.findMine(userId, { slug });
      expect(own).toMatchObject({ mode: 'live' });
      expect(own?.editing.body).toContain('Changed text');
      const review = await repo.review(saved.record.id);
      expect(review).toMatchObject({ kind: 'revision', changes: ['text'] });
      expect((await repo.queue()).find((item) => item.id === saved.record.id)).toMatchObject({
        kind: 'revision',
      });

      const rejected = await repo.reject(saved.record.id, {
        reviewerName: 'Ivana',
        reason: 'Shorter please',
        now: NOW,
      });
      expect(rejected).toMatchObject({ status: 'rejected', kind: 'revision' });
      expect((await repo.listMine(userId))[0]).toMatchObject({ status: 'published', revision: 'rejected' });
      expect((await repo.findPost(slug))?.body).toContain('One two three');

      await repo.submit(userId, saved.record.id, edit, NOW);
      const done = await repo.approve(saved.record.id, { reviewerName: 'Ivana', now: NOW });
      expect(done).toMatchObject({ status: 'approved', kind: 'revision' });
      expect((await repo.findPost(slug))?.body).toContain('Changed text');
    });

    it('unpublishing turns it into a draft again and removes it from the public site', async () => {
      const repo = await createRepo();
      const userId = author();
      const saved = await repo.saveDraft(userId, null, content({ title: 'Pull me' }), NOW);
      if (saved.status !== 'saved') throw new Error('expected saved');
      await repo.submit(userId, saved.record.id, content({ title: 'Pull me' }), NOW);
      const approved = await repo.approve(saved.record.id, { reviewerName: 'Ivana', now: NOW });
      if (approved.status !== 'approved') throw new Error('expected approved');
      const slug = approved.record.slug!;
      expect(await repo.unpublish(saved.record.id)).toMatchObject({ status: 'draft', publishedAt: null });
      expect(await repo.findPost(slug)).toBeNull();
      expect(await repo.findMine(userId, { slug })).not.toBeNull();
    });

    it('filters the list by event, year, place, author and search, and pages it', async () => {
      const repo = await createRepo();
      const userId = author();
      const tag = unique();
      for (const [title, eventId, city, country, happenedOn] of [
        [`Alpha ${tag}`, 'ev-power-up-2026', 'Tallinn', 'Estonia', '2024-02-01'],
        [`Beta ${tag}`, 'ev-robomac-2026', 'Skopje', 'North Macedonia', '2025-04-01'],
      ] as const) {
        const draft = await repo.saveDraft(
          userId,
          null,
          content({ title, eventId, city, country, happenedOn }),
          NOW,
        );
        if (draft.status !== 'saved') throw new Error('expected saved');
        await repo.submit(
          userId,
          draft.record.id,
          content({ title, eventId, city, country, happenedOn }),
          NOW,
        );
        await repo.approve(draft.record.id, { reviewerName: 'x', now: NOW });
      }
      const base = {
        q: '',
        eventId: null,
        year: null,
        place: null,
        authorId: userId,
        sort: 'newest',
        page: 1,
      } as const;
      const all = await repo.list(base);
      expect(all.items).toHaveLength(2);
      expect(
        (await repo.list({ ...base, eventId: 'ev-robomac-2026' })).items.map((item) => item.title),
      ).toEqual([`Beta ${tag}`]);
      expect((await repo.list({ ...base, year: 2024 })).items.map((item) => item.title)).toEqual([
        `Alpha ${tag}`,
      ]);
      expect((await repo.list({ ...base, place: 'tallinn, estonia' })).items).toHaveLength(1);
      expect((await repo.list({ ...base, q: `beta ${tag}` })).items).toHaveLength(1);
      expect((await repo.list({ ...base, authorId: author() })).items).toHaveLength(0);
      const facets = await repo.facets();
      expect(facets.places).toContain('Tallinn, Estonia');
      expect(facets.years).toContain(2024);
    });

    it('deleting an account keeps published Memories as "a former member" unless asked', async () => {
      const repo = await createRepo();
      const userId = author();
      const publish = async (title: string) => {
        const draft = await repo.saveDraft(userId, null, content({ title }), NOW);
        if (draft.status !== 'saved') throw new Error('expected saved');
        await repo.submit(userId, draft.record.id, content({ title }), NOW);
        const approved = await repo.approve(draft.record.id, { reviewerName: 'x', now: NOW });
        if (approved.status !== 'approved') throw new Error('expected approved');
        return approved.record;
      };
      const kept = await publish('Stays');
      await repo.saveDraft(userId, null, content({ title: 'A draft that goes' }), NOW);
      expect(await repo.countPublishedBy(userId)).toBe(1);
      expect(await repo.retire(userId, false)).toEqual({ deleted: 1, kept: 1 });
      const post = await repo.findPost(kept.slug!);
      expect(post).toMatchObject({ authorId: null, authorDeleted: true });
      expect(await repo.listMine(userId)).toEqual([]);

      const other = author();
      const draft = await repo.saveDraft(other, null, content({ title: 'Gone with the account' }), NOW);
      if (draft.status !== 'saved') throw new Error('expected saved');
      await repo.submit(other, draft.record.id, content({ title: 'Gone with the account' }), NOW);
      const approved = await repo.approve(draft.record.id, { reviewerName: 'x', now: NOW });
      if (approved.status !== 'approved') throw new Error('expected approved');
      expect(await repo.retire(other, true)).toEqual({ deleted: 1, kept: 0 });
      expect(await repo.findPost(approved.record.slug!)).toBeNull();
    });

    it('the admin can edit, feature and delete', async () => {
      const repo = await createRepo();
      const userId = author();
      const draft = await repo.saveDraft(userId, null, content({ title: 'Admin touch' }), NOW);
      if (draft.status !== 'saved') throw new Error('expected saved');
      await repo.submit(userId, draft.record.id, content({ title: 'Admin touch' }), NOW);
      const edited = await repo.adminSave(
        draft.record.id,
        content({ title: 'Admin touch (fixed)' }),
        { featuredOnHome: true, revision: false },
        NOW,
      );
      expect(edited).toMatchObject({ content: { title: 'Admin touch (fixed)' }, featuredOnHome: false });
      await repo.approve(draft.record.id, { reviewerName: 'x', featuredOnHome: true, now: NOW });
      expect(await repo.setFeatured(draft.record.id, false)).toMatchObject({ featuredOnHome: false });
      const list = await repo.adminList({ q: 'admin touch', status: 'all', page: 1, pageSize: 10 });
      expect(list.items.map((row) => row.title)).toContain('Admin touch (fixed)');
      expect(list.counts.all).toBeGreaterThan(0);
      expect(await repo.remove(draft.record.id)).toBe(true);
      expect(await repo.adminGet(draft.record.id)).toBeNull();
    });

    it('turns an impression into a waiting Memory', async () => {
      const repo = await createRepo();
      const userId = author();
      const record = await repo.createFromImpression(
        userId,
        content({ title: 'From an impression' }),
        'impression',
        NOW,
      );
      expect(record).toMatchObject({ status: 'pending', source: 'impression', authorId: userId });
      expect(record.slug).toBeTruthy();
      expect((await repo.queue()).map((item) => item.id)).toContain(record.id);
    });
  });
}
