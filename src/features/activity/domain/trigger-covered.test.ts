import { describe, expect, it } from 'vitest';

import { writtenByTrigger } from './trigger-covered';

const uuid = '3b1f5c1e-0000-4000-8000-000000000001';

describe('writtenByTrigger', () => {
  it('knows the event row changes and the inbox status changes a trigger logs', () => {
    expect(writtenByTrigger({ area: 'events', action: 'created', href: `/admin/events/${uuid}` })).toBe(true);
    expect(writtenByTrigger({ area: 'events', action: 'updated', href: '/admin/events' })).toBe(true);
    expect(writtenByTrigger({ area: 'events', action: 'deleted' })).toBe(true);
    expect(
      writtenByTrigger({ area: 'inbox', action: 'updated', href: '/admin/inbox?tab=contact&open=x' }),
    ).toBe(true);
  });

  it('records everything a trigger does not see', () => {
    expect(writtenByTrigger({ area: 'events', action: 'published', href: `/admin/events/${uuid}` })).toBe(
      false,
    );
    expect(writtenByTrigger({ area: 'events', action: 'exported', href: '/admin/events' })).toBe(false);
    expect(writtenByTrigger({ area: 'events', action: 'created', href: '/admin/events/types' })).toBe(false);
    expect(
      writtenByTrigger({ area: 'inbox', action: 'created', href: '/admin/inbox?tab=contact&open=x' }),
    ).toBe(false);
    expect(writtenByTrigger({ area: 'inbox', action: 'exported', href: '/admin/inbox' })).toBe(false);
    expect(writtenByTrigger({ area: 'pages', action: 'updated', href: '/admin/pages/home' })).toBe(false);
    expect(writtenByTrigger({ area: 'settings', action: 'updated' })).toBe(false);
  });
});
