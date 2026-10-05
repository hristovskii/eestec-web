import { describe, expect, it } from 'vitest';

import { eventDraftSchema } from '../schemas/event.schema';
import { newEventInput } from './new-event';

describe('newEventInput', () => {
  const event = newEventInput(new Date('2026-10-04T18:18:00+02:00'), {
    typeId: 'type-workshop',
    maxParticipants: 24,
    waitlist: true,
  });

  it('starts tomorrow 10:00–18:00 Skopje time, as a draft with the Settings defaults', () => {
    expect(event.startsAt).toBe('2026-10-05T10:00:00+02:00');
    expect(event.endsAt).toBe('2026-10-05T18:00:00+02:00');
    expect(event.status).toBe('draft');
    expect(event.applications).toMatchObject({ maxParticipants: 24, waitlist: true, enabled: false });
  });

  it('is a valid draft once it has an address', () => {
    expect(eventDraftSchema.safeParse({ ...event, slug: 'untitled-event' }).success).toBe(true);
  });
});
