import { describe, expect, it } from 'vitest';

import { countdownParts } from './countdown';

describe('countdownParts', () => {
  it('splits the remaining time', () => {
    const now = new Date('2026-10-04T18:18:00+02:00');
    const target = new Date('2026-10-18T23:59:00+02:00');
    expect(countdownParts(target, now)).toEqual({ days: 14, hours: 5, minutes: 41, seconds: 0, done: false });
  });

  it('never goes negative', () => {
    const now = new Date('2026-10-20T00:00:00Z');
    expect(countdownParts(new Date('2026-10-19T00:00:00Z'), now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      done: true,
    });
  });
});
