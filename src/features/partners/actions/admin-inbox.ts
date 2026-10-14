'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { inquiriesRepository } from '../data';
import { INQUIRY_STATUSES } from '../types';

// Admin › Inbox › Partner inquiries. Permission: the Inbox area (super admins and editors, D18).

const id = z.string().regex(/^[\w-]{1,64}$/);
const STATUS_WORD = { new: 'New', in_progress: 'In progress', done: 'Done' } as const;

/** The status select and the quick status buttons. */
export async function changeInquiryStatus(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, status: z.enum(INQUIRY_STATUSES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'inbox');
  if (!session) return { ok: false, error: 'forbidden' };
  const inquiry = await (
    await inquiriesRepository('session')
  ).updateStatus(parsed.data.id, parsed.data.status);
  if (!inquiry) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'inbox',
    target: `${inquiry.reference} → ${STATUS_WORD[inquiry.status]}`,
    href: `/admin/inbox?tab=partners&open=${inquiry.id}`,
  });
  refresh();
  return ok(undefined);
}

/** Opening an inquiry marks it read; the envelope marks it unread again. */
export async function setInquiryRead(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, read: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  if (!(await authorize('edit', 'inbox'))) return { ok: false, error: 'forbidden' };
  const repo = await inquiriesRepository('session');
  const before = await repo.get(parsed.data.id);
  if (!before) return { ok: false, error: 'not_found' };
  if ((before.readAt !== null) === parsed.data.read) return ok(undefined);
  await repo.setRead(parsed.data.id, parsed.data.read ? now() : null);
  refresh();
  return ok(undefined);
}

/** "Mark all as read" in the toolbar. */
export async function markAllInquiriesRead(): Promise<ActionResult<{ changed: number }>> {
  if (!(await authorize('edit', 'inbox'))) return { ok: false, error: 'forbidden' };
  const changed = await (await inquiriesRepository('session')).markAllRead(now());
  refresh();
  return ok({ changed });
}
