import type { Locale } from '@/shared/i18n/routing';
import { resolveText } from '@/shared/i18n/localized';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';
import type { Localized } from '@/shared/types/localized';

import type { EventDetail, EventImage, EventLink, EventMediaRef, EventRecord, EventSummary } from '../types';
import { splitLeadingHeading } from './event-content';
import { eventTiming, justEnded } from './event-timing';

// Write model → public read models (one language, EN → MK per field). Used by every repository
// implementation, so the public pages look the same on mocks and on Supabase.

/** Listed on the site: published, and past its "Publish on" moment. Hidden events are by link only. */
export const isListed = (event: EventRecord, now: Date) =>
  event.status === 'published' && (!event.publishAt || Date.parse(event.publishAt) <= now.getTime());

/** Reachable by its address: listed, or hidden (also respecting "Publish on"). */
export const isReachable = (event: EventRecord, now: Date) =>
  (event.status === 'published' || event.status === 'hidden') &&
  (!event.publishAt || Date.parse(event.publishAt) <= now.getTime());

const hasText = (value: Localized) => value.mk.trim() !== '' || !!value.en?.trim();

/** Images without alt text never reach the public page (decided rule). */
const imageRef = (image: EventImage | null): EventMediaRef | null =>
  image && image.alt
    ? { mediaId: image.mediaId, alt: image.alt, ...(image.credit ? { credit: image.credit } : {}) }
    : null;

type Context = { locale: Locale; now: Date; justEndedDays: number; typeName: (id: string) => Localized };

export function toSummary(
  event: EventRecord,
  { locale, now, justEndedDays, typeName }: Context,
): EventSummary {
  return {
    id: event.id,
    slug: event.slug,
    title: resolveText(event.title, locale),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    typeName: resolveText(typeName(event.typeId), locale).text,
    scope: event.scope,
    place: resolveText(hasText(event.city) ? event.city : event.location, locale),
    cover: imageRef(event.cover),
    organizedByLc: event.organizer === null,
    justEnded: justEnded(event, now, justEndedDays),
  };
}

export function toDetail(event: EventRecord, context: Context): EventDetail {
  const { locale, now } = context;
  const description = resolveText(event.description, locale);
  const { heading, body } = splitLeadingHeading(sanitizeRichText(description.text));
  const seoTitle = resolveText(event.seo.title, locale).text;
  const seoDescription = resolveText(event.seo.description, locale).text;
  return {
    ...toSummary(event, context),
    timing: eventTiming(event, now),
    shortDescription: resolveText(event.shortDescription, locale),
    aboutTitle: heading ? { text: heading, lang: description.lang } : null,
    description: { text: body, lang: description.lang },
    location: resolveText(event.location, locale),
    organizer: event.organizer,
    participantCount: event.participantCount,
    countryCount: event.countryCount,
    gallery: event.gallery.map(imageRef).filter((image) => image !== null),
    infoPackId: event.infoPackId,
    videoUrl: event.videoUrl,
    seo: {
      title: seoTitle || resolveText(event.title, locale).text,
      description: seoDescription || resolveText(event.shortDescription, locale).text,
      shareImageId: event.seo.shareImageId ?? event.cover?.mediaId ?? null,
    },
  };
}

export const toLink = (event: EventRecord, locale: Locale): EventLink => ({
  slug: event.slug,
  title: resolveText(event.title, locale),
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  place: resolveText(hasText(event.city) ? event.city : event.location, locale),
});
