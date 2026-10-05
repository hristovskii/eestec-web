import 'server-only';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import type { Locale } from '@/shared/i18n/routing';

import type { SeoPageKey } from './types';
import { now } from '@/shared/lib/now';

import { settingsTags } from './cache-tags';
import { settingsRepository } from './data';

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
  return repo.getPrivacyPolicy({ locale });
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

/**
 * Metadata of a public page from Settings › SEO: title (Home without the " · site name" suffix),
 * description and share image. `fallbackTitle` is used while the board hasn't written one.
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
    ...(seo.shareImage
      ? {
          openGraph: {
            images: [
              {
                url: seo.shareImage.src,
                width: seo.shareImage.width,
                height: seo.shareImage.height,
                alt: seo.shareImage.alt,
              },
            ],
          },
        }
      : {}),
  };
}
