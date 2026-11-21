import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser } from '../../../../tests/supabase/harness';
import { describeSettingsRepository } from './settings.repository.contract';
import { createSupabaseSettingsRepository } from './settings.supabase';

let superAdmin: Awaited<ReturnType<typeof createTestUser>>;
let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  superAdmin = await createTestUser({ role: 'super_admin' });
  editor = await createTestUser({ role: 'editor' });
});
afterAll(async () => {
  await superAdmin.cleanup();
  await editor.cleanup();
});

// Saving settings is for a super admin with a 2-step session (D18).
describeSettingsRepository('supabase', () => createSupabaseSettingsRepository(superAdmin.client('aal2')));

describe('SettingsRepository (supabase, other roles)', () => {
  const NOW = new Date('2026-10-04T18:18:00+02:00');

  it('gives visitors the site settings but never the notification recipients', async () => {
    const repo = createSupabaseSettingsRepository(anonClient());
    expect((await repo.getSiteSettings({ locale: 'mk', now: NOW })).siteName).toBeTruthy();
    const record = await repo.getRecord();
    expect(Object.values(record.notifications).every((n) => n.recipients.length === 0)).toBe(true);
  });

  it('lets an editor read and save the privacy text, but not the settings', async () => {
    const repo = createSupabaseSettingsRepository(editor.client());
    const record = await repo.getRecord();
    const saved = await repo.savePrivacy({ ...record.privacy, isPlaceholder: record.privacy.isPlaceholder });
    expect(saved).toEqual(record.privacy);
    const { privacy: _privacy, ...input } = record;
    await expect(repo.save(input)).rejects.toMatchObject({ kind: 'forbidden' });
  });
});
