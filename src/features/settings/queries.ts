import 'server-only';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import type { Locale } from '@/shared/i18n/routing';

import { now } from '@/shared/lib/now';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';
import { alternatesFor, localizedPath, openGraphLocales } from '@/shared/seo/alternates';

import { settingsTags } from './cache-tags';
import { settingsRepository } from './data';
import { SEO_PAGE_PATHS, type SeoPageKey } from './types';

export async function getSiteSettings(locale: Locale) {
  'use cache';
  cacheTag(settingsTags.all);
  cacheLife('hours');
  const repo = await settingsRepository();
  return repo.getSiteSettings({ locale, now: now() });
}

export async function getPrivacyPolicy(locale: Locale) {
  'use cache';
  cacheTag(settingsTags.all);
  cacheLife('hours');
  const repo = await settingsRepository();
  const policy = await repo.getPrivacyPolicy({ locale });
  // Cleaned again before it is shown (never raw board input).
  return { ...policy, body: sanitizeRichText(policy.body) };
}

/** Admin › Pages › Contact › Privacy policy: both languages, never cached. Callers check the permission. */
export async function getPrivacyForEdit() {
  const repo = await settingsRepository();
  return (await repo.getRecord()).privacy;
}

/** Title, description and share image of one page (generateMetadata). */
export async function getPageSeo(page: SeoPageKey, locale: Locale) {
  'use cache';
  cacheTag(settingsTags.all);
  cacheLife('hours');
  const repo = await settingsRepository();
  return repo.getPageSeo({ page, locale });
}

/** Admin › Settings form: both languages, never cached. Callers check the permission. */
export async function getSettingsForEdit() {
  const repo = await settingsRepository();
  return repo.getRecord();
}

const FALLBACK_SHARE_IMAGE = {
  src: '/brand/LC_Skopje_red_background.png',
  width: 4167,
  height: 2942,
} as const;

type ShareImage = { src: string; width: number; height: number; alt: string };

/**
 * What the board never has to write: canonical address, hreflang links, Open Graph and Twitter
 * card. `path` is the Macedonian address ("/events/spring-camp"); `image` is the page's own share
 * image, or the brand image when there is none.
 */
export async function socialMetadata(
  path: string,
  locale: Locale,
  options: { image?: ShareImage | null; type?: 'website' | 'article' } = {},
): Promise<Metadata> {
  const { siteName } = await getSiteSettings(locale);
  const image = options.image ?? {
    src: FALLBACK_SHARE_IMAGE.src,
    width: FALLBACK_SHARE_IMAGE.width,
    height: FALLBACK_SHARE_IMAGE.height,
    alt: siteName,
  };
  return {
    alternates: alternatesFor(path, locale),
    openGraph: {
      type: options.type ?? 'website',
      siteName,
      url: localizedPath(path, locale),
      ...openGraphLocales(locale),
      images: [{ url: image.src, width: image.width, height: image.height, alt: image.alt }],
    },
    twitter: { card: 'summary_large_image' },
  };
}

/**
 * Metadata of a public page from Settings › SEO: title (Home without the " · site name" suffix),
 * description and share image, plus the canonical / hreflang / social tags. `fallbackTitle` is used
 * while the board hasn't written a title.
 */
export async function pageMetadata(
  page: SeoPageKey,
  locale: Locale,
  fallbackTitle?: string,
): Promise<Metadata> {
  const seo = await getPageSeo(page, locale);
  const title = seo.title || fallbackTitle;
  return {
    ...(title ? { title: page === 'home' ? { absolute: title } : title } : {}),
    ...(seo.description ? { description: seo.description } : {}),
    ...(await socialMetadata(SEO_PAGE_PATHS[page], locale, { image: seo.shareImage })),
  };
}
