import { z } from 'zod';

import { MESSAGE_LIMITS } from './message-fields';

// The schema the browser and the server both check. The browser loads this file only when the form
// is first used (zod is about 90 KB), so the constants live in `message-fields.ts`.
export * from './message-fields';

const trimmed = (max: number) => z.string().trim().max(max, 'tooLong');

/** `subjectIds`: the subjects the board offers now; anything else is not a choice. */
export const buildContactSchema = (subjectIds: readonly string[]) =>
  z.object({
    name: trimmed(MESSAGE_LIMITS.name).min(1, 'name'),
    email: trimmed(MESSAGE_LIMITS.email).min(1, 'email').pipe(z.email('email')),
    subject: z.string().refine((value) => subjectIds.includes(value), 'subject'),
    message: trimmed(MESSAGE_LIMITS.message).min(1, 'message'),
    consent: z.literal(true, 'consent'),
  });
