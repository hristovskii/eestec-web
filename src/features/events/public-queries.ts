import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { MediaItem } from '@/features/media';
import { getMediaItems } from '@/features/media/server';
import { getSiteSettings } from '@/features/settings/server';
import type { Locale } from '@/shared/i18n/routing';
import { resolveText } from '@/shared/i18n/localized';
import { now } from '@/shared/lib/now';
import { slugify } from '@/shared/lib/slug';
import type { AnyMedia, Media } from '@/shared/types/media';

import { eventTags } from './cache-tags';
import { eventsRepository, eventTaxonomyRepository } from './data';
import { ARCHIVE_PAGE_SIZE, type ArchiveParams } from './schemas/archive-params.schema';
import type { ArchiveTypeOption, EventCardModel, EventMediaRef, EventPageModel, EventSummary } from './types';

// Public reads for /events (docs/ARCHITECTURE.md §4.3): cached, tagged, refreshed by every admin
// change (updateTag) and at least every 10 minutes for the time-based states (cacheLife 'events').

/** Library file + the alt text of this use → an image for MediaImage. */
function toImage(ref: EventMediaRef, files: Map<string, MediaItem>): AnyMedia | null {
  const file = files.get(ref.mediaId);
  if (!file || file.kind !== 'image') return null;
  const credit = ref.credit || file.credit;
  if (!file.src)
    return {
      sample: true,
      caption: file.sampleCaption ?? file.fileName,
      alt: ref.alt,
      ...(credit ? { credit } : {}),
    };
  return {
    src: file.src,
    width: file.width ?? 1600,
    height: file.height ?? 1000,
    alt: ref.alt,
    ...(credit ? { credit } : {}),
  };
}

async function filesFor(ids: (string | null | undefined)[]) {
  const items = await getMediaItems(ids.filter((id): id is string => !!id));
  return new Map(items.map((item) => [item.id, item]));
}

const toCard = (summary: EventSummary, files: Map<string, MediaItem>): EventCardModel => ({
  ...summary,
  cover: summary.cover ? toImage(summary.cover, files) : null,
});

/** Event types as filter chips, in the board's order (`?type=workshop`). */
export async function getArchiveTypes(locale: Locale): Promise<ArchiveTypeOption[]> {
  'use cache';
  cacheTag(eventTags.list);
  cacheLife('events');
  const types = await (await eventTaxonomyRepository()).list('types');
  return types.map((type) => ({
    id: type.id,
    // Slugs come from the Macedonian name (the required one), so they stay the same in both languages.
    slug: slugify(type.name.mk) || type.id,
    name: resolveText(type.name, locale).text,
  }));
}

export async function getArchiveFacets() {
  'use cache';
  cacheTag(eventTags.list);
  cacheLife('events');
  return (await eventsRepository()).archiveFacets({ now: now() });
}

/** One page of /events: past, listed events of the tab with the filters of the URL. */
export async function getEventsArchive(params: ArchiveParams, locale: Locale) {
  'use cache';
  cacheTag(eventTags.list);
  cacheLife('events');
  const [repo, types, settings] = await Promise.all([
    eventsRepository(),
    getArchiveTypes(locale),
    getSiteSettings(locale),
  ]);
  const typeId = params.type ? types.find((type) => type.slug === params.type)?.id : undefined;
  const page = await repo.listArchive({
    scope: params.tab,
    // An unknown type slug matches nothing (a designed empty state, not every event).
    typeId: params.type ? (typeId ?? '__none__') : undefined,
    year: params.year,
    q: params.q,
    sort: params.sort,
    page: params.page,
    pageSize: ARCHIVE_PAGE_SIZE,
    locale,
    now: now(),
    justEndedDays: settings.events.justEndedDays,
  });
  const files = await filesFor(page.items.map((item) => item.cover?.mediaId));
  return { ...page, items: page.items.map((item) => toCard(item, files)) };
}

/** /events/[slug]: the event, its images and files, and the previous / next event. null = 404. */
export async function getEventPage(slug: string, locale: Locale) {
  'use cache';
  cacheTag(eventTags.list, eventTags.detail(slug));
  cacheLife('events');
  const [repo, settings] = await Promise.all([eventsRepository(), getSiteSettings(locale)]);
  const context = { locale, now: now(), justEndedDays: settings.events.justEndedDays };
  const detail = await repo.findBySlug(slug, context);
  if (!detail) return null;
  const [adjacent, files] = await Promise.all([
    repo.findAdjacent(slug, context),
    filesFor([
      detail.cover?.mediaId,
      ...detail.gallery.map((photo) => photo.mediaId),
      detail.infoPackId,
      detail.seo.shareImageId,
    ]),
  ]);
  const { cover, gallery, infoPackId, ...rest } = detail;
  const pack = infoPackId ? files.get(infoPackId) : undefined;
  const share = rest.seo.shareImageId ? files.get(rest.seo.shareImageId) : undefined;
  const shareImage: Media | null =
    share?.src && share.kind === 'image' && share.alt
      ? { src: share.src, width: share.width ?? 1200, height: share.height ?? 630, alt: share.alt }
      : null;
  const page: EventPageModel = {
    ...rest,
    cover: cover ? toImage(cover, files) : null,
    gallery: gallery.map((photo) => toImage(photo, files)).filter((image) => image !== null),
    infoPack:
      pack?.src && pack.kind === 'document'
        ? { src: pack.src, fileName: pack.fileName, size: pack.size }
        : null,
    shareImage,
  };
  return { event: page, ...adjacent };
}

/**
 * Old address of an event → its current one, for the proxy's 301 (decided rule). Only asked for
 * /events/<slug> requests; the proxy can't use 'use cache', and the lookup is one indexed read.
 */
export async function findEventRedirect(slug: string): Promise<string | null> {
  return (await eventsRepository()).redirectFor(slug);
}

/** Addresses to prerender (every listed past event). */
export async function getArchiveSlugs(): Promise<string[]> {
  'use cache';
  cacheTag(eventTags.list);
  cacheLife('events');
  return (await eventsRepository()).archiveSlugs(now());
}
