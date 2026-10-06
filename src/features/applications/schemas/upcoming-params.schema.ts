import { z } from 'zod';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/** /upcoming?scope=local|international (no pages: the list is short). Unknown values show all. */
export const upcomingParamsSchema = z.object({
  scope: z.preprocess(first, z.enum(['all', 'local', 'international']).catch('all')).default('all'),
});
