import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { resolveLocalized, resolveText } from '@/shared/i18n/localized';

import type { SettingsRepository } from './settings.repository';
import { settingsFixture } from './fixtures/settings';

export function createMockSettingsRepository(): SettingsRepository {
  const table = mockTable('settings', () => ({ record: settingsFixture }));

  return {
    getSiteSettings({ locale, now }) {
      const { privacy: _privacy, seo: _seo, notifications: _notifications, ...record } = table.record;
      return Promise.resolve({
        ...record,
        footerTagline: resolveLocalized(record.footerTagline, locale),
        contact: {
          mainEmail: record.contact.mainEmail,
          address: resolveLocalized(record.contact.address, locale),
          officeRoom: resolveLocalized(record.contact.officeRoom, locale),
        },
        weeklyMeeting: { ...record.weeklyMeeting, room: resolveLocalized(record.weeklyMeeting.room, locale) },
        currentYear: now.getFullYear(),
      });
    },

    getPageSeo({ page, locale }) {
      const seo = table.record.seo[page];
      return Promise.resolve({
        title: resolveLocalized(seo.title, locale),
        description: resolveLocalized(seo.description, locale),
        shareImage: seo.shareImage,
      });
    },

    getRecord() {
      return Promise.resolve(structuredClone(table.record));
    },

    save(input) {
      table.record = { ...structuredClone(input), privacy: table.record.privacy };
      return Promise.resolve(structuredClone(table.record));
    },

    getPrivacyPolicy({ locale }) {
      const { privacy } = table.record;
      const englishBody = privacy.body.en;
      const useEnglish = locale === 'en' && englishBody !== undefined && englishBody.length > 0;
      return Promise.resolve({
        title: resolveText(privacy.title, locale).text,
        body: useEnglish ? englishBody : privacy.body.mk,
        isPlaceholder: privacy.isPlaceholder,
        lang: useEnglish ? 'en' : 'mk',
      });
    },
  };
}
