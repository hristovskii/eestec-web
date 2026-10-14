import { describe, expect, it } from 'vitest';

import {
  academicYearStart,
  exportWindow,
  inboxTime,
  inWindow,
  matchesQuery,
  parseExportParams,
} from './inbox';

// "Now" is Sunday 4 October 2026, 18:18 in Skopje.
const NOW = new Date('2026-10-04T18:18:00+02:00');

describe('inboxTime', () => {
  it('shows the time today, then Yesterday, the weekday, and the date', () => {
    expect(inboxTime('2026-10-04T17:42:00+02:00', NOW)).toBe('17:42');
    expect(inboxTime('2026-10-03T23:50:00+02:00', NOW)).toBe('Yesterday');
    expect(inboxTime('2026-10-02T19:48:00+02:00', NOW)).toBe('Fri');
    expect(inboxTime('2026-10-01T18:02:00+02:00', NOW)).toBe('Thu');
    expect(inboxTime('2026-09-28T09:55:00+02:00', NOW)).toBe('28 Sep');
    expect(inboxTime('2025-12-31T09:55:00+01:00', NOW)).toBe('31 Dec 2025');
  });

  it('counts days in Skopje, not in UTC', () => {
    // 00:30 in Skopje on the 4th is still the 3rd in UTC.
    expect(inboxTime('2026-10-04T00:30:00+02:00', NOW)).toBe('00:30');
  });
});

describe('matchesQuery', () => {
  it('needs every word somewhere, in any letter case', () => {
    expect(matchesQuery('elena finki', 'Elena Petrovska', 'elena.p@students.finki.ukim.mk')).toBe(true);
    expect(matchesQuery('elena belgrade', 'Elena Petrovska')).toBe(false);
    expect(matchesQuery('  ', 'anything')).toBe(true);
    expect(matchesQuery(undefined, 'anything')).toBe(true);
  });
});

describe('export range', () => {
  it('reads the parameters with safe defaults', () => {
    expect(parseExportParams(new URLSearchParams())).toEqual({
      range: '30d',
      from: null,
      to: null,
      closed: true,
      current: false,
      count: false,
    });
    expect(
      parseExportParams(
        new URLSearchParams('range=custom&from=2026-09-01&to=nope&closed=0&current=1&count=1'),
      ),
    ).toEqual({ range: 'custom', from: '2026-09-01', to: null, closed: false, current: true, count: true });
    expect(parseExportParams(new URLSearchParams('range=bad')).range).toBe('30d');
  });

  it('starts the academic year on 1 September', () => {
    expect(academicYearStart(NOW)).toBe('2026-09-01');
    expect(academicYearStart(new Date('2026-03-10T10:00:00+01:00'))).toBe('2025-09-01');
    expect(academicYearStart(new Date('2026-09-01T10:00:00+02:00'))).toBe('2026-09-01');
  });

  it('turns each range into a window of days', () => {
    const base = parseExportParams(new URLSearchParams());
    expect(exportWindow(base, NOW)).toEqual({ from: '2026-09-05', to: '2026-10-04' });
    expect(exportWindow({ ...base, range: 'year' }, NOW)).toEqual({ from: '2026-09-01', to: '2026-10-04' });
    expect(exportWindow({ ...base, range: 'all' }, NOW)).toEqual({ from: null, to: null });
    expect(exportWindow({ ...base, range: 'custom', from: '2026-01-01', to: null }, NOW)).toEqual({
      from: '2026-01-01',
      to: null,
    });
  });

  it('includes both ends of the window', () => {
    const window = { from: '2026-09-28', to: '2026-10-02' };
    expect(inWindow('2026-09-28T00:10:00+02:00', window)).toBe(true);
    expect(inWindow('2026-10-02T23:59:00+02:00', window)).toBe(true);
    expect(inWindow('2026-09-27T23:59:00+02:00', window)).toBe(false);
    expect(inWindow('2026-10-03T00:01:00+02:00', window)).toBe(false);
    expect(inWindow('2020-01-01T00:00:00+01:00', { from: null, to: null })).toBe(true);
  });
});
