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
    admission: 'selection',
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
      // Upcoming (December): the old address points at the new one, still under /upcoming.
      expect(await repo.resolveAddress(event.slug, NOW)).toEqual({ slug: renamed, timing: 'upcoming' });
      expect(await repo.resolveAddress(renamed, NOW)).toEqual({ slug: renamed, timing: 'upcoming' });
      // The old address now belongs to this event: nobody else can take it.
      expect(await repo.slugTaken(event.slug)).toBe(true);
      expect(await repo.slugTaken(event.slug, event.id)).toBe(false);
    });

    it('does not keep redirects for drafts', async () => {
      const repo = await createRepo();
      const event = await create(repo);
      await repo.save({ ...eventInput({ slug: `${event.slug}-x` }), id: event.id }, editor, NOW);
      expect(await repo.resolveAddress(event.slug, NOW)).toBeNull();
    });

    it('changes the status of several events at once', async () => {
      const repo = await createRepo();
      const a = await create(repo);
      const b = await create(repo, { status: 'hidden' });
      const changed = await repo.setStatus([a.id, b.id], 'hidden', editor, NOW);
      expect(changed).toEqual([a.id]);
      expect((await repo.get(a.id))?.status).toBe('hidden');
    });

    const context = { locale: 'en' as const, now: NOW, justEndedDays: 14 };
    const archiveQuery = (patch: Partial<Parameters<EventsRepository['listArchive']>[0]> = {}) => ({
      scope: 'local' as const,
      sort: 'newest' as const,
      page: 1,
      pageSize: 100,
      ...context,
      ...patch,
    });
    const past = (day: string, patch: Partial<EventInput> = {}) =>
      eventInput({
        status: 'published',
        startsAt: `${day}T10:00:00+02:00`,
        endsAt: `${day}T18:00:00+02:00`,
        ...patch,
      });

    it('lists only past, published events of a category in the archive, newest first', async () => {
      const repo = await createRepo();
      const marker = `Archive ${unique()}`;
      const make = async (patch: Partial<EventInput>) =>
        (await repo.save(past('2026-06-01', { title: { mk: marker }, ...patch }), editor, NOW)).status;
      await make({ startsAt: '2026-06-02T10:00:00+02:00', endsAt: '2026-06-02T18:00:00+02:00' });
      await make({});
      await make({ status: 'draft' });
      await make({ status: 'hidden' });
      await make({ scope: 'international' });
      await make({ publishAt: '2027-01-01T00:00:00+01:00' });
      await make({ startsAt: '2026-12-01T10:00:00+01:00', endsAt: '2026-12-01T18:00:00+01:00' });

      const { items } = await repo.listArchive(archiveQuery({ q: marker.toLowerCase() }));
      expect(items.map((event) => event.startsAt)).toEqual([
        '2026-06-02T10:00:00+02:00',
        '2026-06-01T10:00:00+02:00',
      ]);
      const all = await repo.listArchive(archiveQuery());
      expect(all.items.every((event) => Date.parse(event.endsAt) < NOW.getTime())).toBe(true);
      const oldest = await repo.listArchive(archiveQuery({ q: marker.toLowerCase(), sort: 'oldest' }));
      expect(oldest.items[0]?.startsAt).toBe('2026-06-01T10:00:00+02:00');
    });

    it('filters the archive by type and year and counts both categories', async () => {
      const repo = await createRepo();
      const marker = `Facet ${unique()}`;
      await repo.save(past('2019-03-01', { title: { mk: marker }, typeId: 'type-social' }), editor, NOW);
      const byYear = await repo.listArchive(
        archiveQuery({ q: marker.toLowerCase(), year: 2019, typeId: 'type-social' }),
      );
      expect(byYear.total).toBe(1);
      expect((await repo.listArchive(archiveQuery({ q: marker.toLowerCase(), year: 2020 }))).total).toBe(0);
      const facets = await repo.archiveFacets({ now: NOW });
      expect(facets.years).toContain(2019);
      expect(facets.years).toEqual([...facets.years].sort((a, b) => b - a));
      const local = await repo.listArchive(archiveQuery());
      expect(facets.counts.local).toBe(local.total);
    });

    it('finds published and hidden events by address, never drafts', async () => {
      const repo = await createRepo();
      const published = await create(repo, { ...past('2026-05-01'), title: { mk: 'Македонски', en: '' } });
      const hidden = await create(repo, { ...past('2026-05-01'), status: 'hidden' });
      const draft = await create(repo, { ...past('2026-05-01'), status: 'draft' });
      const detail = await repo.findBySlug(published.slug, context);
      // English falls back to Macedonian, and says so.
      expect(detail?.title).toEqual({ text: 'Македонски', lang: 'mk' });
      expect(detail?.timing).toBe('past');
      expect(await repo.findBySlug(hidden.slug, context)).not.toBeNull();
      expect(await repo.findBySlug(draft.slug, context)).toBeNull();
      expect(await repo.findBySlug('no-such-event', context)).toBeNull();
    });

    it('lifts the first heading of the description and drops images without alt text', async () => {
      const repo = await createRepo();
      const event = await create(repo, {
        ...past('2026-05-01'),
        description: { mk: '<h3>About the lecture</h3><p>Text</p>' },
        cover: { mediaId: 'media-soft-skills', alt: null },
        gallery: [
          { mediaId: 'media-power-up', alt: 'Solar plant' },
          { mediaId: 'media-career-day', alt: null },
        ],
      });
      const detail = await repo.findBySlug(event.slug, context);
      expect(detail?.aboutTitle?.text).toBe('About the lecture');
      expect(detail?.description.text).toBe('<p>Text</p>');
      expect(detail?.cover).toBeNull();
      expect(detail?.gallery.map((photo) => photo.mediaId)).toEqual(['media-power-up']);
    });

    it('links to the previous and next event in the archive', async () => {
      const repo = await createRepo();
      const middle = await create(repo, past('2013-06-15'));
      const { prev, next } = await repo.findAdjacent(middle.slug, context);
      if (prev) expect(Date.parse(prev.startsAt)).toBeLessThanOrEqual(Date.parse(middle.startsAt));
      if (next) expect(Date.parse(next.startsAt)).toBeGreaterThan(Date.parse(middle.startsAt));
      expect(await repo.archiveSlugs(NOW)).toContain(middle.slug);
    });

    it('lists upcoming events soonest first, until they end', async () => {
      const repo = await createRepo();
      const marker = `Upcoming ${unique()}`;
      const at = (day: string, patch: Partial<EventInput> = {}) =>
        create(repo, {
          status: 'published',
          title: { mk: marker },
          startsAt: `${day}T10:00:00+01:00`,
          endsAt: `${day}T18:00:00+01:00`,
          ...patch,
        });
      const later = await at('2026-12-20', { nextUp: true });
      const sooner = await at('2026-11-20');
      // Started yesterday, ends next week: still upcoming.
      const ongoing = await at('2026-10-03', { endsAt: '2026-10-10T18:00:00+02:00' });
      await at('2026-11-21', { status: 'draft' });
      await at('2026-11-22', { status: 'hidden' });
      await at('2026-09-01', { endsAt: '2026-09-01T18:00:00+02:00' });

      const mine = (await repo.listUpcoming(context)).filter((event) => event.title.text === marker);
      expect(mine.map((event) => event.id)).toEqual([ongoing.id, sooner.id, later.id]);
      expect(mine.at(-1)?.nextUp).toBe(true);
      expect(mine[0]?.applications).toEqual(eventInput().applications);
      expect(await repo.upcomingSlugs(NOW)).toEqual(expect.arrayContaining([sooner.slug, later.slug]));
      expect(await repo.archiveSlugs(NOW)).not.toContain(sooner.slug);
    });

    it('resolves public addresses to where the event lives now', async () => {
      const repo = await createRepo();
      const upcoming = await create(repo, { status: 'published' });
      const pastEvent = await create(repo, past('2026-05-01'));
      const hidden = await create(repo, { ...past('2026-05-01'), status: 'hidden' });
      const draft = await create(repo, { status: 'draft' });
      expect(await repo.resolveAddress(upcoming.slug, NOW)).toEqual({
        slug: upcoming.slug,
        timing: 'upcoming',
      });
      expect(await repo.resolveAddress(pastEvent.slug, NOW)).toEqual({
        slug: pastEvent.slug,
        timing: 'past',
      });
      expect(await repo.resolveAddress(hidden.slug, NOW)).toEqual({ slug: hidden.slug, timing: 'past' });
      expect(await repo.resolveAddress(draft.slug, NOW)).toBeNull();
      expect(await repo.resolveAddress('no-such-event', NOW)).toBeNull();
    });

    it('gives the upcoming page its programme, requirements, fee and application settings', async () => {
      const repo = await createRepo();
      const event = await create(repo, {
        status: 'published',
        agenda: [
          { id: 'a1', date: '2026-12-01', title: { mk: 'Ден 1', en: 'Day one' }, text: { mk: 'Текст' } },
        ],
        requirements: { mk: '<ul><li><p>Students</p></li></ul><script>x</script>' },
        fee: { price: { mk: '€60' }, note: { mk: 'Covers meals.' } },
        contactEmail: 'team@eestec.mk',
      });
      const detail = await repo.findBySlug(event.slug, context);
      expect(detail?.timing).toBe('upcoming');
      expect(detail?.agenda).toEqual([
        {
          id: 'a1',
          date: '2026-12-01',
          title: { text: 'Day one', lang: 'en' },
          text: { text: 'Текст', lang: 'mk' },
        },
      ]);
      expect(detail?.requirements.text).toBe('<ul><li><p>Students</p></li></ul>');
      expect(detail?.fee.price.text).toBe('€60');
      expect(detail?.contactEmail).toBe('team@eestec.mk');
      expect(detail?.applications).toEqual(event.applications);
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
