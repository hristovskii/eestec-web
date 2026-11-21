import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import type { ApplicationInput } from '../types';
import { createSupabaseApplicationsRepository } from './applications.supabase';

/**
 * The applications contract (applications.repository.contract.ts) assumes any event id works and that an
 * e-mail alone identifies an applicant, as the mock does. Against a database every event must exist and a member
 * is a signed-in account, so these scenarios cover the same behaviours with real events, roles and clients.
 */
const NOW = new Date('2026-10-04T18:18:00+02:00');
const unique = () => crypto.randomUUID().slice(0, 8);

let editor: Awaited<ReturnType<typeof createTestUser>>;
let member: Awaited<ReturnType<typeof createTestUser>>;
let stranger: Awaited<ReturnType<typeof createTestUser>>;
const createdEvents: string[] = [];

beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
  member = await createTestUser({ member: 'active' });
  stranger = await createTestUser({ member: 'active' });
});
afterAll(async () => {
  const service = serviceClient();
  for (const id of createdEvents) await service.from('events').delete().eq('id', id);
  await editor.cleanup();
  await member.cleanup();
  await stranger.cleanup();
});

const board = () => createSupabaseApplicationsRepository(editor.client());
const service = () => createSupabaseApplicationsRepository(serviceClient());
const visitor = () => createSupabaseApplicationsRepository(anonClient());

/** A published event that takes applications (a real row; its slug gives the reference prefix CON). */
async function makeEvent(
  options: {
    max?: number | null;
    waitlist?: boolean;
    admission?: 'selection' | 'first_come';
    enabled?: boolean;
    status?: 'published' | 'hidden';
  } = {},
) {
  const db = serviceClient();
  const type = (await db.from('event_types').select('id').limit(1).single()).data!;
  const day = 24 * 3600 * 1000;
  const start = new Date(Date.now() + 30 * day);
  const { data, error } = await db
    .from('events')
    .insert({
      slug: `con-${unique()}`,
      title: { mk: 'Contract event' },
      short_description: { mk: 'Short' },
      scope: 'local',
      type_id: type.id,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + day).toISOString(),
      location: { mk: 'Skopje' },
      city: { mk: '' },
      country: { mk: '' },
      description: { mk: '' },
      requirements: { mk: '' },
      seo_title: { mk: '' },
      seo_description: { mk: '' },
      status: options.status ?? 'published',
      applications_enabled: options.enabled ?? true,
      apply_via: 'form',
      deadline: new Date(start.getTime() - day).toISOString(),
      max_participants: options.max === undefined ? 24 : options.max,
      waitlist: options.waitlist ?? true,
      admission: options.admission ?? 'selection',
    })
    .select('id')
    .single();
  if (error) throw error;
  createdEvents.push(data.id);
  return data.id;
}

const input = (eventId: string, patch: Partial<ApplicationInput> = {}): ApplicationInput => ({
  eventId,
  name: 'Ana Trajkovska',
  email: `ana-${unique()}@example.com`,
  answers: { faculty: 'FEEIT' },
  locale: 'en',
  // The database reads these from the event; the repository ignores the copies.
  referencePrefix: 'CON',
  eventStartsAt: new Date().toISOString(),
  maxParticipants: 24,
  waitlist: true,
  admission: 'selection',
  ...patch,
});

const created = (result: Awaited<ReturnType<ReturnType<typeof service>['submit']>>) => {
  if (result.status !== 'created') throw new Error(`not created: ${result.status}`);
  return result.application;
};

