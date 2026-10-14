import type { ArchiveSort, EventScope } from '../types';

// Archive address helpers, without zod: the filter chips (a client component) build addresses with
// these, and the schema in `archive-params.schema.ts` (about 90 KB of zod) stays off the page.

export const ARCHIVE_PAGE_SIZE = 12;

/** /events?tab=…&type=…: the values the page works with (the schema's output). */
export type ArchiveParams = {
  tab: EventScope;
  type?: string | undefined;
  year?: number | undefined;
  q?: string | undefined;
  sort: ArchiveSort;
  page: number;
};

/** Values that are the defaults are left out of URLs (clean addresses). */
export const ARCHIVE_DEFAULTS = { tab: 'local', sort: 'newest', page: '1' } as const;

/** `/events?…` for these params with `patch` applied; filters other than the page reset it. */
export function archiveHref(
  params: ArchiveParams,
  patch: Partial<Record<keyof ArchiveParams, string | number | null>>,
) {
  const next = new URLSearchParams();
  const merged: Record<string, string | number | undefined | null> = { ...params, ...patch };
  if (!('page' in patch)) merged.page = null;
  for (const key of ['tab', 'type', 'year', 'q', 'sort', 'page'] as const) {
    const value = merged[key];
    if (value === null || value === undefined || value === '') continue;
    if (ARCHIVE_DEFAULTS[key as keyof typeof ARCHIVE_DEFAULTS] === String(value)) continue;
    next.set(key, String(value));
  }
  const query = next.toString();
  return query ? `/events?${query}` : '/events';
}

/** Filters that narrow the tab (the empty state lists them as removable tags). */
export const hasArchiveFilters = (params: ArchiveParams) => Boolean(params.type || params.year || params.q);
