'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { listEventOptions } from '@/features/events/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { applicationTags } from '../../cache-tags';
import { applicationsRepository } from '../../data';
import { APPLICATION_STATUSES } from '../../types';

// Admin › Applications: status changes and "opened". Event managers only on their events (D18).

const id = z.string().regex(/^[\w-]{1,64}$/);
const statusSchema = z.object({
  eventId: id,
  ids: z.array(id).min(1).max(500),
  status: z.enum(APPLICATION_STATUSES),
});

const STATUS_WORD = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlist: 'Waitlist',
} as const;

/** `accepted`: accepted applications of the event afterwards (the list warns above the places). */
export type StatusChangeResult = { changed: number; accepted: number };

/** Bulk or single: Accept / Waitlist / Reject / back to Pending. Places on the site update at once. */
export async function setApplicationsStatus(input: unknown): Promise<ActionResult<StatusChangeResult>> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const { eventId, ids, status } = parsed.data;
  const session = await authorize('edit', 'applications', { eventId });
  if (!session) return { ok: false, error: 'forbidden' };
  const repo = await applicationsRepository();
  const changed = await repo.setStatus(eventId, ids, status);
  if (changed.length > 0) {
    const title = (await listEventOptions()).find((event) => event.id === eventId)?.title ?? eventId;
    await recordActivity(session, {
      action: 'updated',
      area: 'applications',
      target: `${changed.length === 1 ? '1 application' : `${changed.length} applications`} → ${STATUS_WORD[status]} · ${title}`,
      href: `/admin/applications?event=${eventId}`,
    });
    updateTag(applicationTags.event(eventId));
    updateTag(applicationTags.all);
  }
  refresh();
  const places = (await repo.availability([eventId]))[eventId];
  return ok({ changed: changed.length, accepted: places?.taken ?? 0 });
}

/** The admin opened an application: it is no longer counted as new. */
export async function markApplicationRead(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ eventId: id, id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('view', 'applications', { eventId: parsed.data.eventId });
  if (!session) return { ok: false, error: 'forbidden' };
  const repo = await applicationsRepository();
  const application = await repo.get(parsed.data.id);
  if (!application || application.eventId !== parsed.data.eventId) return { ok: false, error: 'not_found' };
  if (!application.readAt) {
    await repo.markRead(application.id, now());
    refresh();
  }
  return ok(undefined);
}
