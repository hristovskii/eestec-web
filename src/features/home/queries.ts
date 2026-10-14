import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { MediaItem } from '@/features/media';
import { getMediaItems } from '@/features/media/server';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import type { AnyMedia } from '@/shared/types/media';

import { homeTags } from './cache-tags';
import { homeRepository } from './data';
import { visibleSections } from './domain/layout';
import type { HomeImage, HomeRecord, HomeSectionKey, PublicHome } from './types';

/** Library file + the alt text of this use → an image for MediaImage. */
function toImage(image: HomeImage | null, files: Map<string, MediaItem>, locale: Locale): AnyMedia | null {
  if (!image) return null;
  const file = files.get(image.mediaId);
  if (!file || file.kind !== 'image') return null;
  const alt = resolveLocalized(image.alt, locale);
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

/** The Media library files the Home content uses. */
export const homeMediaIds = (home: HomeRecord) =>
  [home.hero.image, ...home.milestones.map((milestone) => milestone.photo)].flatMap((image) =>
    image ? [image.mediaId] : [],
  );

/** The Home content in the language of the page. Cached; every admin change refreshes it. */
export async function getHome(locale: Locale): Promise<PublicHome> {
  'use cache';
  cacheTag(homeTags.all);
  cacheLife('hours');
  const home = await (await homeRepository()).get();
  const files = new Map((await getMediaItems(homeMediaIds(home))).map((item) => [item.id, item]));
  const text = (value: { mk: string; en?: string }) => resolveLocalized(value, locale);
  return {
    hero: {
      eyebrow: text(home.hero.eyebrow),
      headline: text(home.hero.headline),
      subtitle: text(home.hero.subtitle),
      primary: { label: text(home.hero.primary.label), href: home.hero.primary.href },
      secondary: { label: text(home.hero.secondary.label), href: home.hero.secondary.href },
      image: toImage(home.hero.image, files, locale),
    },
    about: {
      paragraphs: text(home.about.body)
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      activities: home.activities.map((activity) => ({
        id: activity.id,
        icon: activity.icon,
        title: text(activity.title),
        text: text(activity.text),
      })),
    },
    tradition: home.milestones.map((milestone) => ({
      id: milestone.id,
      year: milestone.year,
      title: text(milestone.title),
      text: text(milestone.text),
      photo: toImage(milestone.photo, files, locale),
    })),
    stats: home.stats.map((stat) => ({
      id: stat.id,
      label: text(stat.label),
      value: stat.value,
      suffix: stat.suffix,
    })),
  };
}

/** The sections of Home in the board's order, hidden ones left out. The route maps each key to a section. */
export async function getHomeLayout(): Promise<HomeSectionKey[]> {
  'use cache';
  cacheTag(homeTags.all);
  cacheLife('hours');
  return visibleSections((await (await homeRepository()).get()).layout);
}

/** Admin › Pages › Home: everything in both languages and the library files it uses; never cached. Callers check the permission. */
export async function getHomeForEdit() {
  const home = await (await homeRepository('session')).get();
  const media = await getMediaItems(homeMediaIds(home));
  return { home, media: Object.fromEntries(media.map((item) => [item.id, item])) };
}
