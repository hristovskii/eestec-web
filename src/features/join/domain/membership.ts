import { z } from 'zod';

import { MEMBERSHIP_LIMITS, YEARS_OF_STUDY } from './membership-fields';

// The schema the browser and the server both check. The browser loads this file only when the form
// is first used (zod is about 90 KB), so the constants live in `membership-fields.ts`.
export * from './membership-fields';

/** Faculty, interests and "how did you hear" are lists the board keeps: only their ids are accepted. */
export function buildMembershipSchema(options: {
  faculties: string[];
  interests: string[];
  heardFrom: string[];
}) {
  const trimmed = (max: number) => z.string().trim().max(max, 'tooLong');
  return z.object({
    name: trimmed(MEMBERSHIP_LIMITS.name).min(1, 'required'),
    email: trimmed(MEMBERSHIP_LIMITS.email).min(1, 'required').pipe(z.email('email')),
    // Numbers people actually write: digits, spaces, + - ( ) and a dot.
    phone: trimmed(MEMBERSHIP_LIMITS.phone).refine(
      (value) => value === '' || /^[+\d][\d\s()./-]{4,}$/.test(value),
      'phone',
    ),
    faculty: z.string().refine((value) => options.faculties.includes(value), 'required'),
    program: trimmed(MEMBERSHIP_LIMITS.program).min(1, 'required'),
    year: z.enum(YEARS_OF_STUDY, 'year'),
    interests: z
      .array(z.string())
      .refine((values) => values.every((value) => options.interests.includes(value)), 'invalid'),
    heardFrom: z.string().refine((value) => value === '' || options.heardFrom.includes(value), 'invalid'),
    consent: z.literal(true, 'consent'),
  });
}
