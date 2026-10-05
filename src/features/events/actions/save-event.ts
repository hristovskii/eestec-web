'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { can } from '@/features/auth';
import { getSession } from '@/features/auth/server';
import { getMediaItems } from '@/features/media/server';
import { type ActionResult, type FieldErrors, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';
import { SLUG_MAX, slugify } from '@/shared/lib/slug';
import type { Localized } from '@/shared/types/localized';

import { eventTags } from '../cache-tags';
import { eventsRepository, eventTaxonomyRepository } from '../data';
import {
  type EventDraftInput,
  eventDraftSchema,
  eventPublishSchema,
  type PublishWarning,
  publishWarnings,
} from '../schemas/event.schema';
import type { EventRecord } from '../types';

// Admin › Events › edit form. One action for both buttons: "Save draft" always works (lenient
// schema, the event becomes or stays a draft); "Publish" / "Update live page" checks the publish
// rules and saves with the status chosen in Publishing (published or hidden; draft unpublishes).
// Field errors are message keys under admin.events.edit.errors, keyed by field path.

const requestSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  intent: z.enum(['draft', 'publish']),
  /** The address was never edited by hand: make it from the title and find a free one. */
  autoSlug: z.boolean(),
  event: z.unknown(),
});

export type SaveEventResult = { record: EventRecord; warnings: PublishWarning[] };

const clean = (value: Localized): Localized => ({
  mk: sanitizeRichText(value.mk),
  ...(value.en ? { en: sanitizeRichText(value.en) } : {}),
});

/** Rich text is cleaned before validation, so length limits apply to what is stored. */
function sanitizeInput(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const event = raw as Partial<EventDraftInput>;
  const rich = (value: unknown) =>
    typeof value === 'object' && value !== null && typeof (value as Localized).mk === 'string'
      ? clean(value as Localized)
      : value;
  return { ...event, description: rich(event.description), requirements: rich(event.requirements) };
}

/** Types, topics and files must exist (and be the right kind of file). */
async function unknownReferences(event: EventDraftInput): Promise<FieldErrors> {
  const taxonomy = await eventTaxonomyRepository();
  const [types, topics] = await Promise.all([taxonomy.list('types'), taxonomy.list('topics')]);
  const errors: FieldErrors = {};
  if (!types.some((type) => type.id === event.typeId)) errors.typeId = ['unknown'];
  if (event.topicIds.some((id) => !topics.some((topic) => topic.id === id))) errors.topicIds = ['unknown'];

  const images = [
    ...(event.cover ? [['cover', event.cover.mediaId] as const] : []),
    ...event.gallery.map((photo, index) => [`gallery.${index}`, photo.mediaId] as const),
    ...(event.seo.shareImageId ? [['seo.shareImageId', event.seo.shareImageId] as const] : []),
  ];
  const files = await getMediaItems([
    ...images.map(([, id]) => id),
    ...(event.infoPackId ? [event.infoPackId] : []),
  ]);
  const kindOf = (id: string) => files.find((file) => file.id === id)?.kind;
  for (const [path, id] of images) if (kindOf(id) !== 'image') errors[path] = ['unknownFile'];
  if (event.infoPackId && kindOf(event.infoPackId) !== 'document') errors.infoPackId = ['unknownFile'];
  return errors;
}

export async function saveEvent(input: unknown): Promise<ActionResult<SaveEventResult>> {
  const request = requestSchema.safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' };
  const { id, intent, autoSlug } = request.data;

  const session = await getSession();
  const repo = await eventsRepository();
  const existing = id ? await repo.get(id) : null;
  if (id && !existing) return { ok: false, error: 'not_found' };
  // New events: create (not event managers, D18). Existing: edit; going live: publish.
  const allowed = existing
    ? can(session, 'edit', 'events', { eventId: existing.id }) &&
      (intent === 'draft' || can(session, 'publish', 'events', { eventId: existing.id }))
    : can(session, 'create', 'events');
  if (!session || !allowed) return { ok: false, error: 'forbidden' };

  const raw = sanitizeInput(request.data.event) as Partial<EventDraftInput>;
  const wasLive = existing !== null && existing.status !== 'draft';
  const status =
    intent === 'draft'
      ? 'draft'
      : // Not live yet: "Publish" makes it live (as chosen: published, or hidden by link).
        !wasLive && raw.status === 'draft'
        ? 'published'
        : raw.status;
  const goesLive = status !== 'draft';

  // Address: from the title until someone edits it by hand; a live address never changes on its own.
  const useAutoSlug = autoSlug && !wasLive;
  const base =
    useAutoSlug && typeof raw.title?.mk === 'string'
      ? slugify(raw.title.en || raw.title.mk) || 'untitled-event'
      : raw.slug;
  const candidate = { ...raw, status, slug: typeof base === 'string' ? base.slice(0, SLUG_MAX) : base };

  const parsed = (goesLive ? eventPublishSchema : eventDraftSchema).safeParse(candidate);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const event = parsed.data;
  const references = await unknownReferences(event);
  if (Object.keys(references).length > 0) return { ok: false, error: 'validation', fieldErrors: references };

  if (useAutoSlug) {
    let slug = event.slug;
    for (let n = 2; await repo.slugTaken(slug, existing?.id); n += 1)
      slug = `${event.slug.slice(0, SLUG_MAX - String(n).length - 1)}-${n}`;
    event.slug = slug;
  }

  const editor = { userId: session.userId, name: session.name };
  const result = await repo.save({ ...event, id: existing?.id }, editor, now());
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'slug_taken')
    return { ok: false, error: 'validation', fieldErrors: { slug: ['slugTaken'] } };

  const { record } = result;
  const action = !existing ? 'created' : goesLive && !wasLive ? 'published' : 'updated';
  await recordActivity(session, {
    action,
    area: 'events',
    target: record.title.mk || 'Untitled event',
    href: `/admin/events/${record.id}`,
  });
  updateTag(eventTags.list);
  updateTag(eventTags.detail(record.slug));
  if (existing && existing.slug !== record.slug) updateTag(eventTags.detail(existing.slug));
  refresh();
  return ok({ record, warnings: goesLive ? publishWarnings(record) : [] });
}
