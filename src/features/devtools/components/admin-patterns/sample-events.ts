// SAMPLE DATA for the admin patterns lab, transcribed from handoff/design-source/AdminEvents.dc.html
// (renderVals). The real events list (M5) reads the events repository instead.

export type SampleStatus = 'published' | 'draft' | 'hidden';
export type SampleScope = 'local' | 'international';

export type SampleEventRow = {
  id: string;
  title: string;
  path: string;
  dates: string;
  /** For sorting and the year filter. */
  start: string;
  type: string;
  scope: SampleScope;
  status: SampleStatus;
  applications: string;
  edited: string;
  editedBy: string;
};

const row = (
  title: string,
  path: string,
  dates: string,
  start: string,
  type: string,
  scope: SampleScope,
  status: SampleStatus,
  applications: string,
  edited: string,
  editedBy: string,
): SampleEventRow => ({
  id: path.split('/')[1]!,
  title,
  path,
  dates,
  start,
  type,
  scope,
  status,
  applications,
  edited,
  editedBy,
});

export const SAMPLE_EVENT_ROWS: SampleEventRow[] = [
  row(
    'Workshop: AI at the Edge',
    'upcoming/ai-at-the-edge',
    '7–13 Nov 2026',
    '2026-11-07',
    'Workshop',
    'international',
    'published',
    '38',
    'Today, 16:02',
    'Ana Trajkovska',
  ),
  row(
    'Soft Skills Training: Leading Teams',
    'upcoming/leading-teams',
    '14 Nov 2026',
    '2026-11-14',
    'Training / Soft Skills',
    'local',
    'published',
    '23',
    'Yesterday',
    'Daniel Ristov',
  ),
  row(
    'Hands-on: FPGA Basics',
    'upcoming/fpga-basics',
    '21–22 Nov 2026',
    '2026-11-21',
    'Workshop',
    'local',
    'published',
    '27 · full',
    '2 Oct',
    'Daniel Ristov',
  ),
  row(
    'New Year Social 2026',
    'upcoming/new-year-social-2026',
    '18 Dec 2026',
    '2026-12-18',
    'Social',
    'local',
    'draft',
    '—',
    '1 Oct',
    'Marija Stojanovska',
  ),
  row(
    'EESTech Challenge 2027 — Local Round Skopje',
    'upcoming/eestech-challenge-2027',
    '13 Mar 2027',
    '2027-03-13',
    'Competition',
    'local',
    'draft',
    '—',
    '30 Sep',
    'Stefan Nikolovski',
  ),
  row(
    'Exchange: Kraków Winter Edition',
    'upcoming/krakow-winter-exchange',
    '4–8 Dec 2026',
    '2026-12-04',
    'Exchange',
    'international',
    'published',
    'External',
    '28 Sep',
    'Ana Trajkovska',
  ),
  row(
    'Soft Skills Academy Skopje 2026',
    'events/soft-skills-academy-2026',
    '12–14 Sep 2026',
    '2026-09-12',
    'Training / Soft Skills',
    'local',
    'published',
    '41',
    '20 Sep',
    'Marija Stojanovska',
  ),
  row(
    'FEEIT Career Day 2026',
    'events/feeit-career-day-2026',
    '20 May 2026',
    '2026-05-20',
    'Other',
    'local',
    'hidden',
    '—',
    '3 Jun',
    'Ana Trajkovska',
  ),
  row(
    'Workshop: Power Up — Renewable Grids',
    'events/power-up-2026',
    '18–24 May 2026',
    '2026-05-18',
    'Workshop',
    'international',
    'published',
    '64',
    '1 Jun',
    'Ana Trajkovska',
  ),
  row(
    'RoboMac 2026',
    'events/robomac-2026',
    '11 Apr 2026',
    '2026-04-11',
    'Competition',
    'local',
    'published',
    '—',
    '15 Apr',
    'Stefan Nikolovski',
  ),
];

export type SampleListQuery = {
  tab: 'all' | 'upcoming' | 'past';
  q: string;
  status: string;
  type: string;
  year: string;
  scope: string;
  sort: string;
  page: number;
  size: number;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

export function parseSampleListQuery(params: Record<string, string | string[] | undefined>): SampleListQuery {
  const tab = first(params.tab);
  const size = Number(first(params.size));
  const page = Number(first(params.page));
  return {
    tab: tab === 'upcoming' || tab === 'past' ? tab : 'all',
    q: first(params.q).trim(),
    status: first(params.status),
    type: first(params.type),
    year: first(params.year),
    scope: first(params.scope),
    sort: first(params.sort),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: [10, 25, 50].includes(size) ? size : 10,
  };
}

const isUpcoming = (row: SampleEventRow) => row.path.startsWith('upcoming/');

/** Filters, sorts and pages the sample rows like the real list will (server side, from the URL). */
export function listSampleEvents(query: SampleListQuery) {
  const inTab = SAMPLE_EVENT_ROWS.filter((r) =>
    query.tab === 'all' ? true : query.tab === 'upcoming' ? isUpcoming(r) : !isUpcoming(r),
  );
  const needle = query.q.toLowerCase();
  const filtered = inTab.filter(
    (r) =>
      (!needle || r.title.toLowerCase().includes(needle) || r.path.includes(needle)) &&
      (!query.status || r.status === query.status) &&
      (!query.type || r.type === query.type) &&
      (!query.year || r.start.startsWith(query.year)) &&
      (!query.scope || r.scope === query.scope),
  );
  const descending = query.sort.startsWith('-');
  const key = query.sort.replace(/^-/, '');
  const sorted =
    key === 'title' || key === 'dates'
      ? [...filtered].sort((a, b) => {
          const order = key === 'title' ? a.title.localeCompare(b.title) : a.start.localeCompare(b.start);
          return descending ? -order : order;
        })
      : filtered;
  const pageCount = Math.max(1, Math.ceil(sorted.length / query.size));
  const page = Math.min(query.page, pageCount);
  return {
    rows: sorted.slice((page - 1) * query.size, page * query.size),
    total: sorted.length,
    page,
    counts: {
      all: SAMPLE_EVENT_ROWS.length,
      upcoming: SAMPLE_EVENT_ROWS.filter(isUpcoming).length,
      past: SAMPLE_EVENT_ROWS.filter((r) => !isUpcoming(r)).length,
    },
    types: [...new Set(SAMPLE_EVENT_ROWS.map((r) => r.type))].sort(),
    years: [...new Set(SAMPLE_EVENT_ROWS.map((r) => r.start.slice(0, 4)))].sort().reverse(),
  };
}
