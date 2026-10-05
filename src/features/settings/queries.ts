import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { Locale } from '@/shared/i18n/routing';
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
