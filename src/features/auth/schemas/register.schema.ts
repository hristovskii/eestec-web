import { z } from 'zod';

import { checkPassword } from '../domain/password';
import { REGISTER_LIMITS } from '../domain/register-form';
import { MEMBER_VISIBILITIES, MEMBER_YEARS } from '../types';

// The one schema the browser and the server both check. Messages are keys of `auth.errors`.

const trimmed = (max: number) => z.string().trim().max(max, 'tooLong');

export const registerSchema = z
  .object({
    name: trimmed(REGISTER_LIMITS.name).min(1, 'required'),
    email: trimmed(REGISTER_LIMITS.email).min(1, 'required').pipe(z.email('email')),
    password: z.string().min(1, 'required'),
    faculty: trimmed(REGISTER_LIMITS.faculty).min(1, 'required'),
    // Numbers people actually write: digits, spaces, + - ( ) and a dot.
    phone: trimmed(REGISTER_LIMITS.phone).refine(
      (value) => value === '' || /^[+\d][\d\s()./-]{4,}$/.test(value),
      'phone',
    ),
    year: z.enum(MEMBER_YEARS, 'year'),
    visibility: z.enum(MEMBER_VISIBILITIES, 'invalid'),
    consent: z.literal(true, 'consent'),
  })
  .superRefine((values, context) => {
    if (values.password === '') return;
    const checks = checkPassword(values.password, values);
    // One message, the first rule that is broken (the rules list under the field shows them all).
    const broken = !checks.length
      ? 'passwordShort'
      : !checks.personal
        ? 'passwordPersonal'
        : !checks.common
          ? 'passwordCommon'
          : null;
    if (broken) context.addIssue({ code: 'custom', path: ['password'], message: broken });
  });
