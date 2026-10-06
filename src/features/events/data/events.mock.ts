import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { paginate } from '@/shared/data/paged';
import { yearInSkopje } from '@/shared/i18n/format';
import { resolveLocalized } from '@/shared/i18n/localized';

import { eventTiming } from '../domain/event-timing';
import { isListed, isReachable, toDetail, toLink, toSummary } from '../domain/public-event';
import type { AdminEventRow, ApplicationsSummary, EventRecord, EventTopic, EventType } from '../types';
import type { EventsRepository, EventTaxonomyRepository, TaxonomyKind } from './events.repository';
import {
  eventsFixture,
  eventTopicsFixture,
  eventTypesFixture,
  sampleApplicationCounts,
  slugRedirectsFixture,
} from './fixtures/events';

type Tables = {
  events: EventRecord[];
  types: EventType[];
  topics: EventTopic[];
  /** Old slug → event id. */
  redirects: Record<string, string>;
  /** SAMPLE: applications per event until the applications feature lands (M7). */
  applications: Record<string, { count: number; full: boolean }>;
};

const tables = () =>
  mockTable<Tables>('events', () => ({
    events: eventsFixture,
    types: eventTypesFixture,
    topics: eventTopicsFixture,
    redirects: slugRedirectsFixture,
    applications: sampleApplicationCounts,
  }));

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const byStart = (a: EventRecord, b: EventRecord) => Date.parse(a.startsAt) - Date.parse(b.startsAt);

function applicationsOf(event: EventRecord, db: Tables): ApplicationsSummary {
  if (event.applications.via === 'external')
    return event.applications.enabled ? { kind: 'external' } : { kind: 'none' };
  // Past events keep their count after applications are switched off.
  const sample = db.applications[event.id];
  return sample ? { kind: 'count', ...sample } : { kind: 'none' };
}

