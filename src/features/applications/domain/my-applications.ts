import type { Locale } from '@/shared/i18n/routing';

import type { Application, ApplicationStatus } from '../types';

/** One row of "My applications" on /profile. */
export type MyApplicationView = {
  id: string;
  status: ApplicationStatus;
  waitlistPosition: number | null;
  /** ISO date-time of the application. */
  appliedAt: string;
  title: string;
  lang: Locale;
  startsAt: string;
  endsAt: string;
  place: string;
  /** Where the event page is (/upcoming/… while it is ahead). */
  path: string;
  /** Withdrawing (or leaving the waitlist) is for events that have not ended. */
  canWithdraw: boolean;
};

type EventLine = {
  id: string;
  slug: string;
  title: { text: string; lang: Locale };
  startsAt: string;
  endsAt: string;
  place: { text: string };
  timing: 'upcoming' | 'past';
};

/** Newest first. Applications to events that are no longer listed are left out (there is nothing to open). */
export function toMyApplications(
  applications: readonly Application[],
  events: readonly EventLine[],
): MyApplicationView[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  return applications
    .flatMap((application): MyApplicationView[] => {
      const event = byId.get(application.eventId);
      if (!event) return [];
      return [
        {
          id: application.id,
          status: application.status,
          waitlistPosition: application.waitlistPosition,
          appliedAt: application.createdAt,
          title: event.title.text,
          lang: event.title.lang,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          place: event.place.text,
          path: `/${event.timing === 'upcoming' ? 'upcoming' : 'events'}/${event.slug}`,
          canWithdraw: event.timing === 'upcoming',
        },
      ];
    })
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}
