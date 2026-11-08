'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';

import { settingsTags } from '../cache-tags';
import { settingsRepository } from '../data';
import { NOTIFICATION_KINDS } from '../types';

const schema = z.object({ kind: z.enum(NOTIFICATION_KINDS), enabled: z.boolean() });

/**
 * One switch of Settings › E-mail notifications, for the places that show it elsewhere (Ideas ›
 * Form settings: "E-mail the board on every new submission"). Super admins only, like Settings (D18).
 */
export async function setNotificationEnabled(input: unknown): Promise<ActionResult<{ enabled: boolean }>> {
  const session = await authorize('edit', 'settings');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const { kind, enabled } = parsed.data;

  const repo = await settingsRepository();
  const { privacy: _privacy, ...record } = await repo.getRecord();
  if (record.notifications[kind].enabled === enabled) return ok({ enabled });
  await repo.save({
    ...record,
    notifications: { ...record.notifications, [kind]: { ...record.notifications[kind], enabled } },
  });
  updateTag(settingsTags.all);
  await recordActivity(session, {
    action: 'updated',
    area: 'settings',
    target: `Settings › E-mail notifications › ${kind}`,
    href: '/admin/settings#notifications',
  });
  return ok({ enabled });
}
