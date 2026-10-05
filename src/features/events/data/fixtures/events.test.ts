import { describe, expect, it } from 'vitest';

import { getMediaItems } from '@/features/media/server';

import { eventDraftSchema, publishIssues } from '../../schemas/event.schema';
import { eventsFixture, eventTopicsFixture, eventTypesFixture, sampleApplicationCounts } from './events';

// The sample events are one consistent dataset (docs/ARCHITECTURE.md §4.2).

describe('events fixture', () => {
  it('passes the draft schema', () => {
    for (const { id: _id, createdAt: _c, updatedAt: _u, updatedBy: _b, ...event } of eventsFixture)
      expect(eventDraftSchema.safeParse(event).error?.issues ?? [], event.slug).toEqual([]);
  });

  it('uses unique ids and addresses', () => {
    expect(new Set(eventsFixture.map((event) => event.id)).size).toBe(eventsFixture.length);
    expect(new Set(eventsFixture.map((event) => event.slug)).size).toBe(eventsFixture.length);
  });

  it('refers only to existing types, topics, files and events', async () => {
    const types = new Set(eventTypesFixture.map((type) => type.id));
    const topics = new Set(eventTopicsFixture.map((topic) => topic.id));
    for (const event of eventsFixture) {
      expect(types.has(event.typeId), event.slug).toBe(true);
      for (const topic of event.topicIds) expect(topics.has(topic), event.slug).toBe(true);
    }
    const mediaIds = eventsFixture.flatMap((event) => [
      ...(event.cover ? [event.cover.mediaId] : []),
      ...event.gallery.map((photo) => photo.mediaId),
      ...(event.infoPackId ? [event.infoPackId] : []),
    ]);
    const found = new Set((await getMediaItems(mediaIds)).map((item) => item.id));
    expect(mediaIds.filter((id) => !found.has(id))).toEqual([]);
    const eventIds = new Set(eventsFixture.map((event) => event.id));
    expect(Object.keys(sampleApplicationCounts).filter((id) => !eventIds.has(id))).toEqual([]);
  });

  it('lacks only texts the canvas never gives', () => {
    // Archive cards give no short description for some events, and AdminEventEdit shows photo 3
    // of AI at the Edge without alt text. They stay published; the edit form asks for the missing
    // fields before "Update live page". A missing cover is only a warning (D21).
    const allowed = new Set(['shortDescription.mk', 'gallery.2.alt']);
    for (const event of eventsFixture.filter((candidate) => candidate.status !== 'draft')) {
      const issues = publishIssues(event).map((issue) => issue.path.join('.'));
      expect(
        issues.filter((path) => !allowed.has(path)),
        event.slug,
      ).toEqual([]);
    }
    expect(publishIssues(eventsFixture.find((event) => event.slug === 'ai-at-the-edge')!)).toEqual([
      { path: ['gallery', 2, 'alt'], message: 'altRequired' },
    ]);
  });
});
