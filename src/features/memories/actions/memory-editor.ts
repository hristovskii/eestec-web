'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { currentMember } from '@/features/auth/server';
import { getStartedEvents } from '@/features/events/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';

import { memoriesRepository } from '../data';
import { saveMockMemoryPhoto } from '../data/memory-photos';
import { PHOTO_TYPES, photoTypeOf, submitProblems } from '../domain/memory-fields';
import { notifyBoardOfMemory } from '../notify';
import { memoryContentSchema } from '../schemas/memory-content.schema';
import type { MemoryContent } from '../types';

// The Memory editor's Server Actions. Who writes comes from the session, never from the request;
// only active members and alumni write Memories. Errors are keys of `memories.editor.errors`.

const idSchema = z
  .string()
  .regex(/^[\w-]{1,64}$/)
  .nullable();

async function author() {
  const session = await currentMember();
  return session && (session.memberStatus === 'active' || session.memberStatus === 'alumni') ? session : null;
}

/** The text is sanitized here, once, whatever the browser sent. */
const clean = (content: z.infer<typeof memoryContentSchema>): MemoryContent => ({
  ...content,
  body: sanitizeRichText(content.body),
  eventId: content.eventId || null,
  happenedOn: content.happenedOn || null,
});

/** "Save draft" and the autosave: anything within the limits is kept, nothing else is checked. */
export async function saveMemoryDraft(
  input: unknown,
): Promise<ActionResult<{ id: string; savedAt: string }>> {
  const session = await author();
  if (!session) return { ok: false, error: 'forbidden' };
  const request = z.object({ id: idSchema, content: memoryContentSchema }).safeParse(input);
  if (!request.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(request.error.issues) };
  const result = await (
    await memoriesRepository('session')
  ).saveDraft(session.userId, request.data.id, clean(request.data.content), now());
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'locked') return { ok: false, error: 'conflict', message: 'locked' };
  return ok({ id: result.record.id, savedAt: result.record.updatedAt });
}

/**
 * "Submit for review" / "Resubmit" / "Submit changes". The rules are checked again here (the editor
 * checks them first); a published Memory keeps its live version and queues a revision.
 */
export async function submitMemory(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string; title: string; revision: boolean }>> {
  const session = await author();
  if (!session) return { ok: false, error: 'forbidden' };
  const request = z.object({ id: idSchema, content: memoryContentSchema }).safeParse(input);
  if (!request.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(request.error.issues) };
  const content = clean(request.data.content);

  const problems = submitProblems(content);
  if (problems.length > 0)
    return {
      ok: false,
      error: 'validation',
      fieldErrors: Object.fromEntries(problems.map((problem) => [problem.field, [problem.field]])),
    };
  if (content.eventId) {
    const events = await getStartedEvents('en');
    if (!events.some((event) => event.id === content.eventId))
      return { ok: false, error: 'validation', fieldErrors: { event: ['event'] } };
  }

  const repo = await memoriesRepository('session');
  let id = request.data.id;
  if (id === null) {
    const draft = await repo.saveDraft(session.userId, null, content, now());
    if (draft.status !== 'saved') return { ok: false, error: 'unexpected' };
    id = draft.record.id;
  }
  const result = await repo.submit(session.userId, id, content, now());
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'locked') return { ok: false, error: 'conflict', message: 'locked' };
  await notifyBoardOfMemory({ title: content.title, revision: result.revision, now: now() });
  // No `refresh()`: the editor route would re-render, see a waiting Memory and redirect to its preview
  // before "Sent to the board" can show. Member data is not cached, so My Memories is current anyway.
  return ok({
    id: result.record.id,
    slug: result.record.slug ?? result.record.id,
    title: content.title,
    revision: result.revision,
  });
}

/** Deletes a draft or a Memory that was not approved (the author's own). */
export async function discardMemory(id: unknown): Promise<ActionResult> {
  const session = await author();
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = idSchema.unwrap().safeParse(id);
  if (!parsed.success) return { ok: false, error: 'not_found' };
  const done = await (await memoriesRepository('session')).discard(session.userId, parsed.data);
  if (!done) return { ok: false, error: 'not_found' };
  refresh();
  return ok(undefined);
}

/** Stores one photo (the browser has already made it a JPEG of at most 2000 px). */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function uploadMemoryPhoto(formData: FormData): Promise<ActionResult<{ fileId: string }>> {
  const session = await author();
  if (!session) return { ok: false, error: 'forbidden' };
  const file = formData.get('file');
  const width = Number(formData.get('width'));
  const height = Number(formData.get('height'));
  if (!(file instanceof File) || !Number.isInteger(width) || !Number.isInteger(height))
    return { ok: false, error: 'validation', fieldErrors: { photo: ['photoInvalid'] } };
  if (width < 1 || height < 1 || width > 6000 || height > 6000)
    return { ok: false, error: 'validation', fieldErrors: { photo: ['photoInvalid'] } };
  if (file.size > MAX_UPLOAD_BYTES)
    return { ok: false, error: 'validation', fieldErrors: { photo: ['photoTooBig'] } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = photoTypeOf(bytes);
  if (!type || !(PHOTO_TYPES as readonly string[]).includes(type))
    return { ok: false, error: 'validation', fieldErrors: { photo: ['photoType'] } };
  return ok({ fileId: saveMockMemoryPhoto({ mimeType: type, width, height, bytes }) });
}
