import type { EventTiming } from '../types';

// Upcoming vs past is always computed from the end date (D1): nothing moves an event, the lists
// just ask the clock. Pure, so the boundaries are unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Upcoming until the end date-time has passed. */
export const eventTiming = (event: { endsAt: string }, now: Date): EventTiming =>
  Date.parse(event.endsAt) >= now.getTime() ? 'upcoming' : 'past';

/** "Just ended" badge: past, and ended at most `justEndedDays` ago (Settings › Events). */
export const justEnded = (event: { endsAt: string }, now: Date, justEndedDays: number): boolean => {
  const ended = Date.parse(event.endsAt);
  return ended < now.getTime() && now.getTime() - ended <= justEndedDays * DAY_MS;
};

/** The public path of an event right now: /upcoming/<slug> until it ends, then /events/<slug>. */
export const eventPath = (event: { slug: string; endsAt: string }, now: Date) =>
  `/${eventTiming(event, now) === 'upcoming' ? 'upcoming' : 'events'}/${event.slug}`;
