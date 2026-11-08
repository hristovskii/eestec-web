'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { createEventDraft } from '@/features/events/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { ideaFormRepository, submissionsRepository } from '../data';
import { listIdeaOwners } from '../admin-queries';
import { SUBMISSION_STATUSES } from '../types';

// Admin › Ideas & Feedback: what the board does with a submission. Super admins and editors only
// (event managers read feedback of their own events and change nothing, D18).

const id = z.string().regex(/^[\w-]{1,64}$/);

const statusSchema = z.object({ id, status: z.enum(SUBMISSION_STATUSES) });

const tabOf = { idea: 'ideas', feedback: 'feedback' } as const;

export async function changeIdeaStatus(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await authorize('edit', 'ideas');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const idea = await (
    await submissionsRepository('session')
  ).updateIdea(parsed.data.id, {
    status: parsed.data.status,
  });
  if (!idea) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'ideas',
    target: `idea “${idea.title}” (${parsed.data.status.replace('_', ' ')})`,
    href: `/admin/ideas?tab=ideas&open=${idea.id}`,
  });
  refresh();
  return ok({ id: idea.id });
}

export async function changeFeedbackStatus(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await authorize('edit', 'ideas');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const feedback = await (
    await submissionsRepository('session')
  ).updateFeedback(parsed.data.id, {
    status: parsed.data.status,
  });
  if (!feedback) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'ideas',
    target: `feedback on ${feedback.eventTitle} (${parsed.data.status.replace('_', ' ')})`,
    href: `/admin/ideas?tab=feedback&open=${feedback.id}`,
  });
  refresh();
  return ok({ id: feedback.id });
}

const ownerSchema = z.object({ kind: z.enum(['idea', 'feedback']), id, ownerId: id.nullable() });

/** "No owner" or a board person who takes it. */
export async function assignOwner(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await authorize('edit', 'ideas');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = ownerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const { kind, ownerId } = parsed.data;
  const owner = ownerId ? ((await listIdeaOwners()).find((person) => person.id === ownerId) ?? null) : null;
  if (ownerId && !owner) return { ok: false, error: 'not_found' };
  const repo = await submissionsRepository('session');
  const patch = { owner };
  const updated =
    kind === 'idea'
      ? await repo.updateIdea(parsed.data.id, patch)
      : await repo.updateFeedback(parsed.data.id, patch);
  if (!updated) return { ok: false, error: 'not_found' };
  await recordActivity(session, {
    action: 'updated',
    area: 'ideas',
    target: `${kind === 'idea' ? 'an idea' : 'a piece of feedback'}: ${owner ? `owner ${owner.name}` : 'no owner'}`,
    href: `/admin/ideas?tab=${tabOf[kind]}&open=${updated.id}`,
  });
  refresh();
  return ok({ id: updated.id });
}

/** "Accept and create event draft": the idea is accepted and a hidden draft event is made from it. */
export async function acceptIdea(input: unknown): Promise<ActionResult<{ eventId: string }>> {
  const session = await authorize('edit', 'ideas');
  const mayCreate = await authorize('create', 'events');
  if (!session || !mayCreate) return { ok: false, error: 'forbidden' };
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const repo = await submissionsRepository('session');
  const idea = await repo.getIdea(parsed.data.id);
  if (!idea) return { ok: false, error: 'not_found' };

  let eventId = idea.eventDraftId;
  if (!eventId) {
    const draft = await createEventDraft(
      { title: idea.title, description: idea.description },
      { userId: session.userId, name: session.name },
    );
    if (!draft) return { ok: false, error: 'unexpected' };
    eventId = draft.id;
    await repo.linkEventDraft(idea.id, eventId);
  }
  await repo.updateIdea(idea.id, {
    status: 'accepted',
    ...(idea.ownerId ? {} : { owner: { id: session.userId, name: session.name } }),
  });
  await recordActivity(session, {
    action: 'created',
    area: 'ideas',
    target: `event draft from the idea “${idea.title}”`,
    href: `/admin/events/${eventId}`,
  });
  refresh();
  return ok({ eventId });
}

// ─── Form settings ───

const text = (max: number) =>
  z.object({
    mk: z.string().trim().min(1, 'required').max(max, 'tooLong'),
    en: z
      .string()
      .trim()
      .max(max, 'tooLong')
      .optional()
      .transform((value) => value || undefined),
  });

const formSchema = z.object({
  intro: z.object({ idea: text(300), impression: text(300) }),
  types: z
    .array(z.object({ id: z.string().regex(/^[\w-]{0,64}$/), name: text(60) }))
    .min(1, 'noTypes')
    .max(12, 'tooManyTypes'),
});

/**
 * Form settings › Save: the two intro texts and the idea types (new ones get an id here). A type
 * that ideas use cannot be removed: the answer names it.
 */
export async function saveIdeaForm(input: unknown): Promise<ActionResult<{ saved: true }>> {
  const session = await authorize('edit', 'ideas');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = formSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const forms = await ideaFormRepository('session');
  const repo = await submissionsRepository('session');
  const current = await forms.get();
  const kept = new Set(parsed.data.types.map((type) => type.id).filter(Boolean));
  for (const type of current.types.filter((candidate) => !kept.has(candidate.id)))
    if ((await repo.countIdeasOfType(type.id)) > 0)
      return { ok: false, error: 'conflict', message: type.name.en || type.name.mk };

  await forms.save({
    intro: parsed.data.intro,
    types: parsed.data.types.map((type) => ({
      id: type.id || `itype-${crypto.randomUUID().slice(0, 8)}`,
      name: type.name,
    })),
  });
  await recordActivity(session, {
    action: 'updated',
    area: 'ideas',
    target: 'the /submit form settings',
    href: '/admin/ideas',
  });
  refresh();
  return ok({ saved: true });
}
