import { z } from 'zod';

import { INQUIRY_INTERESTS } from '../types';
import { INQUIRY_LIMITS } from './inquiry-fields';

// The schema the browser and the server both check. The browser loads this file only when the form
// is first used (zod is about 90 KB), so the constants live in `inquiry-fields.ts`.
export * from './inquiry-fields';

const trimmed = (max: number) => z.string().trim().max(max, 'tooLong');

export const inquirySchema = z.object({
  company: trimmed(INQUIRY_LIMITS.company).min(1, 'required'),
  person: trimmed(INQUIRY_LIMITS.person).min(1, 'required'),
  email: trimmed(INQUIRY_LIMITS.email).min(1, 'required').pipe(z.email('email')),
  // Numbers people actually write: digits, spaces, + - ( ) and a dot.
  phone: trimmed(INQUIRY_LIMITS.phone).refine(
    (value) => value === '' || /^[+\d][\d\s()./-]{4,}$/.test(value),
    'phone',
  ),
  interests: z
    .array(z.enum(INQUIRY_INTERESTS, 'invalid'))
    .min(1, 'interests')
    // The same choice twice is one choice.
    .transform((values) => [...new Set(values)]),
  message: trimmed(INQUIRY_LIMITS.message).min(1, 'required').min(INQUIRY_LIMITS.minMessage, 'tooShort'),
  consent: z.literal(true, 'consent'),
});
