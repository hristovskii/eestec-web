import { describe, expect, it } from 'vitest';

import type { AdminEventsQuery, EventRecord } from '../types';
import type { EventInput, EventsRepository, EventTaxonomyRepository } from './events.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test creates what it
// changes, so the suite works on a shared, seeded database.

const NOW = new Date('2026-10-04T18:18:00+02:00');
const editor = { userId: 'u-test', name: 'Test Editor' };
const query = (patch: Partial<AdminEventsQuery> = {}): AdminEventsQuery => ({
  sort: 'smart',
  page: 1,
  pageSize: 50,
  now: NOW,
  ...patch,
});

const unique = () => crypto.randomUUID().slice(0, 8);

export const eventInput = (patch: Partial<EventInput> = {}): EventInput => ({
  slug: `contract-${unique()}`,
  title: { mk: 'Contract test event' },
  shortDescription: { mk: 'A short description.' },
  scope: 'local',
  typeId: 'type-workshop',
  topicIds: [],
  startsAt: '2026-12-01T10:00:00+01:00',
  endsAt: '2026-12-01T18:00:00+01:00',
  allDay: false,
  location: { mk: 'Skopje' },
  city: { mk: '' },
  country: { mk: '' },
  organizer: null,
  description: { mk: '<p>Text</p>' },
  agenda: [],
  requirements: { mk: '' },
  fee: { price: { mk: '' }, note: { mk: '' } },
  contactEmail: '',
  participantCount: null,
  countryCount: null,
  cover: null,
  gallery: [],
  infoPackId: null,
  videoUrl: '',
  status: 'draft',
  publishAt: null,
  nextUp: false,
  applications: {
    enabled: false,
    via: 'form',
    externalUrl: '',
    opensAt: null,
    deadline: null,
    resultsOn: null,
    maxParticipants: 24,
    waitlist: true,
  },
  seo: { title: { mk: '' }, description: { mk: '' }, shareImageId: null },
  ...patch,
});

async function create(repo: EventsRepository, patch: Partial<EventInput> = {}): Promise<EventRecord> {
  const result = await repo.save(eventInput(patch), editor, NOW);
  if (result.status !== 'saved') throw new Error(`could not create: ${result.status}`);
  return result.record;
}

export function describeEventsRepository(
  name: string,
  createRepo: () => EventsRepository | Promise<EventsRepository>,
) {
  describe(`EventsRepository (${name})`, () => {
    it('lists every event as a choice, newest first', async () => {
      const options = await (await createRepo()).listOptions();
      expect(options.length).toBeGreaterThan(0);
      const times = options.map((option) => Date.parse(option.startsAt));
      expect(times).toEqual([...times].sort((a, b) => b - a));
      expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    });

    it('splits upcoming and past by the end date', async () => {
      const repo = await createRepo();
      const all = await repo.adminList(query());
      expect(all.counts.all).toBe(all.counts.upcoming + all.counts.past);
      const upcoming = await repo.adminList(query({ timing: 'upcoming' }));
      expect(upcoming.items.every((row) => Date.parse(row.endsAt) >= NOW.getTime())).toBe(true);
      const past = await repo.adminList(query({ timing: 'past' }));
      expect(past.items.every((row) => row.timing === 'past')).toBe(true);
    });

    it('lists upcoming soonest first, then past newest first, by default', async () => {
      const { items } = await (await createRepo()).adminList(query());
      const firstPast = items.findIndex((row) => row.timing === 'past');
      const upcoming = items.slice(0, firstPast < 0 ? undefined : firstPast);
      const past = firstPast < 0 ? [] : items.slice(firstPast);
      expect(past.every((row) => row.timing === 'past')).toBe(true);
      const starts = (rows: typeof items) => rows.map((row) => Date.parse(row.startsAt));
      expect(starts(upcoming)).toEqual([...starts(upcoming)].sort((a, b) => a - b));
      expect(starts(past)).toEqual([...starts(past)].sort((a, b) => b - a));
    });

    it('filters by search, status, type, year and category', async () => {
      const repo = await createRepo();
      const event = await create(repo, {
        title: { mk: `Filterable ${unique()}` },
        scope: 'international',
        startsAt: '2031-05-01T10:00:00+02:00',
        endsAt: '2031-05-02T10:00:00+02:00',
      });
      const match = await repo.adminList(
        query({
          q: event.title.mk.toLowerCase(),
          status: 'draft',
          typeId: 'type-workshop',
          year: 2031,
          scope: 'international',
        }),
      );
      expect(match.items.map((row) => row.id)).toEqual([event.id]);
      expect((await repo.adminList(query({ q: event.slug }))).items.map((row) => row.id)).toEqual([event.id]);
      expect((await repo.adminList(query({ q: event.slug, scope: 'local' }))).total).toBe(0);
      expect((await repo.adminFacets({})).years).toContain(2031);
    });

    it('limits event managers to their events', async () => {
      const repo = await createRepo();
      const event = await create(repo);
      const list = await repo.adminList(query({ onlyIds: [event.id] }));
      expect(list.items.map((row) => row.id)).toEqual([event.id]);
      expect(list.counts.all).toBe(1);
    });

    it('creates, reads and updates an event', async () => {
      const repo = await createRepo();
      const event = await create(repo, { title: { mk: 'Прва', en: 'First' } });
      expect(await repo.get(event.id)).toEqual(event);
      const result = await repo.save(
        { ...eventInput({ slug: event.slug }), id: event.id, title: { mk: 'Втора' } },
        editor,
        NOW,
      );
      expect(result.status).toBe('saved');
      expect((await repo.get(event.id))?.title).toEqual({ mk: 'Втора' });
      expect((await repo.get(event.id))?.updatedBy).toEqual(editor);
    });

    it('keeps page addresses unique', async () => {
      const repo = await createRepo();
      const event = await create(repo);
      expect(await repo.slugTaken(event.slug)).toBe(true);
      expect(await repo.slugTaken(event.slug, event.id)).toBe(false);
      expect((await repo.save(eventInput({ slug: event.slug }), editor, NOW)).status).toBe('slug_taken');
    });

    it('keeps the old address of a published event as a redirect', async () => {
      const repo = await createRepo();
      const event = await create(repo, { status: 'published' });
      const renamed = `${event.slug}-renamed`;
      await repo.save({ ...eventInput({ slug: renamed, status: 'published' }), id: event.id }, editor, NOW);
      expect(await repo.redirectFor(event.slug)).toBe(renamed);
      // The old address now belongs to this event: nobody else can take it.
      expect(await repo.slugTaken(event.slug)).toBe(true);
      expect(await repo.slugTaken(event.slug, event.id)).toBe(false);
    });

    it('does not keep redirects for drafts', async () => {
      const repo = await createRepo();
      const event = await create(repo);
      await repo.save({ ...eventInput({ slug: `${event.slug}-x` }), id: event.id }, editor, NOW);
      expect(await repo.redirectFor(event.slug)).toBeNull();
    });

    it('changes the status of several events at once', async () => {
      const repo = await createRepo();
      const a = await create(repo);
      const b = await create(repo, { status: 'hidden' });
      const changed = await repo.setStatus([a.id, b.id], 'hidden', editor, NOW);
      expect(changed).toEqual([a.id]);
      expect((await repo.get(a.id))?.status).toBe('hidden');
    });

    it('deletes events', async () => {
      const repo = await createRepo();
      const event = await create(repo);
      expect(await repo.remove([event.id, 'unknown'])).toEqual([event.id]);
      expect(await repo.get(event.id)).toBeNull();
      expect(await repo.slugTaken(event.slug)).toBe(false);
    });
  });
}

