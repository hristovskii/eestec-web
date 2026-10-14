import { z } from 'zod';

import { EVENT_SCOPES } from '../types';

export {
  ARCHIVE_PAGE_SIZE,
  ARCHIVE_DEFAULTS,
  archiveHref,
  type ArchiveParams,
  hasArchiveFilters,
} from './archive-href';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

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
