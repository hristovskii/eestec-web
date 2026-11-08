'use server';

import { z } from 'zod';

import { deleteApplicationsOf } from '@/features/applications/server';
import {
  currentMember,
  deleteMemberAccount,
  deleteMemberPhoto,
  passwordFailure,
  verifyMemberPassword,
} from '@/features/auth/server';
import { retireMemoriesOf } from '@/features/memories/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';

import { membersRepository } from '../data';

// /profile › Account › Delete my account. It spans three features, so it is composed here: the
// profile, choices, CV and photo (members), the applications, the Memories (drafts and waiting ones
// always go; published ones only when asked) and last the account itself
// (which also clears the session). No `refresh()`: the page would only redirect to log in.

const deleteSchema = z.object({
  password: z.string().min(1),
  /** "Also delete my Memories" (default off): off keeps published ones as "A former member". */
  alsoDeleteMemories: z.boolean(),
});

export async function deleteMyAccount(input: unknown): Promise<ActionResult<{ firstName: string }>> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  // Board accounts are removed in Admin › Users & roles, never here.
  if (session.adminRole) return { ok: false, error: 'conflict' };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'validation', fieldErrors: { password: ['required'] } };
  }

  const check = await verifyMemberPassword(session.userId, parsed.data.password);
  if (check.status !== 'ok') return passwordFailure(check, 'password');

  const { photoUrl } = await (await membersRepository('session')).deleteMine(session.userId);
  deleteMemberPhoto(photoUrl);
  await deleteApplicationsOf(session.email);
  await retireMemoriesOf(session.userId, parsed.data.alsoDeleteMemories);
  const deleted = await deleteMemberAccount(session.userId);
  if (deleted.status !== 'deleted') return { ok: false, error: 'unexpected' };
  return ok({ firstName: session.name.split(' ')[0] ?? session.name });
}
