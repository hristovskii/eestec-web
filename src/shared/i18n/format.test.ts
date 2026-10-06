import { describe, expect, it } from 'vitest';

import { formatDate, formatDateRange, hourInSkopje } from './format';

const canvasNow = new Date('2026-10-04T18:18:00+02:00');

describe('formatDate', () => {
  it('uses day-month order in English, like the canvas', () => {
    expect(formatDate(canvasNow, 'en', 'long')).toBe('Sunday, 4 October 2026');
    expect(formatDate('2026-10-18T23:59:00+02:00', 'en', 'dateTime')).toBe('18 Oct 2026, 23:59');
    expect(formatDate('2026-09-30T12:40:00+02:00', 'en', 'shortDateTime')).toBe('Wed 30 Sep, 12:40');
    expect(formatDate('2024-12-09T18:00:00+01:00', 'en', 'dayDateTime')).toBe('Mon 9 Dec 2024, 18:00');
    expect(formatDate('2026-11-14T00:00:00+01:00', 'en', 'dayDate')).toBe('Sat 14 Nov 2026');
  });

  it('formats in Skopje time regardless of the server time zone', () => {
    expect(formatDate('2026-10-04T16:18:00Z', 'en', 'time')).toBe('18:18');
    expect(hourInSkopje(canvasNow)).toBe(18);
  });

  it('formats Macedonian dates', () => {
    expect(formatDate(canvasNow, 'mk', 'date')).toMatch(/2026/);
  });
});

describe('formatDateRange', () => {
  it('writes ranges like the canvas', () => {
    expect(formatDateRange('2026-11-07T10:00:00+01:00', '2026-11-13T14:00:00+01:00', 'en')).toBe(
      '7–13 Nov 2026',
    );
    expect(formatDateRange('2026-11-14T10:00:00+01:00', '2026-11-14T18:00:00+01:00', 'en')).toBe(
      '14 Nov 2026',
    );
    expect(formatDateRange('2026-09-12T10:00:00+02:00', '2026-09-14T14:00:00+02:00', 'en')).toBe(
      '12–14 Sep 2026',
    );
    expect(formatDateRange('2026-11-28T10:00:00+01:00', '2026-12-02T14:00:00+01:00', 'en')).toBe(
      '28 Nov – 2 Dec 2026',
    );
    expect(formatDateRange('2026-12-30T10:00:00+01:00', '2027-01-02T14:00:00+01:00', 'en')).toBe(
      '30 Dec 2026 – 2 Jan 2027',
    );
  });

  it('uses Skopje days (a late-evening end stays on its day)', () => {
    expect(formatDateRange('2026-11-14T22:00:00Z', '2026-11-14T22:30:00Z', 'en')).toBe('14 Nov 2026');
  });
});
