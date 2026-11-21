import { resolveLocalized, resolveText } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { nextMeetingAt } from '@/shared/lib/next-meeting';
import { isEmptyRichText } from '@/shared/lib/rich-text';

import type {
  PageSeo,
  PrivacyPolicy,
  PrivacyRecord,
  ResolvedPageSeo,
  SettingsRecord,
  SiteSettings,
} from '../types';

/** What the site chrome needs from the stored settings, in one language. The private parts stay behind. */
export function toSiteSettings(record: SettingsRecord, locale: Locale, now: Date): SiteSettings {
  const { privacy: _privacy, seo: _seo, notifications: _notifications, ...rest } = record;
  return {
    ...rest,
    footerTagline: resolveLocalized(rest.footerTagline, locale),
    contact: {
      mainEmail: rest.contact.mainEmail,
      address: resolveLocalized(rest.contact.address, locale),
      officeRoom: resolveLocalized(rest.contact.officeRoom, locale),
    },
    weeklyMeeting: {
      ...rest.weeklyMeeting,
      room: resolveLocalized(rest.weeklyMeeting.room, locale),
      nextAt: nextMeetingAt(rest.weeklyMeeting, now).toISOString(),
    },
    currentYear: now.getFullYear(),
  };
}

export function toResolvedSeo(seo: PageSeo, locale: Locale): ResolvedPageSeo {
  return {
    title: resolveLocalized(seo.title, locale),
    description: resolveLocalized(seo.description, locale),
    shareImage: seo.shareImage,
  };
}

/** English falls back to Macedonian while the English body is empty. */
export function toPrivacyPolicy(privacy: PrivacyRecord, locale: Locale): PrivacyPolicy {
  const useEnglish = locale === 'en' && !isEmptyRichText(privacy.body.en ?? '');
  return {
    title: resolveText(privacy.title, locale).text,
    body: useEnglish ? (privacy.body.en ?? '') : privacy.body.mk,
    isPlaceholder: privacy.isPlaceholder,
    lang: useEnglish ? 'en' : 'mk',
  };
}
