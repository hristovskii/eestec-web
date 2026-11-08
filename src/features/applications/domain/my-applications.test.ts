import { describe, expect, it } from 'vitest';

import type { Application } from '../types';
import { toMyApplications } from './my-applications';

const application = (patch: Partial<Application>): Application => ({
  id: 'a1',
  eventId: 'e1',
  reference: 'X-1',
  name: 'Marija',
  email: 'm@example.com',
  answers: {},
  status: 'pending',
  waitlistPosition: null,
  locale: 'en',
  consentAt: '2026-10-03T10:00:00Z',
  createdAt: '2026-10-03T10:00:00Z',
  readAt: null,
  ...patch,
});

const event = (id: string, timing: 'upcoming' | 'past') => ({
  id,
  slug: `slug-${id}`,
  title: { text: `Event ${id}`, lang: 'en' as const },
  startsAt: '2026-11-07T10:00:00+01:00',
  endsAt: '2026-11-13T18:00:00+01:00',
  place: { text: 'Skopje' },
  timing,
});

describe('toMyApplications', () => {
  it('lists the newest application first and links to the page the event has now', () => {
    const rows = toMyApplications(
      [
        application({ id: 'old', eventId: 'e-past', createdAt: '2026-08-01T10:00:00Z' }),
        application({ id: 'new', eventId: 'e-next', createdAt: '2026-10-03T10:00:00Z' }),
      ],
      [event('e-past', 'past'), event('e-next', 'upcoming')],
    );
    expect(rows.map((row) => row.id)).toEqual(['new', 'old']);
    expect(rows[0]).toMatchObject({ path: '/upcoming/slug-e-next', canWithdraw: true });
    expect(rows[1]).toMatchObject({ path: '/events/slug-e-past', canWithdraw: false });
  });

  it('leaves out applications whose event is not listed any more and keeps the waitlist place', () => {
    const rows = toMyApplications(
      [
        application({ id: 'gone', eventId: 'e-hidden' }),
        application({ id: 'wait', eventId: 'e-next', status: 'waitlist', waitlistPosition: 3 }),
      ],
      [event('e-next', 'upcoming')],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'waitlist', waitlistPosition: 3 });
  });
});
