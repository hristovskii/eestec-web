import 'server-only';

import { accessTo, type Actor } from '@/features/auth';
import { getMediaItems } from '@/features/media/server';
import { listSponsorOptions } from '@/features/partners/server';
import { getSiteSettings } from '@/features/settings/server';
import { now } from '@/shared/lib/now';
import { slugify } from '@/shared/lib/slug';

import { eventsAdminRepository, eventTaxonomyRepository } from './data';
import { newEventInput } from './domain/new-event';
import type { AdminEventsParams } from './schemas/admin-events-params.schema';
import type { EventDraftInput } from './schemas/event.schema';
import type {
  AdminEventRow,
  AdminEventsQuery,
  ApplicationCountsLoader,
  EventEditor,
  EventRecord,
} from './types';

/** Every event as a choice (admin forms: "Events they manage"). */
export async function listEventOptions() {
  return (await eventsAdminRepository()).listOptions();
}

/** Event managers see only the events they manage (D18). */
const onlyIdsFor = (actor: Actor) =>
  accessTo(actor, 'events') === 'own' ? (actor.managedEventIds ?? []) : undefined;

const toQuery = (actor: Actor, params: AdminEventsParams): AdminEventsQuery => ({
  timing: params.tab,
  q: params.q,
  status: params.status,
  typeId: params.type,
  year: params.year,
  scope: params.scope,
  onlyIds: onlyIdsFor(actor),
  sort: params.sort ?? 'smart',
  page: params.page,
  pageSize: params.size,
  now: now(),
});

/** Fills the Applications column; events with applications keep their count after switching them off. */
async function withCounts(rows: AdminEventRow[], loadCounts?: ApplicationCountsLoader) {
  if (!loadCounts) return rows;
  const counts = await loadCounts(rows);
  return rows.map((row): AdminEventRow => {
    const found = counts[row.id];
    if (row.applications.kind === 'external' || !found) return row;
    if (found.count === 0 && row.applications.kind === 'none') return row;
    return { ...row, applications: { kind: 'count', ...found } };
  });
}

/** /admin/events: one page of rows, the tab counts, and the choices of the filters. */
export async function listAdminEvents(
  actor: Actor,
  params: AdminEventsParams,
  loadCounts?: ApplicationCountsLoader,
) {
  const [repo, taxonomy] = await Promise.all([eventsAdminRepository(), eventTaxonomyRepository()]);
  const [page, facets, types] = await Promise.all([
    repo.adminList(toQuery(actor, params)),
    repo.adminFacets({ onlyIds: onlyIdsFor(actor) }),
    taxonomy.list('types'),
  ]);
  const [items, covers] = await Promise.all([
    withCounts(page.items, loadCounts),
    getMediaItems(page.items.flatMap((row) => (row.cover ? [row.cover.mediaId] : []))),
  ]);
  return {
    page: { ...page, items },
    years: facets.years,
    types: types.map(({ id, name }) => ({ id, name: name.mk })),
    covers: Object.fromEntries(covers.map((item) => [item.id, item])),
  };
}

/** Export CSV: every row that matches the filters (not just the page). */
export async function exportAdminEvents(
  actor: Actor,
  params: AdminEventsParams,
  loadCounts?: ApplicationCountsLoader,
) {
  const repo = await eventsAdminRepository();
  const first = await repo.adminList({ ...toQuery(actor, params), page: 1, pageSize: 10_000 });
  return withCounts(first.items, loadCounts);
}

/**
 * Events that take (or took) applications on this site, for Admin › Applications: every row,
 * event managers only theirs (D18).
 */
export async function listApplicationEvents(actor: Actor) {
  const repo = await eventsAdminRepository();
  const all = await repo.adminList({
    onlyIds: accessTo(actor, 'applications') === 'own' ? (actor.managedEventIds ?? []) : undefined,
    sort: 'smart',
    page: 1,
    pageSize: 10_000,
    now: now(),
  });
  return all.items.filter((row) => row.applicationSettings.via === 'form');
}

/** Event types or topics with how many events use each (Event types & topics). */
export async function listEventTaxonomy() {
  const taxonomy = await eventTaxonomyRepository();
  const [types, topics] = await Promise.all([taxonomy.list('types'), taxonomy.list('topics')]);
  return { types, topics };
}

/** The Media library files an event uses (cover, gallery, info pack, share image). */
const mediaIdsOf = (event: EventDraftInput) => [
  ...(event.cover ? [event.cover.mediaId] : []),
  ...event.gallery.map((photo) => photo.mediaId),
  ...(event.infoPackId ? [event.infoPackId] : []),
  ...(event.seo.shareImageId ? [event.seo.shareImageId] : []),
];

/**
 * Everything the edit form needs: the event (or a new draft with the Settings defaults), the
 * files it uses, and the types and topics to choose from. Callers check the permission.
 */
export async function getEventEditor(id: string | null) {
  const [repo, taxonomy] = await Promise.all([eventsAdminRepository(), eventTaxonomyRepository()]);
  const [record, types, topics] = await Promise.all([
    id ? repo.get(id) : Promise.resolve(null),
    taxonomy.list('types'),
    taxonomy.list('topics'),
  ]);
  if (id && !record) return null;

  let input: EventDraftInput;
  if (record) {
    const { id: _id, createdAt: _c, updatedAt: _u, updatedBy: _b, ...fields } = record;
    input = fields;
  } else {
    const { events } = await getSiteSettings('en');
    input = newEventInput(now(), {
      typeId: types[0]?.id ?? '',
      maxParticipants: events.defaultMaxParticipants,
      waitlist: events.defaultWaitlistEnabled,
    });
  }
  const [media, partners] = await Promise.all([getMediaItems(mediaIdsOf(input)), listSponsorOptions()]);
  return {
    record: record satisfies EventRecord | null,
    input,
    media,
    types: types.map(({ id: typeId, name }) => ({ id: typeId, name })),
    topics: topics.map(({ id: topicId, name }) => ({ id: topicId, name })),
    /** The sponsors to pick the event's partners from. */
    partners,
  };
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A draft event made from an accepted idea ("Accept and create event draft"): the idea's title and
 * text, dates for tomorrow (a draft needs a valid pair), nothing public. The caller checked that
 * the person may create events. null: the draft could not be saved.
 */
export async function createEventDraft(
  input: { title: string; description: string },
  editor: EventEditor,
): Promise<{ id: string; slug: string } | null> {
  const [repo, taxonomy, { events }] = await Promise.all([
    eventsAdminRepository(),
    eventTaxonomyRepository(),
    getSiteSettings('en'),
  ]);
  const types = await taxonomy.list('types');
  const base = newEventInput(now(), {
    typeId: types[0]?.id ?? '',
    maxParticipants: events.defaultMaxParticipants,
    waitlist: events.defaultWaitlistEnabled,
  });
  const title = input.title.trim().slice(0, 120);
  let slug = slugify(title) || 'idea';
  const first = slug;
  for (let n = 2; await repo.slugTaken(slug); n += 1) slug = `${first.slice(0, 70)}-${n}`;
  const paragraphs = input.description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const result = await repo.save(
    {
      ...base,
      slug,
      title: { mk: title },
      shortDescription: { mk: input.description.replace(/\s+/g, ' ').trim().slice(0, 160) },
      description: { mk: paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('') },
    },
    editor,
    now(),
  );
  return result.status === 'saved' ? { id: result.record.id, slug } : null;
}
