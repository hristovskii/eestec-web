'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { listEventOptions } from '@/features/events/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { applicationTags } from '../../cache-tags';
import { applicationsRepository } from '../../data';
import { normalizeForm } from '../../domain/form-definition';
import { applicationFormSchema } from '../../schemas/application-form.schema';
import type { ApplicationForm } from '../../types';

// Admin › Applications › Application form (form builder). The form is live as soon as it is
// saved: the event page reads it. Event managers only for their events (D18).

const id = z.string().regex(/^[\w-]{1,64}$/);

async function changed(eventId: string, what: string) {
  const session = await authorize('edit', 'applications', { eventId });
  if (!session) return null;
  const title = (await listEventOptions()).find((event) => event.id === eventId)?.title;
  if (title === undefined) return null;
  return { session, title, what };
}

function afterChange(context: NonNullable<Awaited<ReturnType<typeof changed>>>, eventId: string) {
  return recordActivity(context.session, {
    action: 'updated',
    area: 'applications',
    target: `${context.what} · ${context.title}`,
    href: `/admin/applications/${eventId}/form`,
  }).then(() => {
    updateTag(applicationTags.event(eventId));
    updateTag(applicationTags.all);
    refresh();
  });
}

/** Saves the questions of an event's application form. Field errors are `fields.<n>.<path>` keys. */
export async function saveApplicationForm(input: unknown): Promise<ActionResult<ApplicationForm>> {
  const request = z.object({ eventId: id, form: z.unknown() }).safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' };
  const { eventId } = request.data;
  const context = await changed(eventId, 'application form');
  if (!context) return { ok: false, error: 'forbidden' };
  const parsed = applicationFormSchema.safeParse(request.data.form);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const form = normalizeForm(parsed.data);
  const saved = await (await applicationsRepository()).saveForm({ eventId, ...form });
  await afterChange(context, eventId);
  return ok(saved);
}

/** Back to the default questions of spec 03. */
export async function resetApplicationForm(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ eventId: id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const context = await changed(parsed.data.eventId, 'application form reset to the default questions');
  if (!context) return { ok: false, error: 'forbidden' };
  await (await applicationsRepository()).deleteForm(parsed.data.eventId);
  await afterChange(context, parsed.data.eventId);
  return ok(undefined);
}
