import 'server-only';

import { accessTo, type Actor } from '@/features/auth';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import type { AnyMedia, MediaRef } from '@/shared/types/media';

import { mediaRepository } from './data';
import type { MediaListParams } from './schemas/media.schema';
import type { MediaItem } from './types';

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

/** Library files by id, for resolving the photos of a page. */
export async function getMediaMap(ids: readonly string[]): Promise<Map<string, MediaItem>> {
  return new Map((await getMediaItems(ids)).map((item) => [item.id, item]));
}

/**
 * A photo of a page, ready for MediaImage: the library file plus the alt text of this use in the
 * language of the page. SAMPLE placeholders (no file) become the canvas's striped box. null when
 * the file is gone or is not an image.
 */
export function resolveMediaRef(
  ref: MediaRef | null,
  files: ReadonlyMap<string, MediaItem>,
  locale: Locale,
): AnyMedia | null {
  if (!ref) return null;
  const file = files.get(ref.mediaId);
  if (!file || file.kind !== 'image') return null;
  const alt = resolveLocalized(ref.alt, locale);
  const credit = file.credit;
  if (!file.src)
    return { sample: true, caption: file.sampleCaption ?? file.fileName, alt, ...(credit ? { credit } : {}) };
  return {
    src: file.src,
    width: file.width ?? 1600,
    height: file.height ?? 1000,
    alt,
    ...(credit ? { credit } : {}),
  };
}
