import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { EventCardModel } from '@/features/events';
import { getEventCardsByIds } from '@/features/events/server';
import type { Paged } from '@/shared/data/paged';
import type { Locale } from '@/shared/i18n/routing';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';

import { memoryTags } from './cache-tags';
import { memoriesRepository } from './data';
import { memoryImage } from './data/memory-photos';
import { placeLabel } from './domain/memory-place';
import type {
  MemoriesFacetsView,
  MemoriesQuery,
  MemoryCardModel,
  MemoryEventView,
  MemoryPost,
  MemoryPostModel,
  MemorySummary,
  OwnMemory,
} from './types';

// Public reads of Memories: cached and tagged, refreshed by every change to a Memory (updateTag) and
// every 10 minutes for what comes from events (cacheLife 'events'). Authors are NOT resolved here:
// `memories` never imports `members`, so a route asks `members.getAuthorCards` for the ids.

type EventById = Map<string, EventCardModel & { timing: 'upcoming' | 'past' }>;

const eventHref = (card: { slug: string; timing: 'upcoming' | 'past' }) =>
  card.timing === 'upcoming' ? `/upcoming/${card.slug}` : `/events/${card.slug}`;

async function eventsFor(ids: (string | null)[], locale: Locale): Promise<EventById> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  if (wanted.length === 0) return new Map();
  const found = await getEventCardsByIds(wanted, locale);
  return new Map(found.map((card) => [card.id, card]));
}

function eventView(
  eventId: string | null,
  otherEventName: string,
  events: EventById,
  locale: Locale,
): MemoryEventView {
  const card = eventId ? events.get(eventId) : undefined;
  if (card)
    return {
      slug: card.slug,
      title: card.title.text,
      titleLang: card.title.lang !== locale ? card.title.lang : null,
      href: eventHref(card),
      typeName: card.typeName,
    };
  return { slug: null, title: otherEventName, titleLang: null, href: null, typeName: null };
}

const toCard = (summary: MemorySummary, events: EventById, locale: Locale): MemoryCardModel => ({
  id: summary.id,
  slug: summary.slug,
  title: summary.title,
  excerpt: summary.excerpt,
  place: placeLabel(summary.city, summary.country),
  cover: summary.cover ? memoryImage(summary.cover) : null,
  event: eventView(summary.eventId, summary.otherEventName, events, locale),
  authorId: summary.authorId,
  authorDeleted: summary.authorDeleted,
  publishedAt: summary.publishedAt,
});

async function toCards(items: MemorySummary[], locale: Locale): Promise<MemoryCardModel[]> {
  const events = await eventsFor(
    items.map((item) => item.eventId),
    locale,
  );
  return items.map((item) => toCard(item, events, locale));
}

async function toPostModel(post: MemoryPost, locale: Locale): Promise<MemoryPostModel> {
  const events = await eventsFor([post.eventId], locale);
  const photos = post.photos.map((photo) => memoryImage(photo));
  return {
    id: post.id,
    eventId: post.eventId,
    slug: post.slug,
    title: post.title,
    body: sanitizeRichText(post.body),
    status: post.status,
    place: placeLabel(post.city, post.country),
    publishedAt: post.publishedAt,
    happenedOn: post.happenedOn,
    readMinutes: post.readMinutes,
    wordCount: post.wordCount,
    readsCount: post.readsCount,
    cover: post.cover ? memoryImage(post.cover) : null,
    photos,
    event: eventView(post.eventId, post.otherEventName, events, locale),
    eventCard: post.eventId ? (events.get(post.eventId) ?? null) : null,
    authorId: post.authorId,
    authorDeleted: post.authorDeleted,
  };
}

/** One page of /memories with the filters of the URL (already resolved to ids by the route). */
export async function getMemoriesList(query: MemoriesQuery, locale: Locale): Promise<Paged<MemoryCardModel>> {
  'use cache';
  cacheTag(memoryTags.list);
  cacheLife('events');
  const page = await (await memoriesRepository()).list(query);
  return { ...page, items: await toCards(page.items, locale) };
}

/** What the filters offer (events by address, years, places, authors) and the numbers under the intro. */
export async function getMemoriesFacets(locale: Locale): Promise<MemoriesFacetsView> {
  'use cache';
  cacheTag(memoryTags.list);
  cacheLife('events');
  const facets = await (await memoriesRepository()).facets();
  const events = await eventsFor(
    facets.events.map((entry) => entry.eventId),
    locale,
  );
  return {
    events: facets.events.flatMap((entry) => {
      const card = events.get(entry.eventId);
      return card
        ? [
            {
              id: card.id,
              slug: card.slug,
              title: card.title.text,
              titleLang: card.title.lang !== locale ? card.title.lang : null,
              count: entry.count,
            },
          ]
        : [];
    }),
    years: facets.years,
    places: facets.places,
    authors: facets.authors,
    totals: facets.totals,
  };
}

/** The published post by address; null for everything else. */
export async function getMemoryPost(slug: string, locale: Locale): Promise<MemoryPostModel | null> {
  'use cache';
  cacheTag(memoryTags.list, memoryTags.post(slug));
  cacheLife('events');
  const post = await (await memoriesRepository()).findPost(slug);
  return post ? toPostModel(post, locale) : null;
}

/** The author's own view of a Memory of theirs (draft, waiting, not approved, live). Dynamic. */
export async function getMyMemoryPost(
  userId: string,
  slug: string,
  locale: Locale,
): Promise<{ post: MemoryPostModel; own: OwnMemory } | null> {
  const found = await (await memoriesRepository('session')).findMinePost(userId, slug);
  return found ? { post: await toPostModel(found.post, locale), own: found.own } : null;
}

/** Counts a read of a published post (not for the author's own views). Not cached. */
export async function countMemoryRead(slug: string): Promise<void> {
  await (await memoriesRepository()).countRead(slug);
}

/** "More Memories from this event" and the Memories section of an event page. */
export async function getMemoriesOfEvent(
  eventId: string,
  locale: Locale,
  options: { limit: number; excludeId?: string },
): Promise<{ items: MemoryCardModel[]; total: number }> {
  'use cache';
  cacheTag(memoryTags.list);
  cacheLife('events');
  const repo = await memoriesRepository();
  const [items, total] = await Promise.all([repo.listByEvent(eventId, options), repo.countByEvent(eventId)]);
  return { items: await toCards(items, locale), total: options.excludeId ? Math.max(total - 1, 0) : total };
}

/** Memories written by one member (a profile section). The caller decides who may see it. */
export async function getMemoriesOfAuthor(
  authorId: string,
  locale: Locale,
  limit: number,
): Promise<{ items: MemoryCardModel[]; total: number }> {
  'use cache';
  cacheTag(memoryTags.list);
  cacheLife('events');
  const repo = await memoriesRepository();
  const [items, total] = await Promise.all([
    repo.listByAuthor(authorId, { limit }),
    repo.countByAuthor(authorId),
  ]);
  return { items: await toCards(items, locale), total };
}

/** Home: the Memories the board features first, then the newest. */
export async function getLatestMemories(locale: Locale, limit = 3): Promise<MemoryCardModel[]> {
  'use cache';
  cacheTag(memoryTags.list);
  cacheLife('events');
  return toCards(await (await memoriesRepository()).latest(limit), locale);
}

/** Addresses of every published Memory (sitemap and prerendering). */
export async function getMemorySlugs(): Promise<string[]> {
  'use cache';
  cacheTag(memoryTags.list);
  cacheLife('events');
  return (await memoriesRepository()).listSlugs();
}
