import { z } from 'zod';

import { EVENT_SCOPES } from '../types';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

export const ARCHIVE_PAGE_SIZE = 12;

/**
 * /events?tab=local|international&type=<slug>&year=&q=&sort=newest|oldest|title&page=
 * Invalid values fall back to the defaults instead of failing (decided: filters live in the URL).
 */
export const archiveParamsSchema = z.object({
  tab: z.preprocess(first, z.enum(EVENT_SCOPES).catch('local')),
  type: z.preprocess(
    first,
    z
      .string()
      .regex(/^[a-z0-9-]{1,64}$/)
      .optional()
      .catch(undefined),
  ),
  year: z.preprocess(first, z.coerce.number().int().min(1990).max(2100).optional().catch(undefined)),
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  sort: z.preprocess(first, z.enum(['newest', 'oldest', 'title']).catch('newest')),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1)),
});

export type ArchiveParams = z.infer<typeof archiveParamsSchema>;

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
