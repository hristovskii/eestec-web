'use server';

import { z } from 'zod';

import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { changeMemberPassword, requestEmailChange } from '../account';
import { currentMember } from '../guards';
import { passwordFailure } from './password-failure';
import { changeEmailSchema, changePasswordSchema } from '../schemas/account.schema';

// /profile › Account. Who the member is comes from the session. Wrong passwords count like at
// sign-in (5 tries, then 15 minutes).

export async function changeMyPassword(input: unknown): Promise<ActionResult> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = changePasswordSchema(session).safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const result = await changeMemberPassword(session.userId, parsed.data.current, parsed.data.next);
  if (result.status !== 'ok') return passwordFailure(result, 'current');
  return ok(undefined);
}

/** Sends the confirmation link to the NEW address; the address changes when it is used. */
export async function requestMyEmailChange(
  input: unknown,
  locale: unknown,
): Promise<ActionResult<{ email: string }>> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const parsedLocale = z.enum(['mk', 'en']).safeParse(locale);
  const parsed = changeEmailSchema.safeParse(input);
  if (!parsedLocale.success) return { ok: false, error: 'unexpected' };
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const result = await requestEmailChange(
    session.userId,
    parsed.data.email,
    parsed.data.password,
    parsedLocale.data,
  );
  if (result.status === 'sent') return ok({ email: parsed.data.email });
  if (result.status === 'email_taken')
    return { ok: false, error: 'validation', fieldErrors: { email: ['emailTaken'] } };
  if (result.status === 'same')
    return { ok: false, error: 'validation', fieldErrors: { email: ['emailSame'] } };
  return passwordFailure(result, 'password');
}
