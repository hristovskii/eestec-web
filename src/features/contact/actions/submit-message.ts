'use server';

import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { checkSpamGuard } from '@/shared/forms/spam-guard';
import { resolveLocalized } from '@/shared/i18n/localized';
import { type Locale, routing } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { contactRepository, messagesRepository } from '../data';
import {
  buildContactSchema,
  type MessageFailure,
  messageFailureFor,
  readContactForm,
} from '../domain/message';

// The contact form of /contact (ContactForm). Everything is checked again here: the spam guard,
// the answers, and that the subject is one the board offers. Field errors are keys of
// `contact.form.errors`; other failures are `conflict` with a key of `contact.form.failed`.

export type MessageReceipt = {
  /** "Marija" for "Message sent. Thanks, Marija!". */
  firstName: string;
  email: string;
  /** The subject the person chose, in the language of the page, and who got the message ("membership team"). */
  subjectId: string;
  subject: string;
  team: string;
  /** When it was sent (ISO). */
  sentAt: string;
  reference: string;
};

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (routing.locales as readonly string[]).includes(value);

const conflict = (message: Exclude<MessageFailure, 'unexpected'>): ActionResult<never> => ({
  ok: false,
  error: 'conflict',
  message,
});

export async function submitMessage(data: FormData): Promise<ActionResult<MessageReceipt>> {
  const locale = data.get('locale');
  if (!isLocale(locale)) return { ok: false, error: 'not_found' };

  const spam = checkSpamGuard(data);
  if (spam !== 'ok') return conflict(messageFailureFor(spam));

  const { subjects } = await (await contactRepository()).get();
  const parsed = buildContactSchema(subjects.map((subject) => subject.id)).safeParse(readContactForm(data));
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const { name, email, subject: subjectId, message } = parsed.data;
  const subject = subjects.find((candidate) => candidate.id === subjectId);
  if (!subject) return { ok: false, error: 'not_found' };

  const subjectName = resolveLocalized(subject.name, locale);
  const stored = await (
    await messagesRepository()
  ).submit(
    { name, email, subjectId, subject: subjectName, routedTo: subject.routeEmail, message, locale },
    now(),
  );

  return ok({
    firstName: name.split(/\s+/)[0] ?? name,
    email,
    subjectId,
    subject: subjectName,
    team: resolveLocalized(subject.teamLabel, locale),
    sentAt: stored.createdAt,
    reference: stored.reference,
  });
}
