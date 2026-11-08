import { z } from 'zod';

export { profileHref, type ProfileParams } from './profile-href';

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

/** Invalid values fall back to the defaults. */
export const profileParamsSchema = z.object({
  events: z.preprocess(first, z.enum(['all', 'organized', 'attended']).catch('all')),
  show: z.preprocess(first, z.literal('all').optional().catch(undefined)),
});
