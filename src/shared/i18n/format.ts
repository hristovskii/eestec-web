import type { Locale } from './routing';

// Dates and times for the site and the admin (docs/ARCHITECTURE.md §7). English uses en-GB day-month
// order like the canvas ("Sunday, 4 October 2026"), not US order; everything is in Skopje time.
const INTL_LOCALE: Record<Locale, string> = { mk: 'mk-MK', en: 'en-GB' };
export const TIME_ZONE = 'Europe/Skopje';

const presets = {
  /** Sunday, 4 October 2026 */
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  /** 2 Oct */
  dayMonth: { day: 'numeric', month: 'short' },
  /** 18 Oct 2026 */
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  /** 18 Oct 2026, 23:59 */
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  /** Sat 7 Nov, 10:00 */
  shortDateTime: { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  /** Sat 7 Nov */
  weekdayDate: { weekday: 'short', day: 'numeric', month: 'short' },
  /** Sat 14 Nov 2026 */
  dayDate: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
  /** Mon 9 Dec 2024, 18:00 */
  dayDateTime: {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  /** 18:00 */
  time: { hour: '2-digit', minute: '2-digit' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DatePreset = keyof typeof presets;

export function formatDate(date: Date | string, locale: Locale, preset: DatePreset): string {
  const text = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    ...presets[preset],
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
  }).format(typeof date === 'string' ? new Date(date) : date);
  // Newer ICU writes "Sept" in en-GB; the design uses three-letter months ("30 Sep") and no comma
  // after the weekday ("Mon 9 Dec 2024").
  return locale === 'en' ? text.replace(/\bSept\b/, 'Sep').replace(/^([A-Z][a-z]{2}),/, '$1') : text;
}

/** Hour of the day in Skopje (0–23). */
export function hourInSkopje(date: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TIME_ZONE }).format(date),
  );
}

/** The calendar day in Skopje, as YYYY-MM-DD (for "today" / "yesterday" comparisons). */
export function dayInSkopje(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(date));
}

/** Year in Skopje (events starting on 1 January just after midnight count for that year). */
export function yearInSkopje(date: Date | string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: TIME_ZONE }).format(new Date(date)),
  );
}

/**
 * "7–13 Nov 2026", "14 Nov 2026", "28 Nov – 2 Dec 2026", "30 Dec 2026 – 2 Jan 2027" (EventCard,
 * AdminEvents). Days only on both sides close up around the dash, like the canvas.
 */
export function formatDateRange(start: Date | string, end: Date | string, locale: Locale): string {
  const text = new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...presets.date, timeZone: TIME_ZONE })
    .formatRange(new Date(start), new Date(end))
    // ICU puts thin or narrow spaces around the dash; use plain ones.
    .replace(/[\u2009\u202f\u00a0]/g, ' ')
    .replace(/^(\d+)\s*–\s*(\d+)(?=\s)/, '$1–$2');
  return locale === 'en' ? text.replace(/\bSept\b/, 'Sep') : text;
}

/**
 * With weekdays, for event pages: "Sat 7 – Fri 13 Nov 2026", "Sat 28 Nov – Wed 2 Dec 2026",
 * "Sat 14 Nov 2026" (UpcomingDetail).
 */
export function formatDayRange(start: Date | string, end: Date | string, locale: Locale): string {
  const [from, to] = [new Date(start), new Date(end)];
  const part = (date: Date, options: Intl.DateTimeFormatOptions) => {
    const text = new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...options, timeZone: TIME_ZONE }).format(
      date,
    );
    return locale === 'en' ? text.replace(/^([A-Z][a-z]{2}),/, '$1') : text;
  };
  const full = (date: Date) => formatDate(date, locale, 'dayDate');
  if (dayInSkopje(from) === dayInSkopje(to)) return full(from);
  const sameYear = yearInSkopje(from) === yearInSkopje(to);
  const sameMonth = sameYear && dayInSkopje(from).slice(0, 7) === dayInSkopje(to).slice(0, 7);
  const first = sameMonth
    ? part(from, { weekday: 'short', day: 'numeric' })
    : sameYear
      ? part(from, { weekday: 'short', day: 'numeric', month: 'short' })
      : full(from);
  const text = `${first} – ${full(to)}`;
  return locale === 'en' ? text.replace(/\bSept\b/g, 'Sep') : text;
}
