import 'server-only';

import { paginate } from '@/shared/data/paged';
import { yearInSkopje } from '@/shared/i18n/format';
import { resolveLocalized } from '@/shared/i18n/localized';

import { eventTiming } from '../domain/event-timing';
import {
  isListed,
  isReachable,
  toDetail,
  toLink,
  toSummary,
  toUpcomingSummary,
} from '../domain/public-event';
import type { AdminEventRow, ApplicationsSummary, EventRecord, EventTopic, EventType } from '../types';
import type { EventsAdminRepository, EventsPublicRepository } from './events.repository';

/** Everything the read side works on: the events with their types, topics and kept old addresses. */
export type EventsSnapshot = {
  events: EventRecord[];
  types: EventType[];
  topics: EventTopic[];
  /** Old slug → event id. */
  redirects: Record<string, string>;
};

export const byStart = (a: EventRecord, b: EventRecord) => Date.parse(a.startsAt) - Date.parse(b.startsAt);

/** The Applications column before counting (the applications feature fills in the numbers). */
function applicationsOf(event: EventRecord): ApplicationsSummary {
  const { enabled, via } = event.applications;
  if (!enabled) return { kind: 'none' };
  return via === 'external' ? { kind: 'external' } : { kind: 'count', count: 0, full: false };
}

export type EventsReads = EventsPublicRepository &
  Pick<EventsAdminRepository, 'listOptions' | 'adminList' | 'adminFacets' | 'get'>;

/**
 * Every read of the events repositories as pure logic over a snapshot: the mock hands it its in-memory
 * tables, the Supabase repository the rows it loaded. One implementation of the rules (listed, upcoming or
 * past, archive order, filters, sorting, paging) for both.
 */
