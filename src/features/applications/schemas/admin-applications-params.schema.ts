import { z } from 'zod';

import { APPLICATION_STATUSES } from '../types';

/** Rows per page (the table-pagination choices; a client module, so not imported here). */
export const APPLICATION_PAGE_SIZES = [25, 50, 100] as const;

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);
const id = z.string().regex(/^[\w-]{1,64}$/);

/**
 * /admin/applications?tab=upcoming|past (events), or ?event=<id>&status=&q=&sort=&page=&size=&open=<id>
 * (one event's applications; `open` shows one application). Invalid values fall back to defaults.
 */
export const adminApplicationsParamsSchema = z.object({
  event: z.preprocess(first, id.optional().catch(undefined)),
  tab: z.preprocess(first, z.enum(['upcoming', 'past']).catch('upcoming')),
  status: z.preprocess(first, z.enum(APPLICATION_STATUSES).optional().catch(undefined)),
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  sort: z.preprocess(first, z.enum(['newest', 'oldest', 'name', 'waitlist']).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (APPLICATION_PAGE_SIZES as readonly number[]).includes(n))
      .catch(APPLICATION_PAGE_SIZES[0]),
  ),
  open: z.preprocess(first, id.optional().catch(undefined)),
});

export type AdminApplicationsParams = z.infer<typeof adminApplicationsParamsSchema>;

/** The waitlist tab lists in waitlist order; everything else newest first. */
export const sortOf = (params: AdminApplicationsParams) =>
  params.sort ?? (params.status === 'waitlist' ? 'waitlist' : 'newest');
