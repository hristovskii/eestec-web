import { describe, expect, it } from 'vitest';

import { nextMeetingAt } from './next-meeting';

const wed = { day: 'wednesday', time: '18:00' } as const;

describe('nextMeetingAt', () => {
  it('is the same day when the meeting has not started yet (summer time, +02:00)', () => {
    // Wed 14 Oct 2026, 10:00 in Skopje
    expect(nextMeetingAt(wed, new Date('2026-10-14T10:00:00+02:00')).toISOString()).toBe(
      '2026-10-14T16:00:00.000Z',
    );
  });

  it('is next week once the meeting has started', () => {
    expect(nextMeetingAt(wed, new Date('2026-10-14T18:00:00+02:00')).toISOString()).toBe(
      '2026-10-21T16:00:00.000Z',
    );
    expect(nextMeetingAt(wed, new Date('2026-10-14T23:30:00+02:00')).toISOString()).toBe(
      '2026-10-21T16:00:00.000Z',
    );
  });

  it('finds the next weekday from any other day', () => {
    // Sunday 4 Oct 2026 → Wednesday 7 Oct
    expect(nextMeetingAt(wed, new Date('2026-10-04T18:18:00+02:00')).toISOString()).toBe(
      '2026-10-07T16:00:00.000Z',
    );
  });

  it('uses winter time (+01:00) after the clocks change', () => {
    // Wed 28 Oct 2026 is the first Wednesday after 25 Oct (end of summer time)
    expect(nextMeetingAt(wed, new Date('2026-10-26T09:00:00+01:00')).toISOString()).toBe(
      '2026-10-28T17:00:00.000Z',
    );
  });

  it('uses the Skopje day, not the UTC day, around midnight', () => {
    // 00:30 on Thursday 15 Oct in Skopje is still Wednesday 14 Oct 22:30 UTC
    expect(nextMeetingAt(wed, new Date('2026-10-15T00:30:00+02:00')).toISOString()).toBe(
      '2026-10-21T16:00:00.000Z',
    );
  });
});
