import type { MemberSort } from '../types';

// /members addresses, without zod: the filters (client components) build them with these, and the
// schema in `members-params.schema.ts` stays off the page.

export const MEMBERS_PAGE_SIZE = 15;
/** Alumni shown before "Show all". */
export const ALUMNI_PREVIEW = 9;

/**
 * /members?q=&team=<slug>&year=2025|2022-or-earlier&sort=newest|longest&page=&board=2025/2026&alumni=all&aq=
 * Values that are the defaults are left out of addresses.
 */
export type MembersParams = {
  q?: string | undefined;
  team?: string | undefined;
  year?: string | undefined;
  sort: MemberSort;
  page: number;
  board?: string | undefined;
  /** "all": every alumnus instead of the first nine. */
  alumni?: 'all' | undefined;
  /** Alumni search. */
  aq?: string | undefined;
};

export const MEMBERS_DEFAULTS = { sort: 'name', page: '1' } as const;

type Patch = Partial<Record<keyof MembersParams, string | number | null>>;

/** `/members?…#hash` for these params with `patch` applied; changing a member filter resets the page. */
export function membersHref(params: MembersParams, patch: Patch, hash?: 'board' | 'active' | 'alumni') {
  const next = new URLSearchParams();
  const merged: Record<string, string | number | undefined | null> = { ...params, ...patch };
  const resetsPage = ['q', 'team', 'year', 'sort'].some((key) => key in patch);
  if (!('page' in patch) && resetsPage) merged.page = null;
  for (const key of ['q', 'team', 'year', 'sort', 'page', 'board', 'alumni', 'aq'] as const) {
    const value = merged[key];
    if (value === null || value === undefined || value === '') continue;
    if (MEMBERS_DEFAULTS[key as keyof typeof MEMBERS_DEFAULTS] === String(value)) continue;
    next.set(key, String(value));
  }
  const query = next.toString();
  return `/members${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

/** The member filters that narrow the list (the empty state lists them as removable tags). */
export const hasMemberFilters = (params: MembersParams) => Boolean(params.q || params.team || params.year);

/** "2022-or-earlier" → { year: 2022, orEarlier: true }; "2025" → { year: 2025, orEarlier: false }. */
export function joinedFilter(year: string | undefined) {
  if (!year) return undefined;
  const match = /^(\d{4})(-or-earlier)?$/.exec(year);
  return match ? { year: Number(match[1]), orEarlier: !!match[2] } : undefined;
}

/** The "Joined" choices: this year and the three before, then "or earlier". */
export function joinedOptions(currentYear: number) {
  return [
    ...[0, 1, 2, 3].map((back) => ({
      value: String(currentYear - back),
      year: currentYear - back,
      earlier: false,
    })),
    { value: `${currentYear - 4}-or-earlier`, year: currentYear - 4, earlier: true },
  ];
}
