'use server';

import { refresh } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { notesRepository } from '../data';
import { noteSchema } from '../schemas/note.schema';
import type { InternalNote, NoteEntity } from '../types';

// "Add" under Internal notes (NotesPanelView). Permission: the Inbox area for its items and the
// Ideas area for ideas and feedback (super admins and editors, D18).

const AREA = {
  contact_message: 'inbox',
  partner_inquiry: 'inbox',
  membership_application: 'inbox',
  idea: 'ideas',
  feedback: 'ideas',
} as const satisfies Record<NoteEntity, 'inbox' | 'ideas'>;

const HREF = {
  contact_message: (id: string) => `/admin/inbox?tab=contact&open=${id}`,
  partner_inquiry: (id: string) => `/admin/inbox?tab=partners&open=${id}`,
  membership_application: (id: string) => `/admin/inbox?tab=membership&open=${id}`,
  idea: (id: string) => `/admin/ideas?tab=ideas&open=${id}`,
  feedback: (id: string) => `/admin/ideas?tab=feedback&open=${id}`,
} as const satisfies Record<NoteEntity, (id: string) => string>;

const WHAT = {
  contact_message: 'a contact message',
  partner_inquiry: 'a partner inquiry',
  membership_application: 'a membership application',
  idea: 'an idea',
  feedback: 'a piece of feedback',
} as const satisfies Record<NoteEntity, string>;

/** Adds a note under the signed-in admin's name. Field errors are `admin.inbox.notes.errors` keys. */
export async function addNote(input: unknown): Promise<ActionResult<InternalNote>> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    // Nobody is told more than "no" before they are known to be allowed (the area depends on the kind).
    if (!(await authorize('edit', 'inbox')) && !(await authorize('edit', 'ideas')))
      return { ok: false, error: 'forbidden' };
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { entityType, entityId, body } = parsed.data;
  const area = AREA[entityType];
  const session = await authorize('edit', area);
  if (!session) return { ok: false, error: 'forbidden' };
  const note = await (
    await notesRepository()
  ).add(
    {
      entityType,
      entityId,
      body,
      authorId: session.userId,
      authorName: session.name,
      authorInitials: session.initials,
    },
    now(),
  );
  await recordActivity(session, {
    action: 'created',
    area,
    target: `a note on ${WHAT[entityType]}`,
    href: HREF[entityType](entityId),
  });
  refresh();
  return ok(note);
}
