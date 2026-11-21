import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import type { Localized } from '@/shared/types/localized';
import type { ContactMessageInput } from '../types';
import { createSupabaseMessagesRepository } from './messages.supabase';
import { describeMessagesRepository } from './messages.repository.contract';
import type { MessagesRepository } from './messages.repository';

let editor: Awaited<ReturnType<typeof createTestUser>>;
let manager: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
  manager = await createTestUser({ role: 'event_manager' });
});
afterAll(async () => {
  await editor.cleanup();
  await manager.cleanup();
});

/** As in the app: the form stores with the service scope, the board reads and changes with its own session. */
const asApp = (): MessagesRepository => ({
  ...createSupabaseMessagesRepository(editor.client()),
  submit: (input, now) => createSupabaseMessagesRepository(serviceClient()).submit(input, now),
});

/** A subject the board offers: the database takes its wording and route from it. */
async function subjectInput(patch: Partial<ContactMessageInput> = {}): Promise<ContactMessageInput> {
  const db = serviceClient();
  const subject = (await db.from('contact_subjects').select('id, name').order('sort_order').limit(1).single())
    .data!;
  const route = (
    await db.from('contact_subject_routes').select('route_email').eq('subject_id', subject.id).single()
  ).data!;
  const name = subject.name as Localized;
  return {
    name: 'Marija Stojanovska',
    email: 'marija@example.org',
    subjectId: subject.id,
    subject: name.en ?? name.mk,
    routedTo: route.route_email,
    message: 'How do I join?',
    locale: 'en',
    ...patch,
  };
}

describeMessagesRepository('supabase', asApp, () => subjectInput());

describe('MessagesRepository (supabase, who may do what)', () => {
  it('takes the subject wording and route from the subject, in the language of the page', async () => {
    const input = await subjectInput({ locale: 'mk', subject: 'ignored', routedTo: 'ignored@example.org' });
    const stored = await asApp().submit(input, new Date('2026-10-04T17:12:00.000Z'));
    const subject = (
      await serviceClient().from('contact_subjects').select('name').eq('id', input.subjectId).single()
    ).data!.name as Localized;
    expect(stored.subject).toBe(subject.mk);
    expect(stored.routedTo).not.toBe('ignored@example.org');
  });

  it('numbers references by the year of the moment given, not of the database clock', async () => {
    const stored = await asApp().submit(await subjectInput(), new Date('2027-01-02T12:00:00.000Z'));
    expect(stored.reference).toMatch(/^MSG-2027-\d{4}$/);
  });

  it('refuses a subject that does not exist', async () => {
    const input = await subjectInput({ subjectId: crypto.randomUUID() });
    await expect(asApp().submit(input, new Date())).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('is not open to visitors: they cannot store or read messages', async () => {
    const visitor = createSupabaseMessagesRepository(anonClient());
    await expect(visitor.submit(await subjectInput(), new Date())).rejects.toMatchObject({
      kind: 'forbidden',
    });
    await expect(visitor.list()).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('shows an event manager nothing and lets them change nothing', async () => {
    const stored = await asApp().submit(await subjectInput(), new Date());
    const asManager = createSupabaseMessagesRepository(manager.client());
    expect(await asManager.list()).toEqual([]);
    expect(await asManager.get(stored.id)).toBeNull();
    await expect(asManager.updateStatus(stored.id, 'archived')).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(asManager.markAllRead(new Date())).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('keeps a message whose sender or subject is gone (both are null)', async () => {
    const stored = await asApp().submit(await subjectInput(), new Date());
    await serviceClient()
      .from('contact_messages')
      .update({ email: null, subject_id: null })
      .eq('id', stored.id);
    expect(await asApp().get(stored.id)).toMatchObject({ email: null, subjectId: null, name: stored.name });
  });
});
