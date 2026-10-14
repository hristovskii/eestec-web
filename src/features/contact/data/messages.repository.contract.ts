import { describe, expect, it } from 'vitest';

import type { ContactMessageInput } from '../types';
import type { MessagesRepository } from './messages.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test puts the data back or
// adds a message of its own (messages are never deleted).

const input: ContactMessageInput = {
  name: 'Marija Stojanovska',
  email: 'marija@example.org',
  subjectId: 'subject-membership',
  subject: 'Membership',
  routedTo: 'members@eestec.mk',
  message: 'How do I join?',
  locale: 'en',
};
const NOW = new Date('2026-10-04T17:12:00.000Z');

export function describeMessagesRepository(
  name: string,
  createRepo: () => MessagesRepository | Promise<MessagesRepository>,
) {
  describe(`MessagesRepository (${name})`, () => {
    it('stores a message as new and unread, with consent recorded and a reference', async () => {
      const repo = await createRepo();
      const stored = await repo.submit(input, NOW);
      expect(stored).toMatchObject({ ...input, status: 'new', readAt: null, consentAt: NOW.toISOString() });
      expect(stored.reference).toMatch(/^MSG-2026-\d{4}$/);
      expect(await repo.get(stored.id)).toEqual(stored);
    });

    it('gives every message of the year its own, rising reference', async () => {
      const repo = await createRepo();
      const first = await repo.submit(input, NOW);
      const second = await repo.submit(input, NOW);
      expect(Number(second.reference.slice(-4))).toBe(Number(first.reference.slice(-4)) + 1);
    });

    it('lists newest first and filters by status', async () => {
      const repo = await createRepo();
      const all = await repo.list();
      expect(all.length).toBeGreaterThan(0);
      expect(all.map((message) => message.createdAt)).toEqual(
        [...all.map((message) => message.createdAt)].sort().reverse(),
      );
      const answered = await repo.list({ status: 'answered' });
      expect(answered.every((message) => message.status === 'answered')).toBe(true);
    });

    it('changes the status and the read mark of one message', async () => {
      const repo = await createRepo();
      const stored = await repo.submit(input, NOW);
      expect((await repo.updateStatus(stored.id, 'answered'))?.status).toBe('answered');
      expect((await repo.setRead(stored.id, NOW))?.readAt).toBe(NOW.toISOString());
      expect((await repo.setRead(stored.id, null))?.readAt).toBeNull();
      expect(await repo.updateStatus('no-such-id', 'archived')).toBeNull();
      expect(await repo.setRead('no-such-id', NOW)).toBeNull();
      expect(await repo.get('no-such-id')).toBeNull();
    });

    it('marks every unread message read and says how many', async () => {
      const repo = await createRepo();
      await repo.submit(input, NOW);
      const unread = (await repo.list()).filter((message) => message.readAt === null).length;
      expect(unread).toBeGreaterThan(0);
      expect(await repo.markAllRead(NOW)).toBe(unread);
      expect((await repo.list()).every((message) => message.readAt !== null)).toBe(true);
      expect(await repo.markAllRead(NOW)).toBe(0);
    });
  });
}
