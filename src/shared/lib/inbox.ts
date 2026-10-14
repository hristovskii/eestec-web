import { isoToZoned } from './zoned-time';

// Small rules the three Inbox lists share (Admin › Inbox): the time shown on a list row, search
// matching, and the date range of "Export CSV". Dates are Skopje calendar days ("2026-10-04").

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Days since the epoch of a "YYYY-MM-DD" string (calendar arithmetic without time zones). */
const dayNumber = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
};

/**
 * What the list shows for when something arrived (AdminInbox): the time today, "Yesterday", the
 * weekday within the last week, else "28 Sep" (with the year when it is not this year).
 */
export function inboxTime(iso: string, now: Date): string {
  const at = isoToZoned(iso);
  const today = isoToZoned(now.toISOString()).date;
  const ago = dayNumber(today) - dayNumber(at.date);
  if (ago <= 0) return at.time;
  if (ago === 1) return 'Yesterday';
  if (ago < 6) return WEEKDAYS[new Date(dayNumber(at.date) * DAY_MS).getUTCDay()] ?? at.date;
  const [year = '', month = '1', day = '1'] = at.date.split('-');
  const label = `${Number(day)} ${MONTHS[Number(month) - 1] ?? ''}`;
  return year === today.slice(0, 4) ? label : `${label} ${year}`;
}

/** Every word of the search appears in at least one of the texts (any letter case). */
export function matchesQuery(query: string | undefined, ...texts: (string | undefined)[]): boolean {
  const words = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = texts.join(' ').toLowerCase();
  return words.every((word) => haystack.includes(word));
}

// ─── Export CSV ───

export const EXPORT_RANGES = ['30d', 'year', 'all', 'custom'] as const;
export type ExportRange = (typeof EXPORT_RANGES)[number];

export type ExportParams = {
  range: ExportRange;
  /** Custom range, "YYYY-MM-DD" (either may be missing). */
  from: string | null;
  to: string | null;
  /** Include the finished items (archived, done, rejected). */
  closed: boolean;
  /** Only what the list currently shows (its status, subject and search). */
  current: boolean;
  /** Answer with the number of rows instead of the file. */
  count: boolean;
};

const isDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** `?range=30d|year|all|custom&from=&to=&closed=0|1&current=1&count=1`; anything else falls back to the defaults. */
export function parseExportParams(searchParams: URLSearchParams): ExportParams {
  const range = searchParams.get('range');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  return {
    range: (EXPORT_RANGES as readonly string[]).includes(range ?? '') ? (range as ExportRange) : '30d',
    from: isDate(from) ? from : null,
    to: isDate(to) ? to : null,
    closed: searchParams.get('closed') !== '0',
    current: searchParams.get('current') === '1',
    count: searchParams.get('count') === '1',
  };
}

/** The academic year starts on 1 September: the start of the one `now` is in. */
export function academicYearStart(now: Date): string {
  const today = isoToZoned(now.toISOString()).date;
  const year = Number(today.slice(0, 4));
  return `${Number(today.slice(5, 7)) >= 9 ? year : year - 1}-09-01`;
}

/** The first and last day to include ("YYYY-MM-DD"; null: no limit). */
export function exportWindow(params: ExportParams, now: Date): { from: string | null; to: string | null } {
  const today = isoToZoned(now.toISOString()).date;
  switch (params.range) {
    case 'all':
      return { from: null, to: null };
    case 'year':
      return { from: academicYearStart(now), to: today };
    case 'custom':
      return { from: params.from, to: params.to };
    case '30d': {
      const start = new Date(dayNumber(today) * DAY_MS - 29 * DAY_MS);
      return { from: start.toISOString().slice(0, 10), to: today };
    }
  }
}

/** Is the moment (ISO) inside the window? Days are Skopje calendar days, both ends included. */
export function inWindow(iso: string, window: { from: string | null; to: string | null }): boolean {
  const day = isoToZoned(iso).date;
  return (!window.from || day >= window.from) && (!window.to || day <= window.to);
}
