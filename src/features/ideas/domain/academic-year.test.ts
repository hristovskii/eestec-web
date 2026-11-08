import { describe, expect, it } from 'vitest';

import { academicYearLabel, academicYearOf, academicYearRange } from './academic-year';

describe('academic year', () => {
  it('starts on 1 September', () => {
    expect(academicYearOf('2026-10-04T12:00:00+02:00')).toBe(2026);
    expect(academicYearOf('2026-06-02T10:00:00+02:00')).toBe(2025);
    expect(academicYearOf('2026-08-31T23:00:00+02:00')).toBe(2025);
    expect(academicYearOf('2026-09-01T00:30:00+02:00')).toBe(2026);
  });

  it('is written 2025/26 and covers a year from one September to the next', () => {
    expect(academicYearLabel(2025)).toBe('2025/26');
    expect(academicYearLabel(2099)).toBe('2099/00');
    const range = academicYearRange(2025);
    expect(range.from < '2025-09-01T12:00:00Z' && range.from > '2025-08-31T00:00:00Z').toBe(true);
    expect(range.until > range.from).toBe(true);
    expect(academicYearOf(range.from)).toBe(2025);
    expect(academicYearOf(range.until)).toBe(2026);
  });
});
