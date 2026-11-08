import { MEMORY_SORTS, type MemorySort } from '../types';

// /memories address helpers, without zod: the filter controls (client components) build addresses
// with these; the schema in `memories-params.schema.ts` stays off the page.

export type MemoriesParams = {
  q?: string | undefined;
  /** An event's address (slug). */
  event?: string | undefined;
  year?: number | undefined;
  /** "City, Country" as the place list writes it. */
  place?: string | undefined;
  /** A member's profile address (username). */
  author?: string | undefined;
  sort: MemorySort;
  page: number;
};

export const MEMORIES_DEFAULTS = { sort: 'newest', page: '1' } as const;

const KEYS = ['q', 'event', 'year', 'place', 'author', 'sort', 'page'] as const;

/** `/memories?…` for these params with `patch` applied; filters other than the page reset it. */
export function memoriesHref(
  params: MemoriesParams,
  patch: Partial<Record<keyof MemoriesParams, string | number | null>>,
): string {
  const next = new URLSearchParams();
  const merged: Record<string, string | number | undefined | null> = { ...params, ...patch };
  if (!('page' in patch)) merged.page = null;
  for (const key of KEYS) {
    const value = merged[key];
    if (value === null || value === undefined || value === '') continue;
    if (MEMORIES_DEFAULTS[key as keyof typeof MEMORIES_DEFAULTS] === String(value)) continue;
    next.set(key, String(value));
  }
  const query = next.toString();
  return query ? `/memories?${query}` : '/memories';
}

/** Filters that narrow the list (the empty state lists them as removable tags). */
export const hasMemoryFilters = (params: MemoriesParams) =>
  Boolean(params.q || params.event || params.year || params.place || params.author);

export { MEMORY_SORTS };
