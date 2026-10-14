'use server';

import { refresh, updateTag } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { journeyTags } from '../cache-tags';
import { journeyRepository } from '../data';
import { journeyInputSchema } from '../schemas/journey.schema';
import type { JourneyRecord } from '../types';

// Admin › Pages › Journey. Permission: the Pages area (super admins and editors, D18).

/** "Save changes": validates everything, stores it, refreshes the public pages. Field errors are `admin.journey.errors` keys. */
export async function saveJourney(input: unknown): Promise<ActionResult<JourneyRecord>> {
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = journeyInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const saved = await (await journeyRepository('session')).save(parsed.data);
  await recordActivity(session, {
    action: 'updated',
    area: 'pages',
    target: 'EESTEC Journey page',
    href: '/admin/pages/journey',
  });
  updateTag(journeyTags.all);
  refresh();
  return ok(saved);
}
