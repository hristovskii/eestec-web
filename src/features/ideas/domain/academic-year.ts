import { isoToZoned, zonedToIso } from '@/shared/lib/zoned-time';

// The academic year starts on 1 September (the Ratings view's "Academic year 2025/26").

/** The year an academic year starts in, for a moment: 1 Oct 2026 → 2026, 1 Jun 2026 → 2025. */
export function academicYearOf(iso: string): number {
  const { date } = isoToZoned(iso);
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 9 ? year : year - 1;
}

/** "2025/26". */
export const academicYearLabel = (start: number) => `${start}/${String((start + 1) % 100).padStart(2, '0')}`;

/** [from, until) as moments: 1 Sep 00:00 to the next 1 Sep 00:00 (Skopje). */
export function academicYearRange(start: number): { from: string; until: string } {
  return {
    from: zonedToIso(`${start}-09-01`, '00:00') ?? `${start}-09-01T00:00:00Z`,
    until: zonedToIso(`${start + 1}-09-01`, '00:00') ?? `${start + 1}-09-01T00:00:00Z`,
  };
}
