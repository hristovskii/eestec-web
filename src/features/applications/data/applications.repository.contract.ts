import { describe, expect, it } from 'vitest';

import type { ApplicationInput } from '../types';
import type { ApplicationsRepository } from './applications.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test uses its own event id.

const NOW = new Date('2026-10-04T18:18:00+02:00');
const unique = () => crypto.randomUUID().slice(0, 8);

const input = (patch: Partial<ApplicationInput> = {}): ApplicationInput => ({
  eventId: `ev-contract-${unique()}`,
  name: 'Ana Trajkovska',
  email: `ana-${unique()}@example.com`,
  answers: { faculty: 'FEEIT' },
  locale: 'en',
  referencePrefix: 'CON',
  eventStartsAt: '2026-11-07T10:00:00+01:00',
  maxParticipants: 24,
  waitlist: true,
  admission: 'selection',
  ...patch,
});

export function describeApplicationsRepository(
  name: string,
  createRepo: () => ApplicationsRepository | Promise<ApplicationsRepository>,
) {
  describe(`ApplicationsRepository (${name})`, () => {
    it('saves an application as pending with a running reference', async () => {
      const repo = await createRepo();
      const first = input();
      const a = await repo.submit(first, NOW);
      const b = await repo.submit(input({ eventId: first.eventId }), NOW);
      expect(a).toMatchObject({
        status: 'created',
        application: { status: 'pending', reference: 'CON-2026-0001', waitlistPosition: null },
      });
      expect(b).toMatchObject({ application: { reference: 'CON-2026-0002' } });
      if (a.status === 'created') {
        expect(a.application.answers).toEqual({ faculty: 'FEEIT' });
        expect(a.application.consentAt).toBe(NOW.toISOString());
      }
    });

    it('refuses a second application with the same e-mail', async () => {
      const repo = await createRepo();
      const first = input();
      await repo.submit(first, NOW);
      expect(await repo.submit({ ...first, email: first.email.toUpperCase() }, NOW)).toEqual({
        status: 'duplicate',
      });
    });

    it('puts applications on the waitlist once the places are taken, or refuses them without one', async () => {
      const repo = await createRepo();
      // No places at all: everyone joins the waitlist, in order.
      const event = input({ maxParticipants: 0 });
      const one = await repo.submit(event, NOW);
      const two = await repo.submit({ ...event, email: `b-${unique()}@example.com` }, NOW);
      expect(one).toMatchObject({ application: { status: 'waitlist', waitlistPosition: 1 } });
      expect(two).toMatchObject({ application: { status: 'waitlist', waitlistPosition: 2 } });
      expect(await repo.availability([event.eventId])).toEqual({
        [event.eventId]: { taken: 0, waitlist: 2 },
      });
      expect(await repo.submit(input({ maxParticipants: 0, waitlist: false }), NOW)).toEqual({
        status: 'full',
      });
    });

    it('counts accepted applications as taken places', async () => {
      const repo = await createRepo();
      // Sample data: FPGA Basics has 20 accepted and 7 on the waitlist.
      const places = await repo.availability(['ev-fpga-basics', 'ev-unknown']);
      expect(places['ev-fpga-basics']).toEqual({ taken: 20, waitlist: 7 });
      expect(places['ev-unknown']).toBeUndefined();
    });

    it('first come: accepts while places are free, then queues on the waitlist (D22)', async () => {
      const repo = await createRepo();
      const event = input({ admission: 'first_come', maxParticipants: 2 });
      const send = () => repo.submit({ ...event, email: `x-${unique()}@example.com` }, NOW);
      const statuses = [];
      for (let index = 0; index < 4; index++) {
        const result = await send();
        if (result.status === 'created') statuses.push(result.application.status);
      }
      expect(statuses).toEqual(['accepted', 'accepted', 'waitlist', 'waitlist']);
      // A place frees up: the next newcomer still queues behind the people waiting.
      const { items } = await repo.list({
        eventId: event.eventId,
        status: 'accepted',
        sort: 'oldest',
        page: 1,
        pageSize: 10,
      });
      await repo.setStatus(event.eventId, [items[0]!.id], 'rejected');
      expect(await send()).toMatchObject({ application: { status: 'waitlist', waitlistPosition: 3 } });
    });

    it('lists one event with tab counts, search and sorting', async () => {
      const repo = await createRepo();
      const event = input();
      await repo.submit({ ...event, name: 'Ana Trajkovska', email: `ana-${unique()}@example.com` }, NOW);
      await repo.submit({ ...event, name: 'Bojan Petrov', email: `bojan-${unique()}@example.com` }, NOW);
      const all = await repo.list({ eventId: event.eventId, sort: 'name', page: 1, pageSize: 10 });
      expect(all.items.map((row) => row.name)).toEqual(['Ana Trajkovska', 'Bojan Petrov']);
      expect(all.counts).toMatchObject({ all: 2, pending: 2, accepted: 0 });
      const found = await repo.list({
        eventId: event.eventId,
        q: 'bojan',
        sort: 'newest',
        page: 1,
        pageSize: 10,
      });
      expect(found.items.map((row) => row.name)).toEqual(['Bojan Petrov']);
      expect(found.counts.all).toBe(1);
      const byReference = await repo.list({
        eventId: event.eventId,
        q: 'con-2026-0001',
        sort: 'newest',
        page: 1,
        pageSize: 10,
      });
      expect(byReference.total).toBe(1);
    });

    it('moves applications between statuses and keeps the waitlist in order', async () => {
      const repo = await createRepo();
      const event = input();
      const ids: string[] = [];
      for (const name of ['A', 'B', 'C']) {
        const result = await repo.submit({ ...event, name, email: `${name}-${unique()}@example.com` }, NOW);
        if (result.status === 'created') ids.push(result.application.id);
      }
      expect(await repo.setStatus(event.eventId, ids, 'waitlist')).toEqual(ids);
      const position = async (id: string) => (await repo.get(id))?.waitlistPosition;
      expect([await position(ids[0]!), await position(ids[1]!), await position(ids[2]!)]).toEqual([1, 2, 3]);
      await repo.setStatus(event.eventId, [ids[0]!], 'accepted');
      expect([await position(ids[0]!), await position(ids[1]!), await position(ids[2]!)]).toEqual([
        null,
        1,
        2,
      ]);
      // Unchanged and foreign ids are ignored.
      expect(await repo.setStatus(event.eventId, [ids[0]!, 'unknown'], 'accepted')).toEqual([]);
      expect(await repo.availability([event.eventId])).toEqual({
        [event.eventId]: { taken: 1, waitlist: 2 },
      });
    });

    it('counts new applications until they are opened', async () => {
      const repo = await createRepo();
      const event = input();
      const result = await repo.submit(event, NOW);
      expect((await repo.summaries([event.eventId]))[event.eventId]).toMatchObject({
        total: 1,
        newCount: 1,
        byStatus: { pending: 1 },
      });
      if (result.status === 'created') await repo.markRead(result.application.id, NOW);
      expect((await repo.summaries([event.eventId]))[event.eventId]?.newCount).toBe(0);
    });

    it('stores uploads privately', async () => {
      const repo = await createRepo();
      const file = await repo.storeFile(
        { name: 'cv.pdf', type: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7') },
        NOW,
      );
      expect(file).toMatchObject({ fileName: 'cv.pdf', size: 8 });
      const stored = await repo.getFile(file.fileId);
      expect(new TextDecoder().decode(stored?.bytes)).toBe('%PDF-1.7');
      expect(await repo.getFile('unknown')).toBeNull();
      const sent = await repo.submit(input({ answers: { cv: file } }), NOW);
      expect((await repo.findByFile(file.fileId))?.id).toBe(
        sent.status === 'created' ? sent.application.id : '',
      );
    });

    it('returns the event form, or null for the default fields', async () => {
      const repo = await createRepo();
      expect((await repo.getForm('ev-ai-at-the-edge'))?.fields.map((field) => field.key)).toContain(
        'motivation',
      );
      expect(await repo.getForm('ev-unknown')).toBeNull();
    });
  });
}
