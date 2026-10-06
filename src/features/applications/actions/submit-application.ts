'use server';

import { updateTag } from 'next/cache';

import { findPublicEvent } from '@/features/events/server';
import { getSiteSettings } from '@/features/settings/server';
import { type ActionResult, type FieldErrors, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { checkSpamGuard } from '@/shared/forms/spam-guard';
import { routing, type Locale } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { applicationTags } from '../cache-tags';
import { applicationsRepository } from '../data';
import {
  buildApplicationSchema,
  readApplicationForm,
  storedAnswers,
  type UploadLike,
} from '../domain/application-schema';
import { applicationState } from '../domain/application-state';
import { DEFAULT_APPLICATION_FIELDS } from '../domain/default-form';
import { referencePrefix } from '../domain/reference';
import type { AnswerValue } from '../types';

// The public application form (UpcomingDetail › Apply). Everything is checked again here: the
// spam guard, the event (published, not ended), the deadline and the places at this moment, the
// answers against the event's own form, and the uploaded file's content. Field errors are keys of
// `applications.form.errors`; other failures are `conflict` with a key of `applications.form.failed`.

export type ApplicationReceipt = {
  reference: string;
  submittedAt: string;
  /** Pending (selection), accepted (first come) or on the waitlist (all places taken). */
  status: 'pending' | 'accepted' | 'waitlist';
  waitlistPosition: number | null;
  firstName: string;
  email: string;
};

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (routing.locales as readonly string[]).includes(value);

const conflict = (message: 'closed' | 'full' | 'duplicate' | 'spam' | 'tooFast'): ActionResult<never> => ({
  ok: false,
  error: 'conflict',
  message,
});

export async function submitApplication(data: FormData): Promise<ActionResult<ApplicationReceipt>> {
  const slug = data.get('event');
  const locale = data.get('locale');
  if (typeof slug !== 'string' || !isLocale(locale)) return { ok: false, error: 'not_found' };

  const spam = checkSpamGuard(data);
  if (spam === 'bot') return conflict('spam');
  if (spam === 'too_fast') return conflict('tooFast');

  const [event, settings, repo] = await Promise.all([
    findPublicEvent(slug, locale),
    getSiteSettings(locale),
    applicationsRepository(),
  ]);
  if (!event || event.timing !== 'upcoming' || event.applications.via !== 'form')
    return { ok: false, error: 'not_found' };

  const places = await repo.availability([event.id]);
  const state = applicationState(
    event,
    now(),
    {
      deadlineSoonHours: settings.events.deadlineSoonHours,
      autoCloseApplications: settings.events.autoCloseApplications,
    },
    places[event.id] ?? null,
  );
  if (!state.canApply) return conflict(state.phase === 'full' ? 'full' : 'closed');

  const fields = (await repo.getForm(event.id))?.fields ?? DEFAULT_APPLICATION_FIELDS;
  const values = readApplicationForm(data, fields);
  const parsed = buildApplicationSchema(fields).safeParse(values);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  // Files: the browser's type can be anything; the content must really be a PDF.
  const files: Record<string, AnswerValue> = {};
  const fileErrors: FieldErrors = {};
  for (const field of fields) {
    const file = values.answers[field.key];
    if (field.type !== 'file' || !file || typeof file !== 'object') continue;
    const bytes = new Uint8Array(await (file as UploadLike & Blob).arrayBuffer());
    if (!PDF_MAGIC.every((byte, index) => bytes[index] === byte)) {
      fileErrors[`answers.${field.key}`] = ['fileType'];
      continue;
    }
    files[field.key] = await repo.storeFile({ name: file.name, type: 'application/pdf', bytes }, now());
  }
  if (Object.keys(fileErrors).length > 0) return { ok: false, error: 'validation', fieldErrors: fileErrors };

  const result = await repo.submit(
    {
      eventId: event.id,
      name: parsed.data.name,
      email: parsed.data.email,
      answers: storedAnswers(values.answers, files),
      locale,
      referencePrefix: referencePrefix(event.slug),
      eventStartsAt: event.startsAt,
      maxParticipants: event.applications.maxParticipants,
      waitlist: event.applications.waitlist,
      admission: event.applications.admission,
    },
    now(),
  );
  if (result.status !== 'created') return conflict(result.status);

  // Places changed: the card, the box and the list show it on the next visit.
  updateTag(applicationTags.event(event.id));
  updateTag(applicationTags.all);
  // Confirmation e-mails are sent by the e-mail jobs (M22).
  const { application } = result;
  return ok({
    reference: application.reference,
    submittedAt: application.createdAt,
    status: application.status === 'rejected' ? 'pending' : application.status,
    waitlistPosition: application.waitlistPosition,
    firstName: application.name.split(/\s+/)[0] ?? application.name,
    email: application.email,
  });
}
