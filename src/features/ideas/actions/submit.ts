'use server';

import { getSession, sendMockMail } from '@/features/auth/server';
import { getStartedEvents } from '@/features/events/server';
import { createMemoryFromImpression } from '@/features/memories/server';
import { deviceKey, rateLimiter } from '@/shared/data/rate-limit';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { checkSpamGuard } from '@/shared/forms/spam-guard';
import { type Locale, routing } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { ideaFormRepository, submissionsRepository } from '../data';
import { saveMockSubmissionFile } from '../data/submission-files';
import { fileTypeOf } from '../domain/file-type';
import {
  buildIdeaSchema,
  buildImpressionSchema,
  OTHER_EVENT,
  readIdeaForm,
  readImpressionForm,
  SUBMIT_FIELDS,
  type SubmitReceipt,
} from '../domain/submission';
import { notifyBoardOfSubmission } from '../notify';
import type { SubmissionFile } from '../types';

// The two tabs of /submit. Everything is checked again here: the spam guard (a bot, or a form sent
// in under three seconds, gets the normal thank-you and nothing is stored, so there is nothing to
// learn from), the answers, the files (by their first bytes), and the limit of 5 per hour per
// device. Field errors are keys of `ideas.submit.errors`. Anonymous means nothing is stored (D28).

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (routing.locales as readonly string[]).includes(value);

const ratingOf = (value: number | null) =>
  value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : null;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || null;

/** The limit counts real time, like the spam guard: the mock clock of the sample site stands still. */
async function limited(): Promise<{ retryAt: string } | null> {
  const result = await (await rateLimiter()).hit(await deviceKey('submit'), new Date());
  return result.allowed ? null : { retryAt: result.retryAt };
}

/** The signed-in person, when there is one (a board account without a member profile is a visitor here). */
async function signedInMember() {
  const session = await getSession();
  return session?.memberStatus ? session : null;
}

type StoredFile = { file: SubmissionFile; bytes: Uint8Array; type: string };

/** Reads, checks the real type of and stores one uploaded file; 'invalid': it is not what it says. */
async function storeFile(
  value: FormDataEntryValue | null,
  allowed: readonly string[],
): Promise<StoredFile | null | 'invalid'> {
  if (!value || typeof value === 'string' || value.size === 0) return null;
  const bytes = new Uint8Array(await value.arrayBuffer());
  const type = fileTypeOf(bytes);
  if (!type || !allowed.includes(type)) return 'invalid';
  const name = value.name.replace(/[^\w. -]/g, '_').slice(0, 120) || 'file';
  const id = saveMockSubmissionFile({ bytes, mimeType: type, name });
  return { file: { id, name, size: bytes.length, mime: type }, bytes, type };
}

const fakeReceipt = (kind: SubmitReceipt['kind'], anonymous: boolean): SubmitReceipt => ({
  kind,
  firstName: null,
  email: null,
  anonymous,
  asMemory: false,
  eventTitle: '',
  eventSlug: null,
});

type Member = NonNullable<Awaited<ReturnType<typeof signedInMember>>>;

/** A signed-in member is sent as themselves; anonymous drops everything (the repository does too). */
function senderOf(anonymous: boolean, member: Member | null, typed: { name: string; email: string }) {
  if (anonymous) return { name: null, email: null, userId: null, isAnonymous: true } as const;
  if (member)
    return { name: member.name, email: member.email, userId: member.userId, isAnonymous: false } as const;
  return {
    name: typed.name || null,
    email: typed.email || null,
    userId: null,
    isAnonymous: false,
  } as const;
}

export async function submitIdea(data: FormData): Promise<ActionResult<SubmitReceipt>> {
  const locale = data.get('locale');
  if (!isLocale(locale)) return { ok: false, error: 'not_found' };
  const values = readIdeaForm(data);
  if (checkSpamGuard(data) !== 'ok') return ok(fakeReceipt('idea', values.anonymous));

  const [form, member] = await Promise.all([
    ideaFormRepository().then((repo) => repo.get()),
    signedInMember(),
  ]);
  const parsed = buildIdeaSchema(
    form.types.map((type) => type.id),
    member !== null,
  ).safeParse(values);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const attachment = await storeFile(data.get(SUBMIT_FIELDS.attachment), [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ]);
  if (attachment === 'invalid')
    return { ok: false, error: 'validation', fieldErrors: { attachment: ['attachmentType'] } };

  const wait = await limited();
  if (wait) return { ok: false, error: 'rate_limited', retryAt: wait.retryAt };

  const stamp = now();
  const idea = await (
    await submissionsRepository('session')
  ).submitIdea(
    {
      typeId: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      locale,
      attachment: attachment?.file ?? null,
      sender: senderOf(parsed.data.anonymous, member, parsed.data),
    },
    stamp,
  );
  await notifyBoardOfSubmission({ kind: 'idea', what: idea.title, now: stamp });
  if (idea.email)
    sendMockMail({
      to: idea.email,
      kind: 'idea_copy',
      subject: `Your idea: ${idea.title}`,
      link: null,
      reason: null,
      sentAt: stamp.toISOString(),
    });
  return ok({
    kind: 'idea',
    firstName: idea.name ? firstName(idea.name) : null,
    email: idea.email,
    anonymous: idea.isAnonymous,
    asMemory: false,
    eventTitle: '',
    eventSlug: null,
  });
}

