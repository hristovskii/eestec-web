import type { Locale } from '@/shared/i18n/routing';

import type {
  PrivacyInput,
  PrivacyPolicy,
  PrivacyRecord,
  ResolvedPageSeo,
  SeoPageKey,
  SettingsInput,
  SettingsRecord,
  SiteSettings,
} from '../types';

/** Site-wide settings and legal texts (Admin › Settings). */
export interface SettingsRepository {
  getSiteSettings(query: { locale: Locale; now: Date }): Promise<SiteSettings>;
  getPrivacyPolicy(query: { locale: Locale }): Promise<PrivacyPolicy>;
  /** Title, description and share image of one page; EN falls back to MK per field. */
  getPageSeo(query: { page: SeoPageKey; locale: Locale }): Promise<ResolvedPageSeo>;
  /** The stored settings with both languages (admin form). */
  getRecord(): Promise<SettingsRecord>;
  /** Replaces everything Admin › Settings edits; returns the stored result. */
  save(input: SettingsInput): Promise<SettingsRecord>;
  /** Replaces the privacy policy (Admin › Pages › Contact › Privacy policy); returns the stored result. */
  savePrivacy(input: PrivacyInput): Promise<PrivacyRecord>;
}
