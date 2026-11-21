import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { EventRecord, EventTopic, EventType } from '../types';
import { createEventsReads, type EventsSnapshot } from './events-reads';
import type { EventsRepository, EventTaxonomyRepository, TaxonomyKind } from './events.repository';
import {
  eventsFixture,
  eventTopicsFixture,
  eventTypesFixture,
  slugRedirectsFixture,
} from './fixtures/events';

type Tables = EventsSnapshot;

const tables = () =>
  mockTable<Tables>('events', () => ({
    events: eventsFixture,
    types: eventTypesFixture,
    topics: eventTopicsFixture,
    redirects: slugRedirectsFixture,
  }));

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export function createMockEventsRepository(): EventsRepository {
  const db = tables();
  return {
    // Every read is the shared logic over the in-memory tables (events-reads.ts).
    ...createEventsReads(() => db),

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
      return Promise.resolve(removed);
    },

    slugTaken(slug, exceptId) {
      const owner = db.events.find((event) => event.slug === slug)?.id ?? db.redirects[slug];
      return Promise.resolve(owner !== undefined && owner !== exceptId);
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
