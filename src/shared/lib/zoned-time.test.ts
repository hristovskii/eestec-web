import { describe, expect, it } from 'vitest';

import { isoToZoned, zonedToIso } from './zoned-time';

describe('zoned time (Skopje)', () => {
  it('uses winter and summer offsets', () => {
    expect(zonedToIso('2026-11-07', '10:00')).toBe('2026-11-07T10:00:00+01:00');
    expect(zonedToIso('2026-07-03', '18:30')).toBe('2026-07-03T18:30:00+02:00');
  });

  it('handles the days the clocks change', () => {
    expect(zonedToIso('2026-03-29', '01:30')).toBe('2026-03-29T01:30:00+01:00');
    expect(zonedToIso('2026-03-29', '12:00')).toBe('2026-03-29T12:00:00+02:00');
    expect(zonedToIso('2026-10-25', '12:00')).toBe('2026-10-25T12:00:00+01:00');
  });

  it('rejects incomplete input', () => {
    expect(zonedToIso('', '10:00')).toBeNull();
    expect(zonedToIso('2026-11-07', '')).toBeNull();
  });

  it('reads an instant back as Skopje date and time', () => {
    expect(isoToZoned('2026-11-07T09:00:00Z')).toEqual({ date: '2026-11-07', time: '10:00' });
    expect(isoToZoned('2026-10-18T23:59:00+02:00')).toEqual({ date: '2026-10-18', time: '23:59' });
    expect(isoToZoned(zonedToIso('2026-12-31', '23:59')!)).toEqual({ date: '2026-12-31', time: '23:59' });
  });
});