export function createEventsReads(load: () => EventsSnapshot | Promise<EventsSnapshot>): EventsReads {
  const typeName = (db: EventsSnapshot, id: string) => {
    const type = db.types.find((candidate) => candidate.id === id);
    return type ? resolveLocalized(type.name, 'mk') : '—';
  };
  const typeLocalized = (db: EventsSnapshot) => (id: string) =>
    db.types.find((candidate) => candidate.id === id)?.name ?? { mk: '' };
  /** Listed upcoming events, soonest first. */
  const upcoming = (db: EventsSnapshot, now: Date) =>
    db.events.filter((event) => isListed(event, now) && eventTiming(event, now) === 'upcoming').sort(byStart);
  /** Listed past events, newest first. */
  const archive = (db: EventsSnapshot, now: Date) =>
    db.events
      .filter((event) => isListed(event, now) && eventTiming(event, now) === 'past')
      .sort((a, b) => byStart(b, a));

  return {
    async listArchive(query) {
      const db = await load();
      const context = { ...query, typeName: typeLocalized(db) };
      const needle = query.q?.toLocaleLowerCase(query.locale);
      const rows = archive(db, query.now)
        .filter(
          (event) =>
            (!query.scope || event.scope === query.scope) &&
            (!query.typeId || event.typeId === query.typeId) &&
            (!query.year || yearInSkopje(event.startsAt) === query.year),
        )
        .map((event) => toSummary(event, context))
        .filter((summary) => !needle || summary.title.text.toLocaleLowerCase(query.locale).includes(needle));
      const sorted =
        query.sort === 'oldest'
          ? [...rows].reverse()
          : query.sort === 'title'
            ? [...rows].sort((a, b) => a.title.text.localeCompare(b.title.text, query.locale))
            : rows;
      return paginate(sorted, query.page, query.pageSize);
    },

    async archiveFacets({ now }) {
      const past = archive(await load(), now);
      const years = [...new Set(past.map((event) => yearInSkopje(event.startsAt)))].sort((a, b) => b - a);
      return {
        counts: {
          local: past.filter((event) => event.scope === 'local').length,
          international: past.filter((event) => event.scope === 'international').length,
        },
        years,
        firstYear: years.at(-1) ?? null,
      };
    },

    async listUpcoming(context) {
      const db = await load();
      return upcoming(db, context.now).map((event) =>
        toUpcomingSummary(event, { ...context, typeName: typeLocalized(db) }),
      );
    },

    async listByIds(ids, context) {
      const db = await load();
      const wanted = new Set(ids);
      return db.events
        .filter((event) => wanted.has(event.id) && isListed(event, context.now))
        .sort((a, b) => byStart(b, a))
        .map((event) => ({
          ...toSummary(event, { ...context, typeName: typeLocalized(db) }),
          timing: eventTiming(event, context.now),
        }));
    },

    async listStarted(context) {
      const db = await load();
      return db.events
        .filter(
          (event) => isListed(event, context.now) && Date.parse(event.startsAt) <= context.now.getTime(),
        )
        .sort((a, b) => byStart(b, a))
        .map((event) => ({
          id: event.id,
          slug: event.slug,
          title: resolveLocalized(event.title, context.locale),
          startsAt: event.startsAt,
          city: resolveLocalized(event.city, context.locale),
          country: resolveLocalized(event.country, context.locale),
        }));
    },

    async upcomingSlugs(now) {
      return upcoming(await load(), now).map((event) => event.slug);
    },

    async resolveAddress(slug, now) {
      const db = await load();
      const event =
        db.events.find((candidate) => candidate.slug === slug) ??
        db.events.find((candidate) => candidate.id === db.redirects[slug]);
      return event && isReachable(event, now) ? { slug: event.slug, timing: eventTiming(event, now) } : null;
    },

    async findBySlug(slug, context) {
      const db = await load();
      const event = db.events.find((candidate) => candidate.slug === slug);
      return event && isReachable(event, context.now)
        ? toDetail(event, { ...context, typeName: typeLocalized(db) })
        : null;
    },

    async findAdjacent(slug, { locale, now }) {
      const db = await load();
      const event = db.events.find((candidate) => candidate.slug === slug);
      if (!event) return { prev: null, next: null };
      const others = archive(db, now).filter((other) => other.id !== event.id);
      const start = Date.parse(event.startsAt);
      // Archive order is newest first: "previous" is the next older one.
      const prev = others.find((other) => Date.parse(other.startsAt) <= start) ?? null;
      const next = [...others].reverse().find((other) => Date.parse(other.startsAt) > start) ?? null;
      return { prev: prev && toLink(prev, locale), next: next && toLink(next, locale) };
    },

    async archiveSlugs(now) {
      return archive(await load(), now).map((event) => event.slug);
    },

    async listOptions() {
      const db = await load();
      return [...db.events]
        .sort((a, b) => -byStart(a, b))
        .map((event) => ({ id: event.id, title: event.title.mk, startsAt: event.startsAt }));
    },

    async adminList(query) {
      const db = await load();
      const visible = query.onlyIds ? db.events.filter((e) => query.onlyIds!.includes(e.id)) : db.events;
      const timingOf = (event: EventRecord) => eventTiming(event, query.now);
      const counts = {
        all: visible.length,
        upcoming: visible.filter((e) => timingOf(e) === 'upcoming').length,
        past: visible.filter((e) => timingOf(e) === 'past').length,
      };
      const needle = query.q?.toLowerCase();
      const rows = visible.filter(
        (event) =>
          (!query.timing || timingOf(event) === query.timing) &&
          (!needle ||
            event.slug.includes(needle) ||
            event.title.mk.toLowerCase().includes(needle) ||
            !!event.title.en?.toLowerCase().includes(needle)) &&
          (!query.status || event.status === query.status) &&
          (!query.typeId || event.typeId === query.typeId) &&
          (!query.scope || event.scope === query.scope) &&
          (!query.year || yearInSkopje(event.startsAt) === query.year),
      );

      const sorted = [...rows].sort((a, b) => {
        switch (query.sort) {
          case 'title':
            return a.title.mk.localeCompare(b.title.mk);
          case '-title':
            return b.title.mk.localeCompare(a.title.mk);
          case 'dates':
            return byStart(a, b);
          case '-dates':
            return byStart(b, a);
          case 'smart': {
            // Upcoming soonest first, then past newest first.
            const ta = timingOf(a);
            const tb = timingOf(b);
            if (ta !== tb) return ta === 'upcoming' ? -1 : 1;
            return ta === 'upcoming' ? byStart(a, b) : byStart(b, a);
          }
        }
      });

      const page = paginate(sorted, query.page, query.pageSize);
      return {
        ...page,
        items: page.items.map((event): AdminEventRow => ({
          id: event.id,
          slug: event.slug,
          title: event.title.mk,
          timing: timingOf(event),
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          allDay: event.allDay,
          typeName: typeName(db, event.typeId),
          scope: event.scope,
          status: event.status,
          cover: event.cover ? { mediaId: event.cover.mediaId, alt: event.cover.alt } : null,
          applications: applicationsOf(event),
          applicationSettings: structuredClone(event.applications),
          updatedAt: event.updatedAt,
          updatedBy: event.updatedBy,
        })),
        counts,
      };
    },

    async adminFacets({ onlyIds }) {
      const db = await load();
      const visible = onlyIds ? db.events.filter((e) => onlyIds.includes(e.id)) : db.events;
      const years = [...new Set(visible.map((event) => yearInSkopje(event.startsAt)))];
      return { years: years.sort((a, b) => b - a) };
    },

    async get(id) {
      const event = (await load()).events.find((candidate) => candidate.id === id);
      return event ? structuredClone(event) : null;
    },
  };
}
