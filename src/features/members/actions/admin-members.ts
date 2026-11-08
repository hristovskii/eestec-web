'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { membersRepository } from '../data';
import { profileEditSchema } from '../schemas/profile-edit.schema';
import type { Profile } from '../types';

// Admin › Members. Permission: the Members area (super admins and editors, D18).

const HREF = '/admin/members';

/** What the board edits on a profile: status, teams, badges, years, alumni lines, events, moderation. */
export async function saveMemberProfile(input: unknown): Promise<ActionResult<Profile>> {
  const request = z.object({ userId: z.string().regex(/^[\w-]{1,64}$/), edit: z.unknown() }).safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'members');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = profileEditSchema.safeParse(request.data.edit);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const repo = await membersRepository('session');
  const result = await repo.saveProfile(request.data.userId, parsed.data, now());
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'members',
    target: `member ${result.profile.name}`,
    href: HREF,
  });
  refresh();
  return ok(result.profile);
}
