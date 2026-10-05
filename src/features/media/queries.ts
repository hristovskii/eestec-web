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

/** Library items by id (other features' admin screens: event covers, galleries). Unknown ids are left out. */
export async function getMediaItems(ids: readonly string[]) {
  const repo = await mediaRepository();
  const items = await Promise.all([...new Set(ids)].map((id) => repo.get(id)));
  return items.filter((item) => item !== null);
}
