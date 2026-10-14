import { describe, expect, it } from 'vitest';

import type { MembershipInput } from '../types';
import type { MembershipRepository } from './membership.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test uses e-mail addresses
// of its own.

const NOW = new Date('2026-10-04T18:18:00+02:00');
const unique = () => crypto.randomUUID().slice(0, 8);

const input = (patch: Partial<MembershipInput> = {}): MembershipInput => ({
  name: 'Test Person',
  email: `test.${unique()}@example.org`,
  phone: '',
  faculty: 'FEEIT',
  studyProgram: 'Testing',
  yearOfStudy: '2',
  interests: ['IT'],
  heardFrom: 'Instagram',
  locale: 'en',
  ...patch,
});

export function describeMembershipRepository(
  name: string,
  createRepo: () => MembershipRepository | Promise<MembershipRepository>,
) {
  describe(`MembershipRepository (${name})`, () => {
    it('stores an application as new, with the moment of consent', async () => {
      const repo = await createRepo();
      const result = await repo.submit(input({ name: 'Marija Test' }), NOW);
      expect(result.status).toBe('created');
      if (result.status !== 'created') return;
      expect(result.application).toMatchObject({
        name: 'Marija Test',
        status: 'new',
        consentAt: NOW.toISOString(),
        createdAt: NOW.toISOString(),
      });
      expect((await repo.list()).some((application) => application.id === result.application.id)).toBe(true);
    });

    it('refuses the same e-mail twice (any letter case), until the first one is rejected', async () => {
      const repo = await createRepo();
      const email = `Twice.${unique()}@Example.org`;
      const first = await repo.submit(input({ email }), NOW);
      expect(first.status).toBe('created');
      expect((await repo.submit(input({ email: email.toLowerCase() }), NOW)).status).toBe('duplicate');
      if (first.status !== 'created') return;
      await repo.updateStatus(first.application.id, 'rejected');
      expect((await repo.submit(input({ email }), NOW)).status).toBe('created');
    });

    it('lists newest first and filters by status', async () => {
      const repo = await createRepo();
      const older = await repo.submit(input(), new Date('2026-10-01T10:00:00+02:00'));
      const newer = await repo.submit(input(), new Date('2026-10-02T10:00:00+02:00'));
      if (older.status !== 'created' || newer.status !== 'created') throw new Error('not created');
      await repo.updateStatus(newer.application.id, 'contacted');
      const all = (await repo.list()).map((application) => application.id);
      expect(all.indexOf(newer.application.id)).toBeLessThan(all.indexOf(older.application.id));
      const contacted = await repo.list({ status: 'contacted' });
      expect(contacted.every((application) => application.status === 'contacted')).toBe(true);
      expect(contacted.map((application) => application.id)).toContain(newer.application.id);
    });

    it('changes the status, and says when there is no such application', async () => {
      const repo = await createRepo();
      const created = await repo.submit(input(), NOW);
      if (created.status !== 'created') throw new Error('not created');
      expect((await repo.updateStatus(created.application.id, 'accepted'))?.status).toBe('accepted');
      expect(await repo.updateStatus('ma-does-not-exist', 'accepted')).toBeNull();
    });
  });
}
