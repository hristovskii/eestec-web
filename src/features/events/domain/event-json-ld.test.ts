import { describe, expect, it } from 'vitest';

import { eventJsonLd } from './event-json-ld';

const options = {
  origin: 'https://eestec.mk',
  path: '/en/upcoming/ai-at-the-edge',
  siteName: 'EESTEC LC Skopje',
  description: 'A week of building machine-learning models.',
};

const base = {
  title: { text: 'Workshop: AI at the Edge', lang: 'en' as const },
  startsAt: '2026-11-09T09:00:00+01:00',
  endsAt: '2026-11-13T18:00:00+01:00',
  allDay: false,
  location: { text: 'Skopje & Ohrid, North Macedonia', lang: 'en' as const },
  organizer: null,
  cover: null,
  shareImage: null,
};

describe('eventJsonLd', () => {
  it('describes the event with its dates, place and the association as organizer', () => {
    expect(eventJsonLd(base, options)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Workshop: AI at the Edge',
      description: 'A week of building machine-learning models.',
      url: 'https://eestec.mk/en/upcoming/ai-at-the-edge',
      startDate: '2026-11-09T09:00:00+01:00',
      endDate: '2026-11-13T18:00:00+01:00',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'Skopje & Ohrid, North Macedonia',
        address: 'Skopje & Ohrid, North Macedonia',
      },
      organizer: { '@type': 'Organization', name: 'EESTEC LC Skopje', url: 'https://eestec.mk' },
    });
  });

  it('uses dates only for all-day events', () => {
    const node = eventJsonLd(
      { ...base, allDay: true, startsAt: '2026-11-09T00:00:00+01:00', endsAt: '2026-11-09T23:59:00+01:00' },
      options,
    );
    expect(node.startDate).toBe('2026-11-09');
    expect(node.endDate).toBe('2026-11-09');
  });

  it('names another committee as organizer, and leaves it out when unknown', () => {
    expect(eventJsonLd({ ...base, organizer: 'LC Kraków' }, options).organizer).toEqual({
      '@type': 'Organization',
      name: 'LC Kraków',
    });
    expect(eventJsonLd({ ...base, organizer: '' }, options)).not.toHaveProperty('organizer');
  });

  it('leaves out the place when there is none, and never invents a price or an online mode', () => {
    const node = eventJsonLd({ ...base, location: { text: '', lang: 'en' as const } }, options);
    expect(node).not.toHaveProperty('location');
    expect(node).not.toHaveProperty('offers');
  });

  it('prefers the share image, then a real cover, and skips sample placeholders', () => {
    const share = { src: '/uploads/share.jpg', width: 1200, height: 630, alt: 'Share' };
    const cover = { src: '/uploads/cover.jpg', width: 1600, height: 900, alt: 'Cover' };
    expect(eventJsonLd({ ...base, shareImage: share, cover }, options).image).toEqual([
      'https://eestec.mk/uploads/share.jpg',
    ]);
    expect(eventJsonLd({ ...base, cover }, options).image).toEqual(['https://eestec.mk/uploads/cover.jpg']);
    const sample = { sample: true as const, caption: 'Photo', alt: '' };
    expect(eventJsonLd({ ...base, cover: sample }, options)).not.toHaveProperty('image');
  });
});
