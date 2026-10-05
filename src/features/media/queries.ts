import 'server-only';

import { accessTo, type Actor } from '@/features/auth';

import { mediaRepository } from './data';
import type { MediaListParams } from './schemas/media.schema';

/** The Media library for one admin. Event managers only ever see their own uploads (D18). */
export async function listMedia(actor: Actor, params: MediaListParams) {
  const ownOnly = accessTo(actor, 'media') === 'own';
  const repo = await mediaRepository();
  return repo.list({
    kind: params.kind,
    q: params.q,
    missingAlt: params.alt === 'missing',
    uploadedBy: ownOnly || params.mine ? actor.userId : undefined,
    sort: params.sort,
    page: params.page,
    pageSize: params.size,
  });
}
