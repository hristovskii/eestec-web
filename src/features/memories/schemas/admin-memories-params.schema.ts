import { z } from 'zod';

import { MEMORY_STATUSES } from '../types';

export const MEMORY_PAGE_SIZES = [10, 25, 50] as const;

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/** /admin/memories?status=&q=&page=&size= (invalid values fall back to the defaults). */
export const adminMemoriesParamsSchema = z.object({
  status: z.preprocess(first, z.enum(['all', ...MEMORY_STATUSES]).catch('all')),
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .pipe(z.union([z.literal(10), z.literal(25), z.literal(50)]))
      .catch(10),
  ),
});

export type AdminMemoriesParams = z.infer<typeof adminMemoriesParamsSchema>;
