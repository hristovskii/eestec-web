import { z } from 'zod';

import { REGISTER_LIMITS } from '../domain/register-form';
import { passwordProblem } from './member-auth.schema';

// /profile › Account: changing the password and the e-mail address. Messages are keys of
// `auth.errors`. The new password is held to the sign-up rules, which need to know who it is for.

/** The browser and the server both check this (`person` is the signed-in member). */
export const changePasswordSchema = (person: { email: string; name: string }) =>
  z
    .object({
      current: z.string().min(1, 'required'),
      next: z.string().min(1, 'required'),
    })
    .superRefine((values, context) => {
      if (values.next === '') return;
      const problem = passwordProblem(values.next, person);
      if (problem) context.addIssue({ code: 'custom', path: ['next'], message: problem });
      else if (values.next === values.current)
        context.addIssue({ code: 'custom', path: ['next'], message: 'passwordSame' });
    });

export const changeEmailSchema = z.object({
  email: z.string().trim().max(REGISTER_LIMITS.email, 'tooLong').min(1, 'required').pipe(z.email('email')),
  password: z.string().min(1, 'required'),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'required'),
  alsoDeleteMemories: z.boolean(),
});
