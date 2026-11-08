import { z } from 'zod';

import { checkPassword, passwordAccepted } from '../domain/password';

// Log in, forgot password, reset password. Messages are keys of `auth.errors`.

const locale = z.enum(['mk', 'en']);

export const memberSignInSchema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  password: z.string().min(1, 'required'),
  remember: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  locale,
});

export const resendConfirmationSchema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(1, 'required'),
});

/** The first rule a new password breaks (a key of `auth.errors`), or null. */
export function passwordProblem(
  password: string,
  person: { email: string; name: string },
): 'passwordShort' | 'passwordPersonal' | 'passwordCommon' | null {
  const checks = checkPassword(password, person);
  if (passwordAccepted(checks)) return null;
  return !checks.length ? 'passwordShort' : !checks.personal ? 'passwordPersonal' : 'passwordCommon';
}