describe('ApplicationsRepository (supabase)', () => {
  it('saves an application as pending with a reference, and refuses the same e-mail twice', async () => {
    const eventId = await makeEvent();
    const first = input(eventId);
    const application = created(await service().submit(first, NOW));
    expect(application).toMatchObject({
      status: 'pending',
      waitlistPosition: null,
      answers: { faculty: 'FEEIT' },
    });
    expect(application.reference).toMatch(/^CON-\d{4}-\d{4,}$/);
    expect(await service().submit({ ...first, email: ` ${first.email.toUpperCase()} ` }, NOW)).toEqual({
      status: 'duplicate',
    });
  });

  it('answers closed when the event no longer takes applications, or does not exist', async () => {
    const off = await makeEvent({ enabled: false });
    expect(await service().submit(input(off), NOW)).toEqual({ status: 'closed' });
    expect(await service().submit(input('ev-not-a-uuid'), NOW)).toEqual({ status: 'closed' });
  });

  it('keeps the submit RPC away from visitors and from signed-in sessions', async () => {
    const eventId = await makeEvent();
    await expect(visitor().submit(input(eventId), NOW)).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(
      createSupabaseApplicationsRepository(member.client()).submit(input(eventId), NOW),
    ).rejects.toMatchObject({
      kind: 'forbidden',
    });
  });

  it('puts applications on the waitlist once the places are taken, or refuses them without one', async () => {
    const eventId = await makeEvent({ max: 1, admission: 'first_come' });
    const a = created(await service().submit(input(eventId), NOW));
    const b = created(await service().submit(input(eventId), NOW));
    const c = created(await service().submit(input(eventId), NOW));
    expect([a.status, b.status, c.status]).toEqual(['accepted', 'waitlist', 'waitlist']);
    expect([b.waitlistPosition, c.waitlistPosition]).toEqual([1, 2]);
    expect(await visitor().availability([eventId])).toEqual({ [eventId]: { taken: 1, waitlist: 2 } });
    const full = await makeEvent({ max: 1, waitlist: false, admission: 'first_come' });
    created(await service().submit(input(full), NOW));
    expect(await service().submit(input(full), NOW)).toEqual({ status: 'full' });
    expect(await visitor().availability(['ev-unknown', crypto.randomUUID()])).toEqual({});
  });

  it('lists one event with tab counts, search and sorting, and counts new applications until opened', async () => {
    const eventId = await makeEvent();
    const ana = created(await service().submit(input(eventId, { name: 'Ana Trajkovska' }), NOW));
    created(await service().submit(input(eventId, { name: 'Bojan Petrov' }), NOW));
    const all = await board().list({ eventId, sort: 'name', page: 1, pageSize: 10 });
    expect(all.items.map((row) => row.name)).toEqual(['Ana Trajkovska', 'Bojan Petrov']);
    expect(all.counts).toMatchObject({ all: 2, pending: 2, accepted: 0 });
    const found = await board().list({ eventId, q: 'bojan', sort: 'newest', page: 1, pageSize: 10 });
    expect(found.items.map((row) => row.name)).toEqual(['Bojan Petrov']);
    expect(found.counts.all).toBe(1);
    expect(
      (await board().list({ eventId, q: ana.reference.toLowerCase(), sort: 'newest', page: 1, pageSize: 10 }))
        .total,
    ).toBe(1);
    expect((await board().summaries([eventId]))[eventId]).toMatchObject({
      total: 2,
      newCount: 2,
      byStatus: { pending: 2 },
    });
    await board().markRead(ana.id, NOW);
    await board().markRead(ana.id, new Date(NOW.getTime() + 1000));
    expect((await board().summaries([eventId]))[eventId]?.newCount).toBe(1);
    // The first time it was opened is kept.
    expect(Date.parse((await board().get(ana.id))!.readAt!)).toBe(NOW.getTime());
  });

  it('moves applications between statuses and keeps the waitlist in order', async () => {
    const eventId = await makeEvent();
    const ids: string[] = [];
    for (const name of ['A', 'B', 'C'])
      ids.push(created(await service().submit(input(eventId, { name }), NOW)).id);
    expect(new Set(await board().setStatus(eventId, ids, 'waitlist'))).toEqual(new Set(ids));
    const position = async (id: string) => (await board().get(id))?.waitlistPosition;
    expect([await position(ids[0]!), await position(ids[1]!), await position(ids[2]!)]).toEqual([1, 2, 3]);
    await board().setStatus(eventId, [ids[0]!], 'accepted');
    expect([await position(ids[0]!), await position(ids[1]!), await position(ids[2]!)]).toEqual([null, 1, 2]);
    expect(await board().setStatus(eventId, [ids[0]!, 'unknown'], 'accepted')).toEqual([]);
    expect(await visitor().availability([eventId])).toEqual({ [eventId]: { taken: 1, waitlist: 2 } });
  });

  it('keeps applications private: visitors and other members see none, a member sees their own', async () => {
    const eventId = await makeEvent();
    created(await service().submit(input(eventId, { email: member.email }), NOW));
    created(await service().submit(input(eventId), NOW));
    await expect(visitor().list({ eventId, sort: 'newest', page: 1, pageSize: 10 })).rejects.toMatchObject({
      kind: 'forbidden',
    });
    expect(
      (
        await createSupabaseApplicationsRepository(stranger.client()).list({
          eventId,
          sort: 'newest',
          page: 1,
          pageSize: 10,
        })
      ).total,
    ).toBe(0);
    const mine = createSupabaseApplicationsRepository(member.client());
    expect((await mine.listByEmail(member.email)).map((row) => row.eventId)).toContain(eventId);
    expect(await mine.listByEmail(`nobody-${unique()}@example.com`)).toEqual([]);
    // A board member's session sees every application, so the e-mail is what narrows the list.
    expect(await board().listByEmail(`nobody-${unique()}@example.com`)).toEqual([]);
  });

  it('lets the applicant withdraw, closes the waitlist gap, and refuses anyone else', async () => {
    const eventId = await makeEvent({ max: 1, admission: 'first_come' });
    created(await service().submit(input(eventId), NOW));
    const a = created(await service().submit(input(eventId, { email: member.email }), NOW));
    const b = created(await service().submit(input(eventId), NOW));
    const c = created(await service().submit(input(eventId), NOW));
    expect([a.waitlistPosition, b.waitlistPosition, c.waitlistPosition]).toEqual([1, 2, 3]);
    const theirs = createSupabaseApplicationsRepository(stranger.client());
    expect(await theirs.withdraw(a.id, member.email)).toBe('not_found');
    expect(await board().get(a.id)).not.toBeNull();
    const mine = createSupabaseApplicationsRepository(member.client());
    expect(await mine.withdraw(a.id, member.email)).toBe('withdrawn');
    expect(await board().get(a.id)).toBeNull();
    expect((await board().get(b.id))?.waitlistPosition).toBe(1);
    expect((await board().get(c.id))?.waitlistPosition).toBe(2);
    expect(await mine.withdraw(a.id, member.email)).toBe('not_found');
  });

  it('deletes every application of an e-mail (account deletion)', async () => {
    const mine = input(await makeEvent());
    created(await service().submit(mine, NOW));
    created(await service().submit({ ...mine, eventId: await makeEvent() }, NOW));
    const other = input(mine.eventId);
    created(await service().submit(other, NOW));
    expect(await service().deleteByEmail(mine.email)).toBe(2);
    expect(await service().listByEmail(mine.email)).toEqual([]);
    expect(await service().listByEmail(other.email)).toHaveLength(1);
    expect(await service().deleteByEmail(mine.email)).toBe(0);
  });

  it('stores uploads privately and links them to the application', async () => {
    const eventId = await makeEvent();
    const file = await service().storeFile(
      { name: 'cv.pdf', type: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7') },
      NOW,
    );
    expect(file).toMatchObject({ fileName: 'cv.pdf', size: 8 });
    expect(await service().getFile(file.fileId)).toBeNull(); // not sent with an application yet
    const sent = created(await service().submit(input(eventId, { answers: { cv: file } }), NOW));
    expect(new TextDecoder().decode((await service().getFile(file.fileId))?.bytes)).toBe('%PDF-1.7');
    expect((await board().findByFile(file.fileId))?.id).toBe(sent.id);
    expect(await service().getFile('unknown')).toBeNull();
    // Nobody but the service role can read the bucket.
    const direct = await anonClient().storage.from('application-files').download(file.fileId);
    expect(direct.error).not.toBeNull();
    await expect(visitor().findByFile(file.fileId)).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('saves, replaces and resets an event form, and counts answers per question', async () => {
    const eventId = await makeEvent();
    expect(await board().getForm(eventId)).toBeNull();
    const field = {
      key: 'diet-note',
      type: 'text' as const,
      label: { mk: 'Бележка', en: 'Note' },
      required: false,
      help: { mk: '' },
      placeholder: { mk: '' },
    };
    await board().saveForm({ eventId, intro: { mk: 'Кратко.' }, fields: [field] });
    expect((await board().getForm(eventId))?.fields.map((item) => item.key)).toEqual(['diet-note']);
    expect((await visitor().getForm(eventId))?.fields).toHaveLength(1);
    await board().saveForm({ eventId, intro: { mk: 'Кратко.' }, fields: [] });
    expect((await board().getForm(eventId))?.fields).toEqual([]);
    created(
      await service().submit(input(eventId, { answers: { 'diet-note': 'No nuts', faculty: 'FEEIT' } }), NOW),
    );
    created(await service().submit(input(eventId, { answers: { faculty: 'FINKI' } }), NOW));
    expect(await board().answerCounts(eventId)).toEqual({ 'diet-note': 1, faculty: 2 });
    await board().deleteForm(eventId);
    expect(await board().getForm(eventId)).toBeNull();
  });

  it('gives a visitor the form of a hidden event, and no form for an unknown one', async () => {
    const hidden = await makeEvent({ status: 'hidden' });
    await board().saveForm({ eventId: hidden, intro: { mk: 'Скриен.' }, fields: [] });
    expect((await visitor().getForm(hidden))?.intro).toEqual({ mk: 'Скриен.' });
    expect(await visitor().getForm(crypto.randomUUID())).toBeNull();
    expect(await visitor().getForm('ev-unknown')).toBeNull();
  });
});
