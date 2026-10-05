'use server';

import { authorize } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import type { Paged } from '@/shared/data/paged';

import { listMedia } from '../queries';
import { mediaListParamsSchema } from '../schemas/media.schema';
import type { MediaItem } from '../types';

/** Files for the media picker (logos, share images, covers, PDFs): newest first, 24 per page. */
export async function searchPickerMedia(input: unknown): Promise<ActionResult<Paged<MediaItem>>> {
  const session = await authorize('view', 'media');
  if (!session) return { ok: false, error: 'forbidden' };
  const query = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const kind = query.kind === 'document' ? 'document' : 'image';
  const params = mediaListParamsSchema.parse({ ...query, kind, size: 24 });
  const { counts: _counts, ...page } = await listMedia(session, params);
  return ok(page);
}
