'use server';

import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { authRepository } from '../data';
import { adminSignInSchema, passwordResetSchema, twoFactorSchema } from '../schemas/admin-sign-in.schema';
import type { SignInResult, TwoFactorResult } from '../types';

export async function signInAdmin(input: unknown): Promise<ActionResult<SignInResult>> {
  const parsed = adminSignInSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const result = await (await authRepository()).signInAdmin({ ...parsed.data, now: now() });
  return ok(result);
}

export async function verifyTwoFactor(input: unknown): Promise<ActionResult<TwoFactorResult>> {
  const parsed = twoFactorSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  return ok(await (await authRepository()).verifyTwoFactor({ ...parsed.data, now: now() }));
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  await (await authRepository()).requestPasswordReset(parsed.data);
  return ok(undefined);
}
