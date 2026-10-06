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

    it('stores uploads privately', async () => {
      const repo = await createRepo();
      const file = await repo.storeFile(
        { name: 'cv.pdf', type: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7') },
        NOW,
      );
      expect(file).toMatchObject({ fileName: 'cv.pdf', size: 8 });
      expect(file.fileId).toBeTruthy();
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
