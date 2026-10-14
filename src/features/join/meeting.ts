import 'server-only';

import { cacheLife } from 'next/cache';
import { getTranslations } from 'next-intl/server';

import { getSiteSettings } from '@/features/settings/server';
import { SITE_URL } from '@/shared/config/site';
import { formatDate } from '@/shared/i18n/format';
import { getPathname } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { type CalendarEvent, googleCalendarUrl, toIcs } from '@/shared/lib/calendar';
import { now } from '@/shared/lib/now';

/** The weekly meeting lasts an hour in the calendar file (Settings has no end time). */
const MEETING_MS = 60 * 60 * 1000;

async function meetingEvent(locale: Locale): Promise<CalendarEvent | null> {
  const [settings, t] = await Promise.all([
    getSiteSettings(locale),
    getTranslations({ locale, namespace: 'join.success' }),
  ]);
  const { weeklyMeeting } = settings;
  if (!weeklyMeeting.showOnHome) return null;
  const startsAt = weeklyMeeting.nextAt;
  return {
    id: `weekly-meeting-${startsAt.slice(0, 10)}`,
    title: t('meetingTitle', { site: settings.siteName }),
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + MEETING_MS).toISOString(),
    allDay: false,
    location: weeklyMeeting.room,
    description: t('meetingDescription'),
    url: new URL(getPathname({ href: '/join', locale }), SITE_URL).toString(),
  };
}

/**
 * The next weekly meeting for the Join page: "Wed 7 Oct · 18:00 · Room 117, FEEIT", and the links
 * that add it to a calendar. null while Settings does not show the meeting.
 */
export async function getMeetingInfo(locale: Locale) {
  'use cache';
  cacheLife('events');
  const settings = await getSiteSettings(locale);
  const event = await meetingEvent(locale);
  if (!event) return null;
  const { weeklyMeeting } = settings;
  return {
    /** "Wed 7 Oct · 18:00 · Room 117, FEEIT" */
    text: `${formatDate(weeklyMeeting.nextAt, locale, 'weekdayDate')} · ${weeklyMeeting.time} · ${weeklyMeeting.room}`,
    /** "Wed 7 Oct, 18:00, Room 117, FEEIT" for the success message. */
    sentence: `${formatDate(weeklyMeeting.nextAt, locale, 'weekdayDate')}, ${weeklyMeeting.time}, ${weeklyMeeting.room}`,
    google: googleCalendarUrl(event),
    ics: getPathname({ href: '/join/calendar', locale }),
  };
}

/** /join/calendar: the next weekly meeting as an .ics download (Apple Calendar, Outlook). */
export async function meetingIcsResponse(locale: Locale): Promise<Response> {
  const event = await meetingEvent(locale);
  if (!event) return new Response('Not found', { status: 404 });
  const ics = toIcs(event, { stamp: now(), host: SITE_URL.hostname });
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="weekly-meeting.ics"',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
