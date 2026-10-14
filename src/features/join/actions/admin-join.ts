'use server';

import { refresh, updateTag } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { joinTags } from '../cache-tags';
import { joinRepository } from '../data';
import { joinInputSchema } from '../schemas/join.schema';
import type { JoinRecord } from '../types';

// Admin › Pages › Join Us. Permission: the Pages area (super admins and editors, D18).

/** "Save changes": validates everything, stores it, refreshes the public page. Field errors are `admin.join.errors` keys. */
export async function saveJoin(input: unknown): Promise<ActionResult<JoinRecord>> {
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = joinInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const saved = await (await joinRepository('session')).save(parsed.data);
  await recordActivity(session, {
    action: 'updated',
    area: 'pages',
    target: 'Join Us page',
    href: '/admin/pages/join',
  });
  updateTag(joinTags.all);
  refresh();
  return ok(saved);
}
