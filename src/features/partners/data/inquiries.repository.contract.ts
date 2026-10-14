import { describe, expect, it } from 'vitest';

import type { PartnerInquiryInput } from '../types';
import type { InquiriesRepository } from './inquiries.repository';

// Runs against every implementation (mock now, Supabase in M20).

const input: PartnerInquiryInput = {
  company: 'Contract Test Ltd',
  contactPerson: 'Test Person',
  email: 'contract.test@example.org',
  phone: '',
  interests: ['workshop', 'other'],
  message: 'A message that is long enough for the contract test.',
  locale: 'en',
};

export function describeInquiriesRepository(
  name: string,
  createRepo: () => InquiriesRepository | Promise<InquiriesRepository>,
) {
  describe(`InquiriesRepository (${name})`, () => {
    it('has sample inquiries to start with, newest first', async () => {
      const list = await (await createRepo()).list();
      expect(list.length).toBeGreaterThan(0);
      expect(list.map((inquiry) => inquiry.createdAt)).toEqual(
        [...list.map((inquiry) => inquiry.createdAt)].sort().reverse(),
      );
    });

    it('stores an inquiry as new, with consent recorded and the next reference of the year', async () => {
      const repo = await createRepo();
      const before = await repo.list();
      const now = new Date('2026-10-14T09:00:00+02:00');
      const first = await repo.submit(input, now);
      const second = await repo.submit(input, now);
      expect(first).toMatchObject({
        status: 'new',
        company: 'Contract Test Ltd',
        consentAt: now.toISOString(),
      });
      expect(first.reference).toMatch(/^PRT-2026-\d{4}$/);
      expect(Number(second.reference.slice(-4))).toBe(Number(first.reference.slice(-4)) + 1);
      expect(await repo.list()).toHaveLength(before.length + 2);
      // The same company may write again: there is no "already applied" rule here.
      expect(second.id).not.toBe(first.id);
    });

    it('lists one status and changes a status', async () => {
      const repo = await createRepo();
      const now = new Date('2026-10-14T09:00:00+02:00');
      const created = await repo.submit(input, now);
      const updated = await repo.updateStatus(created.id, 'done');
      expect(updated?.status).toBe('done');
      expect((await repo.list({ status: 'done' })).some((inquiry) => inquiry.id === created.id)).toBe(true);
      expect((await repo.list({ status: 'new' })).some((inquiry) => inquiry.id === created.id)).toBe(false);
      expect(await repo.updateStatus('does-not-exist', 'done')).toBeNull();
    });

    it('stores an inquiry unread, finds it by id, and marks it read or unread', async () => {
      const repo = await createRepo();
      const now = new Date('2026-10-14T09:00:00+02:00');
      const created = await repo.submit(input, now);
      expect(created.readAt).toBeNull();
      expect(await repo.get(created.id)).toEqual(created);
      expect((await repo.setRead(created.id, now))?.readAt).toBe(now.toISOString());
      expect((await repo.setRead(created.id, null))?.readAt).toBeNull();
      expect(await repo.get('does-not-exist')).toBeNull();
      expect(await repo.setRead('does-not-exist', now)).toBeNull();
    });

    it('marks every unread inquiry read and says how many', async () => {
      const repo = await createRepo();
      const now = new Date('2026-10-14T09:00:00+02:00');
      await repo.submit(input, now);
      const unread = (await repo.list()).filter((inquiry) => inquiry.readAt === null).length;
      expect(unread).toBeGreaterThan(0);
      expect(await repo.markAllRead(now)).toBe(unread);
      expect(await repo.markAllRead(now)).toBe(0);
    });
  });
}
