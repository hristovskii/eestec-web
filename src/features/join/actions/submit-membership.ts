'use server';

import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { checkSpamGuard } from '@/shared/forms/spam-guard';
import { resolveLocalized } from '@/shared/i18n/localized';
import { routing, type Locale } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { joinRepository, membershipRepository } from '../data';
import {
  buildMembershipSchema,
  failureFor,
  type MembershipFailure,
  readMembershipForm,
} from '../domain/membership';

// The membership form of /join (JoinForm). Everything is checked again here: the spam guard,
// whether applications are open at this moment, and the answers against the board's own option
// lists. Field errors are keys of `join.form.errors`; other failures are `conflict` with a key of
// `join.form.failed`.

export type MembershipReceipt = {
  /** "Marija" for "Welcome aboard, Marija!". */
  firstName: string;
  email: string;
  submittedAt: string;
};

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (routing.locales as readonly string[]).includes(value);

const conflict = (message: Exclude<MembershipFailure, 'unexpected'>): ActionResult<never> => ({
  ok: false,
  error: 'conflict',
  message,
});

export async function submitMembership(data: FormData): Promise<ActionResult<MembershipReceipt>> {
  const locale = data.get('locale');
  if (!isLocale(locale)) return { ok: false, error: 'not_found' };

  const spam = checkSpamGuard(data);
  if (spam !== 'ok') return conflict(failureFor(spam));

  const join = await (await joinRepository()).get();
  if (!join.apply.open) return conflict('closed');

  const ids = (lines: { id: string }[]) => lines.map((line) => line.id);
  const parsed = buildMembershipSchema({
    faculties: ids(join.apply.faculties),
    interests: ids(join.apply.interests),
    heardFrom: ids(join.apply.heardFrom),
  }).safeParse(readMembershipForm(data));
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  // The wording of what the person chose, in the language of the page they used.
  const label = (lines: typeof join.apply.faculties, id: string) => {
    const line = lines.find((candidate) => candidate.id === id);
    return line ? resolveLocalized(line.text, locale) : '';
  };
  const { name, email, phone, faculty, program, year, interests, heardFrom } = parsed.data;
  const at = now();
  const result = await (
    await membershipRepository()
  ).submit(
    {
      name,
      email,
      phone,
      faculty: label(join.apply.faculties, faculty),
      studyProgram: program,
      yearOfStudy: year,
      interests: interests.map((id) => label(join.apply.interests, id)).filter(Boolean),
      heardFrom: label(join.apply.heardFrom, heardFrom),
      locale,
    },
    at,
  );
  if (result.status === 'duplicate') return conflict('duplicate');

  return ok({ firstName: name.split(/\s+/)[0] ?? name, email, submittedAt: at.toISOString() });
}
