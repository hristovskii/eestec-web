'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { can } from '@/features/auth';
import { getSession } from '@/features/auth/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';
import { SLUG_MAX } from '@/shared/lib/slug';

import { eventTags } from '../cache-tags';
import { eventsAdminRepository } from '../data';
import { publishIssues, publishWarnings } from '../schemas/event.schema';
import { CONTENT_STATUSES, type EventRecord } from '../types';

const idsSchema = z.array(z.string().min(1).max(64)).min(1).max(100);
const statusInputSchema = z.object({ ids: idsSchema, status: z.enum(CONTENT_STATUSES) });

const STATUS_VERB = { published: 'published', draft: 'moved to draft', hidden: 'hid' } as const;

const describe = (events: EventRecord[]) =>
  events.length === 1 ? events[0]!.title.mk : `${events.length} events`;

/** The events of `ids` this admin may change with `action` (event managers: their own, D18). */
async function allowed(ids: readonly string[], action: 'publish' | 'delete' | 'create') {
  const session = await getSession();
  if (!session) return null;
  const repo = await eventsAdminRepository();
  const events = (await Promise.all(ids.map((id) => repo.get(id)))).filter((event) => event !== null);
  return {
    session,
    repo,
    events: events.filter((event) => can(session, action, 'events', { eventId: event.id })),
  };
}

const changed = () => {
  updateTag(eventTags.list);
  refresh();
};

export type StatusChangeResult = {
  changed: number;
  /** Titles that can't be published yet (missing cover, alt text, deadline…). */
  notReady: string[];
  /** Went live without a cover: they use the default red cover (D21). */
  defaultCover: string[];
};

/** Bulk Publish / Move to draft / Hide. Going live checks each event like the edit form does. */
export async function setEventsStatus(input: unknown): Promise<ActionResult<StatusChangeResult>> {
  const parsed = statusInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const { ids, status } = parsed.data;
  const context = await allowed(ids, 'publish');
  if (!context || context.events.length === 0) return { ok: false, error: 'forbidden' };
  const { session, repo, events } = context;

  // Published and hidden events are both on the site (hidden: by link only), so both need the
  // publish rules; going back to draft always works.
  const goesLive = status !== 'draft';
  const notReady = goesLive ? events.filter((event) => publishIssues(event).length > 0) : [];
  const ready = events.filter((event) => !notReady.includes(event));
  const changedIds = ready.length
    ? await repo.setStatus(
        ready.map((event) => event.id),
        status,
        { userId: session.userId, name: session.name },
        now(),
      )
    : [];

  if (changedIds.length > 0) {
    const target = describe(ready.filter((event) => changedIds.includes(event.id)));
    await recordActivity(session, {
      action: status === 'published' ? 'published' : 'updated',
      area: 'events',
      target: status === 'published' ? target : `${target} (${STATUS_VERB[status]})`,
      href: '/admin/events',
    });
    changed();
  }
  const defaultCover = goesLive
    ? ready.filter(
        (event) => changedIds.includes(event.id) && publishWarnings(event).includes('defaultCover'),
      )
    : [];
  return ok({
    changed: changedIds.length,
    notReady: notReady.map((event) => event.title.mk),
    defaultCover: defaultCover.map((event) => event.title.mk),
  });
}

/** Delete events (row menu or bulk). Event managers can't delete (D18). */
export async function deleteEvents(input: unknown): Promise<ActionResult<{ deleted: number }>> {
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const context = await allowed(parsed.data, 'delete');
  if (!context || context.events.length === 0) return { ok: false, error: 'forbidden' };
  const { session, repo, events } = context;
  const removed = await repo.remove(events.map((event) => event.id));
  await recordActivity(session, { action: 'deleted', area: 'events', target: describe(events) });
  changed();
  return ok({ deleted: removed.length });
}

/** Row menu › Duplicate: a draft copy with a new address, opened for editing. */
export async function duplicateEvent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z.string().min(1).max(64).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await getSession();
  if (!session || !can(session, 'create', 'events')) return { ok: false, error: 'forbidden' };
  const repo = await eventsAdminRepository();
  const source = await repo.get(parsed.data);
  if (!source) return { ok: false, error: 'not_found' };

  const { id: _id, createdAt: _created, updatedAt: _updated, updatedBy: _by, ...fields } = source;
  const base = `${source.slug.slice(0, SLUG_MAX - 8)}-copy`;
  let slug = base;
  for (let n = 2; await repo.slugTaken(slug); n += 1) slug = `${base}-${n}`;
  const copy = (text: string) => (text ? `${text} (copy)` : text);
  const result = await repo.save(
    {
      ...fields,
      slug,
      title: { mk: copy(source.title.mk), ...(source.title.en ? { en: copy(source.title.en) } : {}) },
      status: 'draft',
      publishAt: null,
      nextUp: false,
    },
    { userId: session.userId, name: session.name },
    now(),
  );
  if (result.status !== 'saved') return { ok: false, error: 'conflict' };
  await recordActivity(session, {
    action: 'created',
    area: 'events',
    target: result.record.title.mk,
    href: `/admin/events/${result.record.id}`,
  });
  refresh();
  return ok({ id: result.record.id });
}
