import { z } from 'zod';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/** /submit?tab=idea|impression&event=<slug>: a bad value falls back instead of failing. */
export const submitParamsSchema = z.object({
  tab: z.preprocess(first, z.enum(['idea', 'impression']).catch('idea')),
  event: z.preprocess(
    first,
    z
      .string()
      .regex(/^[a-z0-9-]{1,80}$/)
      .optional()
      .catch(undefined),
  ),
});
