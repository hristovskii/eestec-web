'use server';

import { refresh } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import type { AdminAccount, AdminRole } from '@/features/auth';
import {
  authorize,
  inviteAdminAccount,
  listAdminAccounts,
  removeAdminAccount,
  resendAdminInvite,
  updateAdminAccount,
} from '@/features/auth/server';
import { listEventOptions } from '@/features/events/server';
import { type ActionResult, type FieldErrors, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { adminChangeProblem } from '../domain/admin-rules';
import { adminUserIdSchema, changeAdminSchema, inviteAdminSchema } from '../schemas/admin-users.schema';

const ROLE_NAMES: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  editor: 'Editor',
  event_manager: 'Event manager',
};

const validation = (fieldErrors: FieldErrors) => ({ ok: false, error: 'validation', fieldErrors }) as const;

/** Every picked event must exist (the list can change while the dialog is open). */
async function unknownEvent(ids: readonly string[]) {
  const known = new Set((await listEventOptions()).map((event) => event.id));
  return ids.some((id) => !known.has(id));
}

/** Admin users › Invite admin (super admins only, D18). */
export async function inviteAdmin(input: unknown): Promise<ActionResult<AdminAccount>> {
  const session = await authorize('edit', 'adminUsers');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = inviteAdminSchema.safeParse(input);
  if (!parsed.success) return validation(fieldErrorsFrom(parsed.error.issues));
  const { name, email, role } = parsed.data;
  const managedEventIds = role === 'event_manager' ? parsed.data.managedEventIds : [];
  if (await unknownEvent(managedEventIds)) return validation({ managedEventIds: ['unknownEvent'] });

  const result = await inviteAdminAccount({ name, email, role, managedEventIds, now: now() });
  if (result.status === 'already_admin') return validation({ email: ['alreadyAdmin'] });
  await recordActivity(session, {
    action: 'created',
    area: 'users',
    target: `admin ${result.account.name} (${ROLE_NAMES[role]})`,
    href: '/admin/users',
  });
  refresh();
  return ok(result.account);
}

/** Change someone's role and/or the events they manage. */
export async function changeAdmin(input: unknown): Promise<ActionResult<AdminAccount>> {
  const session = await authorize('edit', 'adminUsers');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = changeAdminSchema.safeParse(input);
  if (!parsed.success) return validation(fieldErrorsFrom(parsed.error.issues));
  const { userId, role, managedEventIds } = parsed.data;

  const admins = await listAdminAccounts();
  const target = admins.find((admin) => admin.userId === userId);
  if (!target) return { ok: false, error: 'not_found' };
  const problem = adminChangeProblem({ actorId: session.userId, target, next: role, admins });
  if (problem) return { ok: false, error: 'conflict', message: problem };
  if (role === 'event_manager' && (await unknownEvent(managedEventIds)))
    return validation({ managedEventIds: ['unknownEvent'] });

  const updated = await updateAdminAccount(userId, { role, managedEventIds });
  if (!updated) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'users',
    target:
      role === target.role ? `events of ${target.name}` : `role of ${target.name} → ${ROLE_NAMES[role]}`,
    href: '/admin/users',
  });
  refresh();
  return ok(updated);
}

export async function resendInvite(input: unknown): Promise<ActionResult<AdminAccount>> {
  const session = await authorize('edit', 'adminUsers');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = adminUserIdSchema.safeParse(input);
  if (!parsed.success) return validation(fieldErrorsFrom(parsed.error.issues));
  const account = await resendAdminInvite(parsed.data.userId, now());
  if (!account) return { ok: false, error: 'not_found' };
  refresh();
  return ok(account);
}

export async function removeAdminAccess(input: unknown): Promise<ActionResult> {
  const session = await authorize('edit', 'adminUsers');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = adminUserIdSchema.safeParse(input);
  if (!parsed.success) return validation(fieldErrorsFrom(parsed.error.issues));
  const admins = await listAdminAccounts();
  const target = admins.find((admin) => admin.userId === parsed.data.userId);
  if (!target) return { ok: false, error: 'not_found' };
  const problem = adminChangeProblem({ actorId: session.userId, target, next: null, admins });
  if (problem) return { ok: false, error: 'conflict', message: problem };
  await removeAdminAccount(target.userId);
  await recordActivity(session, {
    action: 'deleted',
    area: 'users',
    target: `admin access of ${target.name}`,
  });
  refresh();
  return ok(undefined);
}
