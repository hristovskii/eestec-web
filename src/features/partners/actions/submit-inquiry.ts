'use server';

import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { checkSpamGuard } from '@/shared/forms/spam-guard';
import { type Locale, routing } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { inquiriesRepository } from '../data';
import { inquiryFailureFor, type InquiryFailure, inquirySchema, readInquiryForm } from '../domain/inquiry';
import type { InquiryInterest } from '../types';

// The partnership inquiry form of /partners (CompanyForm). Everything is checked again here: the
// spam guard and the answers. Field errors are keys of `partners.form.errors`; other failures are
// `conflict` with a key of `partners.form.failed`.

export type InquiryReceipt = {
  /** "Petra" for "Thanks, Petra!". */
  firstName: string;
  company: string;
  email: string;
  interests: InquiryInterest[];
  reference: string;
};

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (routing.locales as readonly string[]).includes(value);

const conflict = (message: Exclude<InquiryFailure, 'unexpected'>): ActionResult<never> => ({
  ok: false,
  error: 'conflict',
  message,
});

export async function submitInquiry(data: FormData): Promise<ActionResult<InquiryReceipt>> {
  const locale = data.get('locale');
  if (!isLocale(locale)) return { ok: false, error: 'not_found' };

  const spam = checkSpamGuard(data);
  if (spam !== 'ok') return conflict(inquiryFailureFor(spam));

  const parsed = inquirySchema.safeParse(readInquiryForm(data));
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const { company, person, email, phone, interests, message } = parsed.data;
  const inquiry = await (
    await inquiriesRepository()
  ).submit({ company, contactPerson: person, email, phone, interests, message, locale }, now());

  return ok({
    firstName: person.split(/\s+/)[0] ?? person,
    company,
    email,
    interests,
    reference: inquiry.reference,
  });
}