export async function submitImpression(data: FormData): Promise<ActionResult<SubmitReceipt>> {
  const locale = data.get('locale');
  if (!isLocale(locale)) return { ok: false, error: 'not_found' };
  const values = readImpressionForm(data);
  if (checkSpamGuard(data) !== 'ok') return ok(fakeReceipt('impression', values.anonymous));

  const [events, member] = await Promise.all([getStartedEvents(locale), signedInMember()]);
  const parsed = buildImpressionSchema(
    events.map((event) => event.id),
    member !== null,
  ).safeParse(values);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const widths = data.getAll('photoWidths').map(Number);
  const heights = data.getAll('photoHeights').map(Number);
  const photos: { stored: StoredFile; width: number; height: number }[] = [];
  for (const [index, value] of data.getAll(SUBMIT_FIELDS.photos).entries()) {
    const stored = await storeFile(value, ['image/jpeg', 'image/png', 'image/webp']);
    if (stored === 'invalid')
      return { ok: false, error: 'validation', fieldErrors: { photos: ['photoType'] } };
    if (stored) photos.push({ stored, width: widths[index] ?? 0, height: heights[index] ?? 0 });
  }

  const wait = await limited();
  if (wait) return { ok: false, error: 'rate_limited', retryAt: wait.retryAt };

  const { event: eventId } = parsed.data;
  const event =
    eventId === OTHER_EVENT ? null : (events.find((candidate) => candidate.id === eventId) ?? null);
  const eventTitle = event?.title ?? parsed.data.otherEvent;
  const anonymous = parsed.data.anonymous;
  const stamp = now();

  // "Turn this into a Memories post": only an active member or alumnus who is not anonymous.
  const canWrite = member?.memberStatus === 'active' || member?.memberStatus === 'alumni';
  const memory =
    parsed.data.asMemory && member && canWrite && !anonymous
      ? await createMemoryFromImpression({
          userId: member.userId,
          title: parsed.data.memoryTitle,
          eventId: event?.id ?? null,
          otherEventName: event ? '' : parsed.data.otherEvent,
          city: event?.city ?? '',
          country: event?.country ?? '',
          text: parsed.data.impression,
          photos: photos
            .filter(
              (photo) => photo.width > 0 && photo.height > 0 && photo.width <= 6000 && photo.height <= 6000,
            )
            .map((photo) => ({
              bytes: photo.stored.bytes,
              mimeType: photo.stored.type,
              width: photo.width,
              height: photo.height,
            })),
          now: stamp,
        })
      : null;

  const feedback = await (
    await submissionsRepository('session')
  ).submitFeedback(
    {
      eventId: event?.id ?? null,
      otherEventName: event ? '' : parsed.data.otherEvent,
      eventTitle,
      rating: ratingOf(parsed.data.rating),
      text: parsed.data.impression,
      locale,
      photos: photos.map((photo) => photo.stored.file),
      memoryId: memory?.id ?? null,
      sender: senderOf(anonymous, member, parsed.data),
    },
    stamp,
  );
  await notifyBoardOfSubmission({ kind: 'feedback', what: eventTitle, now: stamp });
  if (feedback.email)
    sendMockMail({
      to: feedback.email,
      kind: 'feedback_copy',
      subject: `Your feedback on ${eventTitle}`,
      link: null,
      reason: null,
      sentAt: stamp.toISOString(),
    });
  return ok({
    kind: 'impression',
    firstName: feedback.name ? firstName(feedback.name) : null,
    email: feedback.email,
    anonymous: feedback.isAnonymous,
    asMemory: memory !== null,
    eventTitle,
    eventSlug: event?.slug ?? null,
  });
}
