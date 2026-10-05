'use server';

import { authorize } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import type { Paged } from '@/shared/data/paged';

import { listMedia } from '../queries';
import { mediaListParamsSchema } from '../schemas/media.schema';
import type { MediaItem } from '../types';

/** Images for the media picker (logos, share images, covers): newest first, 24 per page. */
export async function searchPickerImages(input: unknown): Promise<ActionResult<Paged<MediaItem>>> {
  const session = await authorize('view', 'media');
  if (!session) return { ok: false, error: 'forbidden' };
  const query = typeof input === 'object' && input !== null ? input : {};
  const params = mediaListParamsSchema.parse({ ...query, kind: 'image', size: 24 });
  const { counts: _counts, ...page } = await listMedia(session, params);
  return ok(page);
}
