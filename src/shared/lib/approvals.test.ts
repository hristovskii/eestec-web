import { describe, expect, it } from 'vitest';

import { waitingTime } from './approvals';

const now = new Date('2026-10-04T16:18:00Z');
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe('waitingTime', () => {
  it('counts minutes under an hour, hours under two days, then days', () => {
    expect(waitingTime(ago(0), now)).toBe('1 min');
    expect(waitingTime(ago(20), now)).toBe('20 min');
    expect(waitingTime(ago(59), now)).toBe('59 min');
    expect(waitingTime(ago(60), now)).toBe('1 h');
    expect(waitingTime(ago(5 * 60 + 10), now)).toBe('5 h');
    expect(waitingTime(ago(47 * 60), now)).toBe('47 h');
    expect(waitingTime(ago(48 * 60), now)).toBe('2 d');
    expect(waitingTime(ago(5 * 24 * 60), now)).toBe('5 d');
  });

  it('never shows a negative time', () => {
    expect(waitingTime(ago(-30), now)).toBe('1 min');
  });
});
