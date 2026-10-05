import { describe, expect, it } from 'vitest';

import { eventInput } from '../data/events.repository.contract';
import { eventDraftSchema, eventPublishSchema, publishIssues, publishWarnings } from './event.schema';

const ready = eventInput({
  shortDescription: { mk: 'Кратко' },
  cover: { mediaId: 'media-1', alt: 'Students at a lab bench' },
});
const paths = (event: Parameters<typeof publishIssues>[0]) =>
  publishIssues(event).map((i) => i.path.join('.'));

describe('publish rules', () => {
  it('passes a complete event', () => {
    expect(publishIssues(ready)).toEqual([]);
    expect(eventPublishSchema.safeParse(ready).success).toBe(true);
  });

  it('needs title, short description and location in Macedonian', () => {
    const event = {
      ...ready,
      title: { mk: '', en: 'Only English' },
      shortDescription: { mk: '' },
      location: { mk: '' },
    };
    expect(paths(event)).toEqual(['title.mk', 'shortDescription.mk', 'location.mk']);
  });

  it('allows publishing without a cover, with a warning (D21)', () => {
    const event = { ...ready, cover: null };
    expect(publishIssues(event)).toEqual([]);
    expect(publishWarnings(event)).toEqual(['defaultCover']);
    expect(publishWarnings(ready)).toEqual([]);
  });

  it('needs alt text on a chosen cover and on every gallery photo', () => {
    const event = {
      ...ready,
      cover: { mediaId: 'media-1', alt: null },
      gallery: [
        { mediaId: 'media-2', alt: 'Opening session' },
        { mediaId: 'media-3', alt: null },
        { mediaId: 'media-4', alt: '' },
      ],
    };
    expect(paths(event)).toEqual(['cover.alt', 'gallery.1.alt', 'gallery.2.alt']);
  });

  it('checks dates and the application window', () => {
    expect(paths({ ...ready, endsAt: '2026-11-30T10:00:00+01:00' })).toEqual(['endsAt']);
    const apps = (patch: Partial<typeof ready.applications>) => ({
      ...ready,
      applications: { ...ready.applications, enabled: true, ...patch },
    });
    expect(paths(apps({}))).toEqual(['applications.deadline']);
    expect(
      paths(apps({ deadline: '2026-11-20T23:59:00+01:00', opensAt: '2026-11-21T00:00:00+01:00' })),
    ).toEqual(['applications.deadline']);
    expect(paths(apps({ deadline: '2026-12-05T23:59:00+01:00' }))).toEqual(['applications.deadline']);
    expect(paths(apps({ via: 'external' }))).toEqual(['applications.externalUrl']);
  });

  it('lets a draft be saved with missing texts', () => {
    expect(eventDraftSchema.safeParse({ ...ready, title: { mk: '' }, cover: null }).success).toBe(true);
    expect(eventPublishSchema.safeParse({ ...ready, title: { mk: '' } }).success).toBe(false);
  });
});
