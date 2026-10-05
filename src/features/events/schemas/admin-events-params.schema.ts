import { z } from 'zod';

import { CONTENT_STATUSES, EVENT_SCOPES } from '../types';

/** Rows per page (the table-pagination choices; a client module, so not imported here). */
export const EVENT_PAGE_SIZES = [10, 25, 50] as const;

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/**
 * /admin/events?tab=upcoming|past&q=&status=&type=&year=&scope=&sort=&page=&size=
 * Invalid values fall back to the defaults instead of failing.
 */
export const adminEventsParamsSchema = z.object({
  tab: z.preprocess(first, z.enum(['upcoming', 'past']).optional().catch(undefined)),
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  status: z.preprocess(first, z.enum(CONTENT_STATUSES).optional().catch(undefined)),
  type: z.preprocess(
    first,
    z
      .string()
      .regex(/^[\w-]{1,64}$/)
      .optional()
      .catch(undefined),
  ),
  year: z.preprocess(first, z.coerce.number().int().min(2000).max(2100).optional().catch(undefined)),
  scope: z.preprocess(first, z.enum(EVENT_SCOPES).optional().catch(undefined)),
  /** No sort: upcoming soonest first, then past newest first. */
  sort: z.preprocess(first, z.enum(['title', '-title', 'dates', '-dates']).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (EVENT_PAGE_SIZES as readonly number[]).includes(n))
      .catch(EVENT_PAGE_SIZES[0]),
  ),
});

export type AdminEventsParams = z.infer<typeof adminEventsParamsSchema>;

/** Filters that make the list narrower than its tab (empty state: "No events match these filters"). */
export const hasEventFilters = (params: AdminEventsParams) =>
  Boolean(params.q || params.status || params.type || params.year || params.scope);
