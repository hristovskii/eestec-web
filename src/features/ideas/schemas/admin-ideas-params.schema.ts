import { z } from 'zod';

import { SUBMISSION_STATUSES } from '../types';

// /admin/ideas?tab=ideas|feedback|ratings&status=&type=&event=&q=&page=&size=&open=<id>&year=
// Invalid values fall back to the defaults (filters and the open item live in the URL).

export const IDEAS_TABS = ['ideas', 'feedback', 'ratings'] as const;
export type IdeasTab = (typeof IDEAS_TABS)[number];

/** Rows per page in the lists (the first is the default). */
export const IDEAS_PAGE_SIZES = [25, 50, 100] as const;

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);
const id = z.string().regex(/^[\w-]{1,64}$/);

export const adminIdeasParamsSchema = z.object({
  tab: z.preprocess(first, z.enum(IDEAS_TABS).catch('ideas')),
  status: z.preprocess(first, z.enum(SUBMISSION_STATUSES).optional().catch(undefined)),
  /** An idea type id. */
  type: z.preprocess(first, id.optional().catch(undefined)),
  /** A feedback's event: its id, or `other:<name>`. */
  event: z.preprocess(first, z.string().trim().min(1).max(150).optional().catch(undefined)),
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (IDEAS_PAGE_SIZES as readonly number[]).includes(n))
      .catch(IDEAS_PAGE_SIZES[0]),
  ),
  open: z.preprocess(first, id.optional().catch(undefined)),
  /** Ratings: the academic year's first calendar year, or `all`; absent: the current one. */
  year: z.preprocess(
    first,
    z
      .union([z.literal('all'), z.coerce.number().int().min(2000).max(2100)])
      .optional()
      .catch(undefined),
  ),
});

export type AdminIdeasParams = z.infer<typeof adminIdeasParamsSchema>;
