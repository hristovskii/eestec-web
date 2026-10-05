'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { eventTags } from '../cache-tags';
import { eventTaxonomyRepository } from '../data';

// Admin › Events › Event types & topics (super admins and editors; not event managers, D18).
// Messages are keys under admin.events.taxonomy.errors.

const kind = z.enum(['types', 'topics']);
const name = z.object({
  mk: z.string().trim().min(1, 'required').max(60, 'tooLong'),
  en: z.string().trim().max(60, 'tooLong').optional(),
});
const id = z.string().min(1).max(64);

const LABEL = { types: 'event type', topics: 'topic' } as const;

const changed = () => {
  // Types and topics are filters and badges on the public lists.
  updateTag(eventTags.list);
  refresh();
};

export async function createTaxonomyItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await authorize('edit', 'eventTypes');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = z.object({ kind, name }).safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const repo = await eventTaxonomyRepository();
  const existing = await repo.list(parsed.data.kind);
  const wanted = parsed.data.name.mk.toLocaleLowerCase('mk');
  if (existing.some((item) => item.name.mk.toLocaleLowerCase('mk') === wanted))
    return { ok: false, error: 'validation', fieldErrors: { 'name.mk': ['duplicate'] } };
  const item = await repo.create(parsed.data.kind, parsed.data.name);
  await recordActivity(session, {
    action: 'created',
    area: 'events',
    target: `${LABEL[parsed.data.kind]} “${item.name.mk}”`,
    href: '/admin/events/types',
  });
  changed();
  return ok({ id: item.id });
}

export async function renameTaxonomyItem(input: unknown): Promise<ActionResult> {
  const session = await authorize('edit', 'eventTypes');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = z.object({ kind, id, name }).safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const repo = await eventTaxonomyRepository();
  const wanted = parsed.data.name.mk.toLocaleLowerCase('mk');
  const existing = await repo.list(parsed.data.kind);
  if (existing.some((item) => item.id !== parsed.data.id && item.name.mk.toLocaleLowerCase('mk') === wanted))
    return { ok: false, error: 'validation', fieldErrors: { 'name.mk': ['duplicate'] } };
  const item = await repo.rename(parsed.data.kind, parsed.data.id, parsed.data.name);
  if (!item) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'events',
    target: `${LABEL[parsed.data.kind]} “${item.name.mk}”`,
    href: '/admin/events/types',
  });
  changed();
  return ok(undefined);
}

export async function reorderTaxonomy(input: unknown): Promise<ActionResult> {
  const session = await authorize('edit', 'eventTypes');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = z.object({ kind, ids: z.array(id).max(200) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const repo = await eventTaxonomyRepository();
  // The list changed meanwhile (someone added or removed an item): reload instead.
  if (!(await repo.reorder(parsed.data.kind, parsed.data.ids))) return { ok: false, error: 'conflict' };
  changed();
  return ok(undefined);
}

export async function removeTaxonomyItem(input: unknown): Promise<ActionResult> {
  const session = await authorize('edit', 'eventTypes');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = z.object({ kind, id, replacementId: id.optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const repo = await eventTaxonomyRepository();
  const item = (await repo.list(parsed.data.kind)).find((candidate) => candidate.id === parsed.data.id);
  if (!item) return { ok: false, error: 'not_found' };
  const result = await repo.remove(parsed.data.kind, parsed.data.id, parsed.data.replacementId);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'replacement_required')
    return { ok: false, error: 'validation', fieldErrors: { replacementId: ['replacementRequired'] } };
  await recordActivity(session, {
    action: 'deleted',
    area: 'events',
    target: `${LABEL[parsed.data.kind]} “${item.name.mk}”`,
    href: '/admin/events/types',
  });
  changed();
  return ok(undefined);
}