export function createMockEventsRepository(): EventsRepository {
  const db = tables();
  const typeName = (id: string) => {
    const type = db.types.find((candidate) => candidate.id === id);
    return type ? resolveLocalized(type.name, 'mk') : '—';
  };

  const typeLocalized = (id: string) => db.types.find((candidate) => candidate.id === id)?.name ?? { mk: '' };
  /** Listed past events, newest first. */
  const archive = (now: Date) =>
    db.events
      .filter((event) => isListed(event, now) && eventTiming(event, now) === 'past')
      .sort((a, b) => byStart(b, a));

  return {
    listArchive(query) {
      const context = { ...query, typeName: typeLocalized };
      const needle = query.q?.toLocaleLowerCase(query.locale);
      const rows = archive(query.now)
        .filter(
          (event) =>
            event.scope === query.scope &&
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
      return Promise.resolve(paginate(sorted, query.page, query.pageSize));
    },

    archiveFacets({ now }) {
      const past = archive(now);
      const years = [...new Set(past.map((event) => yearInSkopje(event.startsAt)))].sort((a, b) => b - a);
      return Promise.resolve({
        counts: {
          local: past.filter((event) => event.scope === 'local').length,
          international: past.filter((event) => event.scope === 'international').length,
        },
        years,
        firstYear: years.at(-1) ?? null,
      });
    },

    findBySlug(slug, context) {
      const event = db.events.find((candidate) => candidate.slug === slug);
      return Promise.resolve(
        event && isReachable(event, context.now)
          ? toDetail(event, { ...context, typeName: typeLocalized })
          : null,
      );
    },

    findAdjacent(slug, { locale, now }) {
      const event = db.events.find((candidate) => candidate.slug === slug);
      if (!event) return Promise.resolve({ prev: null, next: null });
      const others = archive(now).filter((other) => other.id !== event.id);
      const start = Date.parse(event.startsAt);
      // Archive order is newest first: "previous" is the next older one.
      const prev = others.find((other) => Date.parse(other.startsAt) <= start) ?? null;
      const next = [...others].reverse().find((other) => Date.parse(other.startsAt) > start) ?? null;
      return Promise.resolve({ prev: prev && toLink(prev, locale), next: next && toLink(next, locale) });
    },

    archiveSlugs(now) {
      return Promise.resolve(archive(now).map((event) => event.slug));
    },

    listOptions() {
      return Promise.resolve(
        [...db.events]
          .sort((a, b) => -byStart(a, b))
          .map((event) => ({ id: event.id, title: event.title.mk, startsAt: event.startsAt })),
      );
    },

    adminList(query) {
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
      return Promise.resolve({
        ...page,
        items: page.items.map((event): AdminEventRow => ({
          id: event.id,
          slug: event.slug,
          title: event.title.mk,
          timing: timingOf(event),
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          allDay: event.allDay,
          typeName: typeName(event.typeId),
          scope: event.scope,
          status: event.status,
          cover: event.cover ? { mediaId: event.cover.mediaId, alt: event.cover.alt } : null,
          applications: applicationsOf(event, db),
          updatedAt: event.updatedAt,
          updatedBy: event.updatedBy,
        })),
        counts,
      });
    },

    adminFacets({ onlyIds }) {
      const visible = onlyIds ? db.events.filter((e) => onlyIds.includes(e.id)) : db.events;
      const years = [...new Set(visible.map((event) => yearInSkopje(event.startsAt)))];
      return Promise.resolve({ years: years.sort((a, b) => b - a) });
    },

    get(id) {
      const event = db.events.find((candidate) => candidate.id === id);
      return Promise.resolve(event ? structuredClone(event) : null);
    },

    async save(input, editor, now) {
      const existing = input.id ? db.events.find((event) => event.id === input.id) : undefined;
      if (input.id && !existing) return { status: 'not_found' };
      if (await this.slugTaken(input.slug, existing?.id)) return { status: 'slug_taken' };

      const at = now.toISOString();
      const { id: _id, ...fields } = input;
      const record: EventRecord = {
        ...structuredClone(fields),
        id: existing?.id ?? newId('ev'),
        createdAt: existing?.createdAt ?? at,
        updatedAt: at,
        updatedBy: editor,
      };
      if (existing) {
        // A published event that changes address keeps the old one as a redirect.
        if (existing.slug !== record.slug && existing.status !== 'draft')
          db.redirects[existing.slug] = record.id;
        delete db.redirects[record.slug];
        db.events[db.events.indexOf(existing)] = record;
      } else {
        db.events.push(record);
      }
      return { status: 'saved', record: structuredClone(record) };
    },

    setStatus(ids, status, editor, now) {
      const changed: string[] = [];
      for (const event of db.events) {
        if (!ids.includes(event.id) || event.status === status) continue;
        event.status = status;
        event.updatedAt = now.toISOString();
        event.updatedBy = editor;
        changed.push(event.id);
      }
      return Promise.resolve(changed);
    },

    remove(ids) {
      const removed = db.events.filter((event) => ids.includes(event.id)).map((event) => event.id);
      db.events = db.events.filter((event) => !removed.includes(event.id));
      for (const [slug, id] of Object.entries(db.redirects))
        if (removed.includes(id)) delete db.redirects[slug];
      for (const id of removed) delete db.applications[id];
      return Promise.resolve(removed);
    },

    slugTaken(slug, exceptId) {
      const owner = db.events.find((event) => event.slug === slug)?.id ?? db.redirects[slug];
      return Promise.resolve(owner !== undefined && owner !== exceptId);
    },

    redirectFor(slug) {
      const id = db.redirects[slug];
      return Promise.resolve(db.events.find((event) => event.id === id)?.slug ?? null);
    },
  };
}

export function createMockEventTaxonomyRepository(): EventTaxonomyRepository {
  const db = tables();
  const listOf = (kind: TaxonomyKind): (EventType | EventTopic)[] =>
    kind === 'types' ? db.types : db.topics;
  const usage = (kind: TaxonomyKind, id: string) =>
    db.events.filter((event) => (kind === 'types' ? event.typeId === id : event.topicIds.includes(id)))
      .length;

  return {
    list(kind) {
      return Promise.resolve(
        listOf(kind).map((item) => ({ ...structuredClone(item), eventCount: usage(kind, item.id) })),
      );
    },

    create(kind, name) {
      const item = { id: newId(kind === 'types' ? 'type' : 'topic'), name: structuredClone(name) };
      listOf(kind).push(item);
      return Promise.resolve(structuredClone(item));
    },

    rename(kind, id, name) {
      const item = listOf(kind).find((candidate) => candidate.id === id);
      if (!item) return Promise.resolve(null);
      item.name = structuredClone(name);
      return Promise.resolve(structuredClone(item));
    },

    reorder(kind, ids) {
      const items = listOf(kind);
      const same = ids.length === items.length && items.every((item) => ids.includes(item.id));
      if (!same) return Promise.resolve(false);
      const ordered = ids.map((id) => items.find((item) => item.id === id)!);
      items.splice(0, items.length, ...ordered);
      return Promise.resolve(true);
    },

    remove(kind, id, replacementId) {
      const items = listOf(kind);
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return Promise.resolve({ status: 'not_found' });
      if (kind === 'types') {
        const used = usage('types', id);
        const replacement = items.find((item) => item.id === replacementId && item.id !== id);
        if (used > 0 && !replacement)
          return Promise.resolve({ status: 'replacement_required', eventCount: used });
        for (const event of db.events) if (event.typeId === id) event.typeId = replacement!.id;
      } else {
        for (const event of db.events) event.topicIds = event.topicIds.filter((topic) => topic !== id);
      }
      items.splice(index, 1);
      return Promise.resolve({ status: 'removed' });
    },
  };
}
