import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { isDataError, unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import type { RepoScope } from '@/shared/data/select-implementation';
import type { Localized } from '@/shared/types/localized';

import { eventTiming } from '../domain/event-timing';
import { isReachable, toDetail } from '../domain/public-event';
import type { AgendaItem, EventEditor, EventImage, EventRecord, EventTopic, EventType } from '../types';
import { createEventsReads, type EventsSnapshot } from './events-reads';
import type {
  EventInput,
  EventsRepository,
  EventTaxonomyRepository,
  TaxonomyKind,
} from './events.repository';

/**
 * The event columns a reader may select. `updated_by` is left out on purpose: the public roles have no
 * grant on it (0014); who saved last comes from `events_updated_by` for staff and the assigned manager.
 */
const EVENT_COLUMNS = [
  'id',
  'slug',
  'title',
  'short_description',
  'scope',
  'type_id',
  'starts_at',
  'ends_at',
  'all_day',
  'location',
  'city',
  'country',
  'organizer',
  'description',
  'agenda',
  'requirements',
  'fee',
  'contact_email',
  'participant_count',
  'country_count',
  'cover_media_id',
  'cover_alt',
  'cover_credit',
  'info_pack_id',
  'video_url',
  'status',
  'publish_at',
  'next_up',
  'applications_enabled',
  'apply_via',
  'external_url',
  'opens_at',
  'deadline',
  'results_on',
  'max_participants',
  'waitlist',
  'admission',
  'seo_title',
  'seo_description',
  'seo_share_media_id',
  'created_at',
  'updated_at',
].join(', ');

type EventRow = Omit<Tables<'events'>, 'updated_by' | 'is_sample'>;
type GalleryRow = { media_id: string; alt: string | null; credit: string | null };
const NO_EDITOR: EventEditor = { userId: '', name: '' };

function toRecord(
  row: EventRow,
  related: { topicIds: string[]; gallery: GalleryRow[]; partnerIds: string[] },
  editor: EventEditor,
): EventRecord {
  const image = (g: GalleryRow): EventImage => ({
    mediaId: g.media_id,
    alt: g.alt,
    ...(g.credit ? { credit: g.credit } : {}),
  });
  return {
    id: row.id,
    slug: row.slug,
    title: row.title as Localized,
    shortDescription: row.short_description as Localized,
    scope: row.scope,
    typeId: row.type_id,
    topicIds: related.topicIds,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    location: row.location as Localized,
    city: row.city as Localized,
    country: row.country as Localized,
    organizer: row.organizer,
    description: row.description as Localized,
    agenda: row.agenda as AgendaItem[],
    requirements: row.requirements as Localized,
    fee: row.fee as EventRecord['fee'],
    contactEmail: row.contact_email,
    participantCount: row.participant_count,
    countryCount: row.country_count,
    cover: row.cover_media_id
      ? {
          mediaId: row.cover_media_id,
          alt: row.cover_alt,
          ...(row.cover_credit ? { credit: row.cover_credit } : {}),
        }
      : null,
    gallery: related.gallery.map(image),
    infoPackId: row.info_pack_id,
    videoUrl: row.video_url,
    partnerIds: related.partnerIds,
    status: row.status,
    publishAt: row.publish_at,
    nextUp: row.next_up,
    applications: {
      enabled: row.applications_enabled,
      via: row.apply_via,
      externalUrl: row.external_url,
      opensAt: row.opens_at,
      deadline: row.deadline,
      resultsOn: row.results_on,
      maxParticipants: row.max_participants,
      waitlist: row.waitlist,
      admission: row.admission,
    },
    seo: {
      title: row.seo_title as Localized,
      description: row.seo_description as Localized,
      shareImageId: row.seo_share_media_id,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: editor,
  };
}

/** The columns `event_save` takes (a partial row, snake_case) plus the related lists. */
function toPayload(input: EventInput) {
  return {
    slug: input.slug,
    title: input.title,
    short_description: input.shortDescription,
    scope: input.scope,
    type_id: input.typeId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    all_day: input.allDay,
    location: input.location,
    city: input.city,
    country: input.country,
    organizer: input.organizer,
    description: input.description,
    agenda: input.agenda,
    requirements: input.requirements,
    fee: input.fee,
    contact_email: input.contactEmail,
    participant_count: input.participantCount,
    country_count: input.countryCount,
    cover_media_id: input.cover?.mediaId ?? null,
    cover_alt: input.cover?.alt ?? null,
    cover_credit: input.cover?.credit ?? null,
    info_pack_id: input.infoPackId,
    video_url: input.videoUrl,
    status: input.status,
    publish_at: input.publishAt,
    next_up: input.nextUp,
    applications_enabled: input.applications.enabled,
    apply_via: input.applications.via,
    external_url: input.applications.externalUrl,
    opens_at: input.applications.opensAt,
    deadline: input.applications.deadline,
    results_on: input.applications.resultsOn,
    max_participants: input.applications.maxParticipants,
    waitlist: input.applications.waitlist,
    admission: input.applications.admission,
    seo_title: input.seo.title,
    seo_description: input.seo.description,
    seo_share_media_id: input.seo.shareImageId,
    topic_ids: input.topicIds,
    partner_ids: input.partnerIds,
    gallery: input.gallery.map((image) => ({
      media_id: image.mediaId,
      alt: image.alt,
      credit: image.credit ?? null,
    })),
  };
}

/**
 * Events (`events` and its link tables, M19b). Reads load the rows the caller may see (RLS: a visitor gets
 * listed events, the board and the assigned manager more) and apply the same rules as the mock
 * (`createEventsReads`). Hidden events are reached by address through `event_by_slug` and
 * `resolve_event_address`, which are the only way a visitor can see them. Writes are `event_save`,
 * `set_event_status`, `remove_events` (events with applications stay), `slug_taken`.
 */
export function createSupabaseEventsRepository(
  client: DbClient,
  scope: RepoScope = 'public',
): EventsRepository {
  async function loadTypesAndTopics() {
    const [types, topics] = await Promise.all([
      client.from('event_types').select('id, name').order('sort_order'),
      client.from('event_topics').select('id, name').order('sort_order'),
    ]);
    return {
      types: unwrap(types).map((row): EventType => ({ id: row.id, name: row.name as Localized })),
      topics: unwrap(topics).map((row): EventTopic => ({ id: row.id, name: row.name as Localized })),
    };
  }

  async function loadSnapshot(): Promise<EventsSnapshot> {
    const [events, links, gallery, partners, lists] = await Promise.all([
      client.from('events').select(EVENT_COLUMNS).returns<EventRow[]>(),
      client.from('event_topic_links').select('event_id, topic_id'),
      client.from('event_gallery').select('event_id, media_id, alt, credit, sort_order').order('sort_order'),
      client.from('event_partners').select('event_id, sponsor_id, sort_order').order('sort_order'),
      loadTypesAndTopics(),
    ]);
    const rows = unwrap(events);
    const editors = new Map<string, EventEditor>();
    if (scope !== 'public' && rows.length > 0) {
      const named = await client.rpc('events_updated_by', { p_ids: rows.map((row) => row.id) });
      // A member's session is not allowed to ask: they just see no editor names.
      if (!named.error)
        for (const row of named.data) editors.set(row.event_id, { userId: row.user_id, name: row.name });
    }
    const group = <T extends { event_id: string }>(list: T[]) => {
      const map = new Map<string, T[]>();
      for (const item of list) map.set(item.event_id, [...(map.get(item.event_id) ?? []), item]);
      return map;
    };
    const topicsOf = group(unwrap(links));
    const galleryOf = group(unwrap(gallery));
    const partnersOf = group(unwrap(partners));
    return {
      events: rows.map((row) =>
        toRecord(
          row,
          {
            topicIds: (topicsOf.get(row.id) ?? []).map((link) => link.topic_id),
            gallery: galleryOf.get(row.id) ?? [],
            partnerIds: (partnersOf.get(row.id) ?? []).map((partner) => partner.sponsor_id),
          },
          editors.get(row.id) ?? NO_EDITOR,
        ),
      ),
      ...lists,
      redirects: {},
    };
  }

  const reads = createEventsReads(loadSnapshot);

  /** The event behind an address (current or old) as the database lets a visitor see it, hidden ones included. */
  async function byAddress(slug: string): Promise<EventRecord | null> {
    const found = unwrap(await client.rpc('event_by_slug', { p_slug: slug })) as
      (EventRow & { topics: string[]; gallery: GalleryRow[]; partners: string[] }) | null;
    if (!found) return null;
    return toRecord(
      found,
      { topicIds: found.topics, gallery: found.gallery, partnerIds: found.partners },
      NO_EDITOR,
    );
  }

  return {
    ...reads,

    async findBySlug(slug, context) {
      const event = await byAddress(slug);
      if (!event || event.slug !== slug || !isReachable(event, context.now)) return null;
      const { types } = await loadTypesAndTopics();
      return toDetail(event, {
        ...context,
        typeName: (id) => types.find((type) => type.id === id)?.name ?? { mk: '' },
      });
    },

    async resolveAddress(slug, now) {
      const target = unwrap(await client.rpc('resolve_event_address', { p_slug: slug })) as {
        slug: string;
      } | null;
      if (!target) return null;
      const event = await byAddress(target.slug);
      return event && isReachable(event, now) ? { slug: event.slug, timing: eventTiming(event, now) } : null;
    },

    async save(input, _editor, _now) {
      if (input.id !== undefined && !isUuid(input.id)) return { status: 'not_found' };
      let id: string | null;
      try {
        id = unwrapMaybe(
          await client.rpc('event_save', {
            // null creates (the generated type does not know the argument may be null)
            p_id: (input.id ?? null) as string,
            p_data: toJson(toPayload(input)),
          }),
        );
      } catch (error) {
        if (isDataError(error, 'conflict')) return { status: 'slug_taken' };
        throw error;
      }
      if (!id) return { status: 'not_found' };
      const record = await reads.get(id);
      if (!record) return { status: 'not_found' };
      return { status: 'saved', record };
    },

    async setStatus(ids, status) {
      const known = ids.filter(isUuid);
      if (known.length === 0) return [];
      return unwrap(await client.rpc('set_event_status', { p_ids: known, p_status: status }));
    },

    async remove(ids) {
      const known = ids.filter(isUuid);
      if (known.length === 0) return [];
      return unwrap(await client.rpc('remove_events', { p_ids: known }));
    },

    async slugTaken(slug, exceptId) {
      return unwrap(
        await client.rpc('slug_taken', { p_slug: slug, p_except: isUuid(exceptId) ? exceptId : undefined }),
      );
    },
  };
}

type TaxonomyItem = EventType | EventTopic;
const TABLES = { types: 'event_types', topics: 'event_topics' } as const;

/** Types and topics (`event_types`, `event_topics`); usage counts are computed from the events and their links. */
export function createSupabaseEventTaxonomyRepository(client: DbClient): EventTaxonomyRepository {
  const table = (kind: TaxonomyKind) => TABLES[kind];

  async function items(kind: TaxonomyKind): Promise<TaxonomyItem[]> {
    return unwrap(await client.from(table(kind)).select('id, name').order('sort_order')).map((row) => ({
      id: row.id,
      name: row.name as Localized,
    }));
  }

  async function usage(kind: TaxonomyKind): Promise<Map<string, number>> {
    const rows =
      kind === 'types'
        ? unwrap(await client.from('events').select('type_id')).map((row) => row.type_id)
        : unwrap(await client.from('event_topic_links').select('topic_id')).map((row) => row.topic_id);
    const counts = new Map<string, number>();
    for (const id of rows) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }

  return {
    async list(kind) {
      const [all, counts] = await Promise.all([items(kind), usage(kind)]);
      return all.map((item) => ({ ...item, eventCount: counts.get(item.id) ?? 0 }));
    },

    async create(kind, name) {
      const row = unwrap(
        await client
          .from(table(kind))
          .insert({ name: toJson(name) })
          .select('id, name')
          .single(),
      );
      return { id: row.id, name: row.name as Localized };
    },

    async rename(kind, id, name) {
      if (!isUuid(id)) return null;
      const row = unwrapMaybe(
        await client
          .from(table(kind))
          .update({ name: toJson(name) })
          .eq('id', id)
          .select('id, name')
          .maybeSingle(),
      );
      return row ? { id: row.id, name: row.name as Localized } : null;
    },

    async reorder(kind, ids) {
      if (!ids.every(isUuid)) return false;
      return unwrap(await client.rpc('reorder_event_taxonomy', { p_kind: kind, p_ids: [...ids] })) === true;
    },

    async remove(kind, id, replacementId) {
      if (!isUuid(id)) return { status: 'not_found' };
      const existing = unwrapMaybe(await client.from(table(kind)).select('id').eq('id', id).maybeSingle());
      if (!existing) return { status: 'not_found' };
      if (kind === 'topics') {
        unwrap(await client.rpc('remove_event_topic', { p_id: id }));
        return { status: 'removed' };
      }
      const used = (await usage('types')).get(id) ?? 0;
      const replacement = isUuid(replacementId) && replacementId !== id ? replacementId : undefined;
      if (used > 0) {
        const valid =
          replacement &&
          unwrapMaybe(await client.from('event_types').select('id').eq('id', replacement).maybeSingle());
        if (!valid) return { status: 'replacement_required', eventCount: used };
      }
      unwrap(await client.rpc('remove_event_type', { p_id: id, p_replacement: replacement }));
      return { status: 'removed' };
    },
  };
}
