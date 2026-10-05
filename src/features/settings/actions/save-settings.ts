'use server';

import { updateTag } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { settingsTags } from '../cache-tags';
import { settingsRepository } from '../data';
import { changedSections, settingsInputSchema } from '../schemas/settings.schema';
import type { SettingsRecord } from '../types';

const SECTION_LABELS = {
  branding: 'Branding',
  events: 'Events',
  contact: 'Contact & legal',
  seo: 'SEO',
  notifications: 'E-mail notifications',
  languages: 'Languages',
  activity: 'Activity log',
  security: 'Security & backups',
} as const;

/** Admin › Settings › Save changes (super admins only, D18). */
export async function saveSettings(input: unknown): Promise<ActionResult<SettingsRecord>> {
  const session = await authorize('edit', 'settings');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const repo = await settingsRepository();
  const sections = changedSections(await repo.getRecord(), parsed.data);
  const saved = await repo.save(parsed.data);
  if (sections.length > 0) {
    // The public site reads settings from the cache: refresh it now (read-your-own-writes).
    updateTag(settingsTags.all);
    await recordActivity(session, {
      action: 'updated',
      area: 'settings',
      target: `Settings › ${sections.map((section) => SECTION_LABELS[section]).join(', ')}`,
      href: `/admin/settings#${sections[0]}`,
    });
  }
  return ok(saved);
}
