import { describe, expect, it } from 'vitest';

import { relativeAge } from './relative-age';

const at = (iso: string) => relativeAge('2026-07-08T10:00:00+02:00', iso);

describe('relativeAge', () => {
  it('counts days under a month, months under a year, then years', () => {
    expect(at('2026-07-08T12:00:00+02:00')).toEqual({ count: 0, unit: 'day' });
    expect(at('2026-07-20T10:00:00+02:00')).toEqual({ count: 12, unit: 'day' });
    expect(at('2026-11-08T10:00:00+01:00')).toEqual({ count: 4, unit: 'month' });
    expect(at('2027-07-07T10:00:00+02:00')).toEqual({ count: 11, unit: 'month' });
    expect(at('2028-08-08T10:00:00+02:00')).toEqual({ count: 2, unit: 'year' });
  });

  it('never goes below zero', () => {
    expect(at('2026-01-01T00:00:00Z')).toEqual({ count: 0, unit: 'day' });
  });
});
