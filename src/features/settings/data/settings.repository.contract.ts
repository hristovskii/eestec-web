import { describe, expect, it } from 'vitest';

import type { SettingsRepository } from './settings.repository';

const NOW = new Date('2026-10-04T18:18:00+02:00');

/** Behaviour every SettingsRepository must have (mock now, Supabase in M20). */
export function describeSettingsRepository(
  name: string,
  create: () => SettingsRepository | Promise<SettingsRepository>,
) {
  describe(`SettingsRepository (${name})`, () => {
    it('returns the decided event defaults', async () => {
      const settings = await (await create()).getSiteSettings({ locale: 'mk', now: NOW });
      expect(settings.events).toEqual({
        deadlineSoonHours: 72,
        justEndedDays: 14,
        defaultMaxParticipants: 24,
        defaultWaitlistEnabled: true,
        autoCloseApplications: true,
      });
      expect(settings.retentionMonths).toBe(12);
    });

    it('takes the copyright year from the clock it is given', async () => {
      const settings = await (await create()).getSiteSettings({ locale: 'en', now: NOW });
      expect(settings.currentYear).toBe(2026);
    });

    it('returns board roles in their admin order', async () => {
      const settings = await (await create()).getSiteSettings({ locale: 'mk', now: NOW });
      expect(settings.boardRoles.length).toBeGreaterThan(0);
      for (const role of settings.boardRoles) expect(role.email).toMatch(/@/);
    });

    it('resolves the privacy policy per locale and says which language it is in', async () => {
      const repo = await create();
      const mk = await repo.getPrivacyPolicy({ locale: 'mk' });
      const en = await repo.getPrivacyPolicy({ locale: 'en' });
      expect(mk.lang).toBe('mk');
      expect(['mk', 'en']).toContain(en.lang);
      expect(mk.body.length).toBeGreaterThan(0);
    });
  });
}
