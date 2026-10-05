import type { Locale } from './routing';

// Dates and times for the site and the admin (docs/ARCHITECTURE.md §7). English uses en-GB day-month
// order like the canvas ("Sunday, 4 October 2026"), not US order; everything is in Skopje time.
const INTL_LOCALE: Record<Locale, string> = { mk: 'mk-MK', en: 'en-GB' };
export const TIME_ZONE = 'Europe/Skopje';

const presets = {
  /** Sunday, 4 October 2026 */
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  /** 18 Oct 2026 */
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  /** 18 Oct 2026, 23:59 */
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  /** Sat 7 Nov, 10:00 */
  shortDateTime: { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
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
  // Newer ICU writes "Sept" in en-GB; the design uses three-letter months ("30 Sep").
  return locale === 'en' ? text.replace(/\bSept\b/, 'Sep') : text;
}

/** Hour of the day in Skopje (0–23). */
export function hourInSkopje(date: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TIME_ZONE }).format(date),
  );
}
