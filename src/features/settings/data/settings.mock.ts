import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import { toPrivacyPolicy, toResolvedSeo, toSiteSettings } from '../domain/resolve';
import type { SettingsRepository } from './settings.repository';
import { settingsFixture } from './fixtures/settings';

export function createMockSettingsRepository(): SettingsRepository {
  const table = mockTable('settings', () => ({ record: settingsFixture }));

  return {
    getSiteSettings({ locale, now }) {
      return Promise.resolve(toSiteSettings(table.record, locale, now));
    },

    getPageSeo({ page, locale }) {
      return Promise.resolve(toResolvedSeo(table.record.seo[page], locale));
    },

    getRecord() {
      return Promise.resolve(structuredClone(table.record));
    },

    save(input) {
      table.record = { ...structuredClone(input), privacy: table.record.privacy };
      return Promise.resolve(structuredClone(table.record));
    },

    savePrivacy(input) {
      table.record = { ...table.record, privacy: structuredClone(input) };
      return Promise.resolve(structuredClone(table.record.privacy));
    },

    getPrivacyPolicy({ locale }) {
      return Promise.resolve(toPrivacyPolicy(table.record.privacy, locale));
    },
  };
}
