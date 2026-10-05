import { describe, expect, it } from 'vitest';

import { formatDate, hourInSkopje } from './format';

const canvasNow = new Date('2026-10-04T18:18:00+02:00');

describe('formatDate', () => {
  it('uses day-month order in English, like the canvas', () => {
    expect(formatDate(canvasNow, 'en', 'long')).toBe('Sunday, 4 October 2026');
    expect(formatDate('2026-10-18T23:59:00+02:00', 'en', 'dateTime')).toBe('18 Oct 2026, 23:59');
    expect(formatDate('2026-09-30T12:40:00+02:00', 'en', 'shortDateTime')).toBe('Wed 30 Sep, 12:40');
  });

  it('formats in Skopje time regardless of the server time zone', () => {
    expect(formatDate('2026-10-04T16:18:00Z', 'en', 'time')).toBe('18:18');
    expect(hourInSkopje(canvasNow)).toBe(18);
  });

  it('formats Macedonian dates', () => {
    expect(formatDate(canvasNow, 'mk', 'date')).toMatch(/2026/);
  });
});
