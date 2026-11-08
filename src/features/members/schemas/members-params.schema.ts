import { z } from 'zod';

import { MEMBER_SORTS } from '../types';

export { ALUMNI_PREVIEW, MEMBERS_PAGE_SIZE, membersHref, type MembersParams } from './members-href';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/** Invalid values fall back to the defaults instead of failing (decided: filters live in the URL). */
export const membersParamsSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  team: z.preprocess(
    first,
    z
      .string()
      .regex(/^[a-z0-9-]{1,64}$/)
      .optional()
      .catch(undefined),
  ),
  year: z.preprocess(
    first,
    z
      .string()
      .regex(/^\d{4}(-or-earlier)?$/)
      .optional()
      .catch(undefined),
  ),
  sort: z.preprocess(first, z.enum(MEMBER_SORTS).catch('name')),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1)),
  board: z.preprocess(
    first,
    z
      .string()
      .regex(/^\d{4}\/\d{4}$/)
      .optional()
      .catch(undefined),
  ),
  alumni: z.preprocess(first, z.literal('all').optional().catch(undefined)),
  aq: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
});
