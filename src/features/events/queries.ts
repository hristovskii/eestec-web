import 'server-only';

import { accessTo, type Actor } from '@/features/auth';
import { getMediaItems } from '@/features/media/server';
import { getSiteSettings } from '@/features/settings/server';
import { now } from '@/shared/lib/now';

import { eventsAdminRepository, eventTaxonomyRepository } from './data';
import { newEventInput } from './domain/new-event';
import type { AdminEventsParams } from './schemas/admin-events-params.schema';
import type { EventDraftInput } from './schemas/event.schema';
import type { AdminEventsQuery, EventRecord } from './types';

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

/** /admin/events: one page of rows, the tab counts, and the choices of the filters. */
export async function listAdminEvents(actor: Actor, params: AdminEventsParams) {
  const [repo, taxonomy] = await Promise.all([eventsAdminRepository(), eventTaxonomyRepository()]);
  const [page, facets, types] = await Promise.all([
    repo.adminList(toQuery(actor, params)),
    repo.adminFacets({ onlyIds: onlyIdsFor(actor) }),
    taxonomy.list('types'),
  ]);
  const covers = await getMediaItems(page.items.flatMap((row) => (row.cover ? [row.cover.mediaId] : [])));
  return {
    page,
    years: facets.years,
    types: types.map(({ id, name }) => ({ id, name: name.mk })),
    covers: Object.fromEntries(covers.map((item) => [item.id, item])),
  };
}

/** Export CSV: every row that matches the filters (not just the page). */
export async function exportAdminEvents(actor: Actor, params: AdminEventsParams) {
  const repo = await eventsAdminRepository();
  const first = await repo.adminList({ ...toQuery(actor, params), page: 1, pageSize: 10_000 });
  return first.items;
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
  const media = await getMediaItems(mediaIdsOf(input));
  return {
    record: record satisfies EventRecord | null,
    input,
    media,
    types: types.map(({ id: typeId, name }) => ({ id: typeId, name })),
    topics: topics.map(({ id: topicId, name }) => ({ id: topicId, name })),
  };
}
