'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { messagesRepository } from '../data';
import { CONTACT_STATUSES } from '../types';

// Admin › Inbox › Contact messages. Permission: the Inbox area (super admins and editors, D18).

const id = z.string().regex(/^[\w-]{1,64}$/);
const STATUS_WORD = { new: 'New', answered: 'Answered', archived: 'Archived' } as const;

/** The status select and the "Mark as answered" / "Archive" buttons. */
export async function changeMessageStatus(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, status: z.enum(CONTACT_STATUSES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'inbox');
  if (!session) return { ok: false, error: 'forbidden' };
  const message = await (
    await messagesRepository('session')
  ).updateStatus(parsed.data.id, parsed.data.status);
  if (!message) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'inbox',
    target: `${message.reference} → ${STATUS_WORD[message.status]}`,
    href: `/admin/inbox?tab=contact&open=${message.id}`,
  });
  refresh();
  return ok(undefined);
}

/** Opening a message marks it read; the envelope marks it unread again. */
export async function setMessageRead(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, read: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  if (!(await authorize('edit', 'inbox'))) return { ok: false, error: 'forbidden' };
  const repo = await messagesRepository('session');
  const before = await repo.get(parsed.data.id);
  if (!before) return { ok: false, error: 'not_found' };
  // Nothing to change (opened twice): no refresh.
  if ((before.readAt !== null) === parsed.data.read) return ok(undefined);
  await repo.setRead(parsed.data.id, parsed.data.read ? now() : null);
  refresh();
  return ok(undefined);
}

/** "Mark all as read" in the toolbar. */
export async function markAllMessagesRead(): Promise<ActionResult<{ changed: number }>> {
  if (!(await authorize('edit', 'inbox'))) return { ok: false, error: 'forbidden' };
  const changed = await (await messagesRepository('session')).markAllRead(now());
  refresh();
  return ok({ changed });
}
