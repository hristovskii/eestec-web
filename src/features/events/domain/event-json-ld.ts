import { absoluteUrl, compact, type JsonLd } from '@/shared/seo/json-ld';
import { isSampleMedia } from '@/shared/types/media';

import type { EventPageModel } from '../types';

type EventFacts = Pick<
  EventPageModel,
  'title' | 'startsAt' | 'endsAt' | 'allDay' | 'location' | 'organizer' | 'cover' | 'shareImage'
>;

type Options = {
  /** Origin of the site ("https://eestec.mk"). */
  origin: string;
  /** The address of the page in this language ("/en/upcoming/ai-at-the-edge"). */
  path: string;
  /** The association, shown as the organizer of its own events. */
  siteName: string;
  /** Plain-text description of the event (short description). */
  description: string;
};

/** All-day events carry a date only; the others the exact time with its offset. */
function when(value: string, allDay: boolean): string {
  return allDay ? value.slice(0, 10) : value;
}

/**
 * schema.org `Event` for an event page. Only what the board has filled in is emitted; nothing is
 * invented (no price, no online mode: the events are in person and the fee is free text).
 */
export function eventJsonLd(event: EventFacts, options: Options): JsonLd {
  const image = event.shareImage ?? (event.cover && !isSampleMedia(event.cover) ? event.cover : null);
  const organizer: JsonLd | null =
    event.organizer === null
      ? { '@type': 'Organization', name: options.siteName, url: options.origin }
      : event.organizer
        ? { '@type': 'Organization', name: event.organizer }
        : null;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title.text,
    description: options.description,
    url: absoluteUrl(options.origin, options.path),
    startDate: when(event.startsAt, event.allDay),
    endDate: when(event.endsAt, event.allDay),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: event.location.text
      ? { '@type': 'Place', name: event.location.text, address: event.location.text }
      : null,
    image: image ? [absoluteUrl(options.origin, image.src)] : null,
    organizer,
  });
}
