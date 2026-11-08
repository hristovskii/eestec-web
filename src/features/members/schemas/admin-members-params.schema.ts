import { z } from 'zod';

import { ADMIN_MEMBER_SORTS, PROFILE_STATUSES } from '../types';

/** Rows per page (the table-pagination choices; a client module, so not imported here). */
export const MEMBER_PAGE_SIZES = [25, 50, 100] as const;

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/** /admin/members?q=&status=&team=&sort=&page=&size= (invalid values fall back to defaults). */
export const adminMembersParamsSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  status: z.preprocess(first, z.enum(PROFILE_STATUSES).optional().catch(undefined)),
  team: z.preprocess(
    first,
    z
      .string()
      .regex(/^[a-z0-9-]{1,64}$/)
      .optional()
      .catch(undefined),
  ),
  sort: z.preprocess(first, z.enum(ADMIN_MEMBER_SORTS).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (MEMBER_PAGE_SIZES as readonly number[]).includes(n))
      .catch(MEMBER_PAGE_SIZES[0]),
  ),
});

export type AdminMembersParams = z.infer<typeof adminMembersParamsSchema>;

export const hasMemberAdminFilters = (params: AdminMembersParams) =>
  Boolean(params.q || params.status || params.team);
