'use server';

import { z } from 'zod';

import { currentMember, passwordFailure, verifyMemberPassword } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';

import { accountDeletion } from '../data';

// /profile › Account › Delete my account. It spans several features (the profile, choices, CV and photo,
// the applications, the Memories, the account itself), so it goes through the account-deletion port
// (data/account-deletion.ts): one durable job on a database, the same steps one by one on mock data.
// Drafts and waiting Memories always go; published ones only when asked. No `refresh()`: the page
// would only redirect to log in.

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

  const deleted = await (
    await accountDeletion()
  ).deleteAccount({
    userId: session.userId,
    name: session.name,
    email: session.email,
    locale: 'mk',
    alsoDeleteMemories: parsed.data.alsoDeleteMemories,
  });
  if (deleted.status !== 'deleted') return { ok: false, error: 'unexpected' };
  return ok({ firstName: session.name.split(' ')[0] ?? session.name });
}
