'use server';

import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { checkSpamGuard } from '@/shared/forms/spam-guard';
import { type Locale, routing } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { authRepository } from '../data';
import { photoProblem, readPhoto, readRegisterForm, type RegisterFailure } from '../domain/register-form';
import { registerSchema } from '../schemas/register.schema';

// The sign-up form of /register. Everything is checked again here: the spam guard, the fields, the
// photo, and whether the e-mail is free. Field errors are keys of `auth.errors`; other failures are
// `conflict` with a key of `auth.register.failed`.

export type RegisterReceipt = { firstName: string; email: string };

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (routing.locales as readonly string[]).includes(value);

const conflict = (message: RegisterFailure): ActionResult<never> => ({
  ok: false,
  error: 'conflict',
  message,
});

export async function registerMember(data: FormData): Promise<ActionResult<RegisterReceipt>> {
  const locale = data.get('locale');
  if (!isLocale(locale)) return { ok: false, error: 'not_found' };

  const spam = checkSpamGuard(data);
  if (spam !== 'ok') return conflict(spam === 'bot' ? 'spam' : 'tooFast');

  const parsed = registerSchema.safeParse(readRegisterForm(data));
  const photo = readPhoto(data);
  const problem = photoProblem(photo);
  if (!parsed.success || problem) {
    const fieldErrors = parsed.success ? {} : fieldErrorsFrom(parsed.error.issues);
    return {
      ok: false,
      error: 'validation',
      fieldErrors: problem ? { ...fieldErrors, photo: [problem] } : fieldErrors,
    };
  }

  const values = parsed.data;
  const result = await (
    await authRepository()
  ).registerMember({
    name: values.name,
    email: values.email,
    password: values.password,
    faculty: values.faculty,
    year: values.year,
    phone: values.phone,
    visibility: values.visibility,
    photo: photo ? { mimeType: photo.type, bytes: new Uint8Array(await photo.arrayBuffer()) } : null,
    locale,
    now: now(),
  });
  if (result.status === 'unavailable') return conflict('unavailable');
  if (result.status === 'email_taken')
    return { ok: false, error: 'validation', fieldErrors: { email: ['emailTaken'] } };
  return ok({ firstName: values.name.split(/\s+/)[0] ?? values.name, email: values.email });
}
