'use server';

import { refresh } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, type FieldErrors, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { mediaRepository } from '../data';
import { kindOf } from '../domain/upload-rules';
import {
  altMissing,
  deleteMediaSchema,
  finishUploadSchema,
  startUploadSchema,
  storedAlt,
  updateMediaSchema,
} from '../schemas/media.schema';
import type { MediaItem } from '../types';

const invalid = (issues: Parameters<typeof fieldErrorsFrom>[0]) =>
  ({ ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(issues) }) as const;
const altRequired = (): { ok: false; error: 'validation'; fieldErrors: FieldErrors } => ({
  ok: false,
  error: 'validation',
  fieldErrors: { alt: ['altRequired'] },
});

/** Step 1: reserve an upload and get the URL the browser PUTs the file to. */
export async function startMediaUpload(
  input: unknown,
): Promise<ActionResult<{ uploadId: string; uploadUrl: string }>> {
  const session = await authorize('create', 'media');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = startUploadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const repo = await mediaRepository();
  return ok(
    await repo.createUpload({ ...parsed.data, uploadedBy: { userId: session.userId, name: session.name } }),
  );
}

/** Step 2: the file has arrived; record it with its alt text. */
export async function finishMediaUpload(input: unknown): Promise<ActionResult<MediaItem>> {
  const session = await authorize('create', 'media');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = finishUploadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const { uploadId, width, height, credit } = parsed.data;
  const repo = await mediaRepository();
  const upload = await repo.getUpload(uploadId, session.userId);
  if (!upload?.received) return { ok: false, error: 'not_found' };
  const isImage = kindOf(upload.mimeType) === 'image';
  if (altMissing(parsed.data, isImage)) return altRequired();
  const item = await repo.confirmUpload({
    uploadId,
    userId: session.userId,
    alt: storedAlt(parsed.data, isImage),
    credit,
    width,
    height,
    now: now(),
  });
  if (!item) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'uploaded',
    area: 'media',
    target: item.fileName,
    href: '/admin/media',
  });
  refresh();
  return ok(item);
}

export async function updateMedia(input: unknown): Promise<ActionResult<MediaItem>> {
  const parsed = updateMediaSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const repo = await mediaRepository();
  const existing = await repo.get(parsed.data.id);
  if (!existing) return { ok: false, error: 'not_found' };
  if (!(await authorize('edit', 'media', { ownerId: existing.uploadedBy.userId })))
    return { ok: false, error: 'forbidden' };
  const isImage = existing.kind === 'image';
  if (altMissing(parsed.data, isImage)) return altRequired();
  const item = await repo.update(existing.id, {
    alt: storedAlt(parsed.data, isImage),
    credit: parsed.data.credit ?? '',
  });
  if (!item) return { ok: false, error: 'not_found' };
  refresh();
  return ok(item);
}

export async function deleteMedia(input: unknown): Promise<ActionResult> {
  const parsed = deleteMediaSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const repo = await mediaRepository();
  const existing = await repo.get(parsed.data.id);
  if (!existing) return { ok: false, error: 'not_found' };
  const session = await authorize('delete', 'media', { ownerId: existing.uploadedBy.userId });
  if (!session) return { ok: false, error: 'forbidden' };
  await repo.remove(existing.id);
  await recordActivity(session, { action: 'deleted', area: 'media', target: existing.fileName });
  refresh();
  return ok(undefined);
}
