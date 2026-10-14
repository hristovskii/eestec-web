'use server';

import { refresh } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { notesRepository } from '../data';
import { noteSchema } from '../schemas/note.schema';
import type { InternalNote, NoteEntity } from '../types';

// "Add" under Internal notes (NotesPanelView). Permission: the Inbox area (super admins and editors, D18).

const TAB = {
  contact_message: 'contact',
  partner_inquiry: 'partners',
  membership_application: 'membership',
} as const satisfies Record<NoteEntity, string>;

const WHAT = {
  contact_message: 'a contact message',
  partner_inquiry: 'a partner inquiry',
  membership_application: 'a membership application',
} as const satisfies Record<NoteEntity, string>;

/** Adds a note under the signed-in admin's name. Field errors are `admin.inbox.notes.errors` keys. */
export async function addNote(input: unknown): Promise<ActionResult<InternalNote>> {
  const session = await authorize('edit', 'inbox');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const { entityType, entityId, body } = parsed.data;
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
    area: 'inbox',
    target: `a note on ${WHAT[entityType]}`,
    href: `/admin/inbox?tab=${TAB[entityType]}&open=${entityId}`,
  });
  refresh();
  return ok(note);
}
