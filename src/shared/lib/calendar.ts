import { dayInSkopje, TIME_ZONE } from '@/shared/i18n/format';

// "Add to calendar" (ApplyBox): a Google Calendar link and an .ics file (Apple Calendar, Outlook).
// Times are written in UTC, so every calendar shows them in its own time zone; all-day events use
// dates, with the end date after the last day (RFC 5545).

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string;
  description: string;
  /** The event page. */
  url: string;
};

const compactDay = (iso: string) => dayInSkopje(iso).replaceAll('-', '');
const nextDay = (iso: string) => {
  const day = new Date(`${dayInSkopje(iso)}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10).replaceAll('-', '');
};
const utcStamp = (iso: string | Date) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

function range(event: CalendarEvent): [string, string] {
  return event.allDay
    ? [compactDay(event.startsAt), nextDay(event.endsAt)]
    : [utcStamp(event.startsAt), utcStamp(event.endsAt)];
}

const details = (event: CalendarEvent) => [event.description, event.url].filter(Boolean).join('\n\n');

export function googleCalendarUrl(event: CalendarEvent): string {
  const [start, end] = range(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: details(event),
    location: event.location,
    ctz: TIME_ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Text values: backslash, semicolon, comma and line breaks are escaped. */
const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const length = new TextEncoder().encode(char).length;
    if (size + length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += length;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function toIcs(event: CalendarEvent, { stamp, host }: { stamp: Date; host: string }): string {
  const [start, end] = range(event);
  const dates = event.allDay
    ? [`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`]
    : [`DTSTART:${start}`, `DTEND:${end}`];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${host}//Events//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@${host}`,
    `DTSTAMP:${utcStamp(stamp)}`,
    ...dates,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(details(event))}`,
    `LOCATION:${escapeText(event.location)}`,
    `URL:${event.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
