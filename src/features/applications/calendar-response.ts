import 'server-only';

import { getEventPage } from '@/features/events/server';
import { SITE_URL } from '@/shared/config/site';
import { getPathname } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { toIcs } from './domain/calendar';

/** /upcoming/[slug]/calendar: the event as an .ics download (Apple Calendar, Outlook). */
export async function icsResponse(slug: string, locale: Locale): Promise<Response> {
  const page = await getEventPage(slug, locale);
  if (!page) return new Response('Not found', { status: 404 });
  const { event } = page;
  const url = new URL(getPathname({ href: `/upcoming/${event.slug}`, locale }), SITE_URL);
  const ics = toIcs(
    {
      id: event.id,
      title: event.title.text,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay,
      location: event.location.text,
      description: event.shortDescription.text,
      url: url.toString(),
    },
    { stamp: now(), host: SITE_URL.hostname },
  );
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