export function describeEventTaxonomyRepository(
  name: string,
  createRepos: () => Promise<{ events: EventsRepository; taxonomy: EventTaxonomyRepository }>,
) {
  describe(`EventTaxonomyRepository (${name})`, () => {
    it('lists the types with how many events use them', async () => {
      const { taxonomy } = await createRepos();
      const types = await taxonomy.list('types');
      expect(types.length).toBeGreaterThan(0);
      expect(types.every((type) => type.eventCount >= 0)).toBe(true);
    });

    it('adds, renames and reorders', async () => {
      const { taxonomy } = await createRepos();
      const topic = await taxonomy.create('topics', { mk: 'Квантно', en: 'Quantum' });
      expect(await taxonomy.rename('topics', topic.id, { mk: 'Квант' })).toEqual({
        id: topic.id,
        name: { mk: 'Квант' },
      });
      const ids = (await taxonomy.list('topics')).map((item) => item.id);
      const reversed = [...ids].reverse();
      expect(await taxonomy.reorder('topics', reversed)).toBe(true);
      expect((await taxonomy.list('topics')).map((item) => item.id)).toEqual(reversed);
      expect(await taxonomy.reorder('topics', reversed.slice(1))).toBe(false);
    });

    it('needs a replacement before removing a type in use', async () => {
      const { events, taxonomy } = await createRepos();
      const type = await taxonomy.create('types', { mk: 'Привремен' });
      const event = await create(events, { typeId: type.id });
      expect(await taxonomy.remove('types', type.id)).toEqual({
        status: 'replacement_required',
        eventCount: 1,
      });
      expect(await taxonomy.remove('types', type.id, 'type-workshop')).toEqual({ status: 'removed' });
      expect((await events.get(event.id))?.typeId).toBe('type-workshop');
      expect((await taxonomy.list('types')).some((item) => item.id === type.id)).toBe(false);
    });

    it('takes a removed topic off its events', async () => {
      const { events, taxonomy } = await createRepos();
      const topic = await taxonomy.create('topics', { mk: 'Тема' });
      const event = await create(events, { topicIds: [topic.id] });
      expect(await taxonomy.remove('topics', topic.id)).toEqual({ status: 'removed' });
      expect((await events.get(event.id))?.topicIds).toEqual([]);
    });
  });
}
