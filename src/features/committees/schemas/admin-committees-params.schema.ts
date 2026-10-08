import { z } from 'zod';

import { COMMITTEE_STATUSES } from '../types';

/** Rows per page (the table-pagination choices; a client module, so not imported here). */
export const COMMITTEE_PAGE_SIZES = [25, 50, 100] as const;

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/** /admin/pages/map?q=&status=&country=&sort=&page=&size= (invalid values fall back to defaults). */
export const adminCommitteesParamsSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  status: z.preprocess(first, z.enum(COMMITTEE_STATUSES).optional().catch(undefined)),
  country: z.preprocess(
    first,
    z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional()
      .catch(undefined),
  ),
  sort: z.preprocess(
    first,
    z.enum(['name', '-name', 'country', '-country', 'status']).optional().catch(undefined),
  ),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (COMMITTEE_PAGE_SIZES as readonly number[]).includes(n))
      .catch(COMMITTEE_PAGE_SIZES[0]),
  ),
});

export type AdminCommitteesParams = z.infer<typeof adminCommitteesParamsSchema>;

export const hasCommitteeFilters = (params: AdminCommitteesParams) =>
  Boolean(params.q || params.status || params.country);
