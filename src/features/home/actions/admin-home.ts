'use server';

import { refresh, updateTag } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { homeTags } from '../cache-tags';
import { homeRepository } from '../data';
import { homeInputSchema } from '../schemas/home.schema';
import type { HomeRecord } from '../types';

// Admin › Pages › Home. Permission: the Pages area (super admins and editors, D18).

/** "Save changes": validates everything, stores it, refreshes the public Home. Field errors are `admin.home.errors` keys. */
export async function saveHome(input: unknown): Promise<ActionResult<HomeRecord>> {
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = homeInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const saved = await (await homeRepository('session')).save(parsed.data);
  await recordActivity(session, {
    action: 'updated',
    area: 'pages',
    target: 'Home page',
    href: '/admin/pages/home',
  });
  updateTag(homeTags.all);
  refresh();
  return ok(saved);
}
