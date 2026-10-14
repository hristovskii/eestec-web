'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { membershipRepository } from '../data';
import { MEMBERSHIP_STATUSES } from '../types';

// Admin › Inbox › Membership applications. Permission: the Inbox area (super admins and editors, D18).

const id = z.string().regex(/^[\w-]{1,64}$/);
const STATUS_WORD = {
  new: 'New',
  contacted: 'Contacted',
  accepted: 'Accepted',
  rejected: 'Rejected',
} as const;

/** The status select and the quick status button. */
export async function changeApplicationStatus(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, status: z.enum(MEMBERSHIP_STATUSES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'inbox');
  if (!session) return { ok: false, error: 'forbidden' };
  const application = await (
    await membershipRepository('session')
  ).updateStatus(parsed.data.id, parsed.data.status);
  if (!application) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'inbox',
    target: `membership application of ${application.name} → ${STATUS_WORD[application.status]}`,
    href: `/admin/inbox?tab=membership&open=${application.id}`,
  });
  refresh();
  return ok(undefined);
}

/** Opening an application marks it read; the envelope marks it unread again. */
export async function setApplicationRead(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, read: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  if (!(await authorize('edit', 'inbox'))) return { ok: false, error: 'forbidden' };
  const repo = await membershipRepository('session');
  const before = await repo.get(parsed.data.id);
  if (!before) return { ok: false, error: 'not_found' };
  if ((before.readAt !== null) === parsed.data.read) return ok(undefined);
  await repo.setRead(parsed.data.id, parsed.data.read ? now() : null);
  refresh();
  return ok(undefined);
}

/** "Mark all as read" in the toolbar. */
export async function markAllApplicationsRead(): Promise<ActionResult<{ changed: number }>> {
  if (!(await authorize('edit', 'inbox'))) return { ok: false, error: 'forbidden' };
  const changed = await (await membershipRepository('session')).markAllRead(now());
  refresh();
  return ok({ changed });
}
