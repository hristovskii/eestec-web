import { z } from 'zod';

import { MEMORY_SORTS } from '../types';

export { hasMemoryFilters, MEMORIES_DEFAULTS, memoriesHref, type MemoriesParams } from './memories-href';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

const text = (max: number) =>
  z
    .preprocess(first, z.string().trim().max(max).optional().catch(undefined))
    .transform((value) => value || undefined);

/**
 * /memories?q=&event=<slug>&year=&place=&author=<username>&sort=newest|oldest&page=
 * Invalid values fall back to the defaults instead of failing (filters live in the URL).
 */
export const memoriesParamsSchema = z.object({
  q: text(100),
  event: z.preprocess(
    first,
    z
      .string()
      .regex(/^[a-z0-9-]{1,80}$/)
      .optional()
      .catch(undefined),
  ),
  year: z.preprocess(first, z.coerce.number().int().min(1990).max(2100).optional().catch(undefined)),
  place: text(120),
  author: z.preprocess(
    first,
    z
      .string()
      .regex(/^[a-z0-9-]{1,40}$/)
      .optional()
      .catch(undefined),
  ),
  sort: z.preprocess(first, z.enum(MEMORY_SORTS).catch('newest')),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1)),
});
