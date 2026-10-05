import { z } from 'zod';

import { ACTIVITY_AREAS } from '../types';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

export const ACTIVITY_PAGE_SIZES = [25, 50, 100] as const;

/** /admin/activity?area=&person=&page=&size= — invalid values fall back to defaults. */
export const activityParamsSchema = z.object({
  area: z.preprocess(first, z.enum(ACTIVITY_AREAS).optional().catch(undefined)),
  person: z.preprocess(first, z.string().max(60).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (ACTIVITY_PAGE_SIZES as readonly number[]).includes(n))
      .catch(25),
  ),
});
export type ActivityParams = z.infer<typeof activityParamsSchema>;
