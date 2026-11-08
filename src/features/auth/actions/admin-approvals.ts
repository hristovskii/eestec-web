'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { authRepository } from '../data';
import { authorize } from '../guards';

// Admin › Approvals › Member registrations. Permission: the Approvals area (super admins and editors).

const decision = z.object({
  userIds: z
    .array(z.string().regex(/^[\w-]{1,80}$/))
    .min(1)
    .max(50),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).default(''),
  notify: z.boolean().default(true),
});

/** Approve or reject one or more registrations ("Approve selected" sends several). */
export async function decideRegistrations(input: unknown): Promise<ActionResult<{ decided: number }>> {
  const parsed = decision.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'approvals');
  if (!session) return { ok: false, error: 'forbidden' };
  const repo = await authRepository();
  let decided = 0;
  for (const userId of parsed.data.userIds) {
    const result = await repo.decideRegistration({
      userId,
      decision: parsed.data.decision,
      reason: parsed.data.reason,
      notify: parsed.data.notify,
      now: now(),
    });
    if (result.status !== 'decided') continue;
    decided += 1;
    await recordActivity(session, {
      action: parsed.data.decision === 'approve' ? 'approved' : 'rejected',
      area: 'approvals',
      target: `Member ${result.registration.name}`,
      href: '/admin/approvals?type=members',
    });
  }
  if (decided === 0) return { ok: false, error: 'not_found' };
  refresh();
  return ok({ decided });
}
