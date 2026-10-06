import { yearInSkopje } from '@/shared/i18n/format';

// Application references ("AIE-2026-0042", UpcomingStates): three letters from the event's
// address, the year of the event and a running number per event.

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to', 'with']);

/** "ai-at-the-edge" → "AIE", "leading-teams" → "LEA". */
export function referencePrefix(slug: string): string {
  const words = slug.split('-').filter((word) => word && !SMALL_WORDS.has(word));
  const letters = words.join('').replace(/[^a-z0-9]/g, '');
  return (letters.slice(0, 3) || 'app').toUpperCase().padEnd(3, 'X');
}

export function formatReference(prefix: string, startsAt: string, number: number): string {
  return `${prefix}-${yearInSkopje(startsAt)}-${String(number).padStart(4, '0')}`;
}
