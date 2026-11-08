'use server';

import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { authRepository } from '../data';
import {
  forgotPasswordSchema,
  memberSignInSchema,
  passwordProblem,
  resendConfirmationSchema,
  resetPasswordSchema,
} from '../schemas/member-auth.schema';
import type { ResetPasswordResult, SignInMemberResult } from '../types';

// /login, /forgot-password and /reset-password. The answers never say whether an e-mail has an account
// (except the sign-up form, which is drawn that way).

const invalid = (error: { path: readonly PropertyKey[]; message: string }[]): ActionResult<never> => ({
  ok: false,
  error: 'validation',
  fieldErrors: fieldErrorsFrom(error),
});

export async function signInMember(input: unknown): Promise<ActionResult<SignInMemberResult>> {
  const parsed = memberSignInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  return ok(await (await authRepository()).signInMember({ ...parsed.data, now: now() }));
}

/** Always "ok": whether or not the address has an account, the answer is the same. */
export async function requestMemberPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  await (await authRepository()).requestPasswordReset({ ...parsed.data, now: now() });
  return ok(undefined);
}

export async function resendConfirmationEmail(input: unknown): Promise<ActionResult> {
  const parsed = resendConfirmationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  await (await authRepository()).resendConfirmation({ ...parsed.data, now: now() });
  return ok(undefined);
}

/** `expired`: the link is used up or too old (the page then offers a new one). */
export async function resetMemberPassword(input: unknown): Promise<ActionResult<ResetPasswordResult>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const repo = await authRepository();
  const at = now();
  const link = await repo.peekToken({ token: parsed.data.token, kind: 'reset', now: at });
  if (link.state !== 'valid') return ok({ status: 'expired' });
  // The rules depend on whose password it is (not the e-mail, not the name).
  const problem = passwordProblem(parsed.data.password, link);
  if (problem) return invalid([{ path: ['password'], message: problem }]);
  return ok(await repo.resetPassword({ token: parsed.data.token, password: parsed.data.password, now: at }));
}
