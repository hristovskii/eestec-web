import type { Locale } from '@/shared/i18n/routing';

import type { PrivacyPolicy, SiteSettings } from '../types';

/** Site-wide settings and legal texts. Writes (Admin › Settings) arrive in M4. */
export interface SettingsRepository {
  getSiteSettings(query: { locale: Locale; now: Date }): Promise<SiteSettings>;
  getPrivacyPolicy(query: { locale: Locale }): Promise<PrivacyPolicy>;
}
