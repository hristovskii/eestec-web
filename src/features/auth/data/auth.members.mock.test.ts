import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetMockStore } from '@/shared/data/mock/store';

import { MOCK_PERSONA_COOKIE } from '../session-cookie';
import { createMockAuthRepository } from './auth.mock';
import { SAMPLE_PASSWORD } from './fixtures/personas';
import { listMockMail } from './mailbox';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
      set: (name: string, value: string) => void jar.set(name, value),
      delete: (name: string) => void jar.delete(name),
    }),
}));
const gate = vi.hoisted(() => ({ blocked: false }));
vi.mock('../availability', () => ({ mockSignInBlocked: () => gate.blocked }));

const now = new Date('2026-10-04T16:18:00Z');
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

const input = {
  name: 'Ivo Dimitrov',
  email: 'ivo.d@students.feit.ukim.edu.mk',
  password: 'lake-ohrid-2026',
  faculty: 'FEEIT',
  year: '3' as const,
  phone: '',
  visibility: 'members' as const,
  photo: null,
  locale: 'en' as const,
  now,
};

const tokenOf = (link: string | null | undefined) =>
  new URL(link ?? '', 'http://x').searchParams.get('token') ?? '';

describe('mock member accounts', () => {
  beforeEach(() => {
    jar.clear();
    resetMockStore();
    gate.blocked = false;
  });

  describe('sign-up', () => {
    it('stores the registration, sends one confirmation link and does not sign anyone in', async () => {
      const repo = createMockAuthRepository();
      const result = await repo.registerMember(input);
      expect(result.status).toBe('registered');
      const [mail] = listMockMail(input.email);
      expect(mail?.kind).toBe('confirm');
      expect(mail?.link).toMatch(/^\/auth\/confirm\?token=/);
      expect(await repo.getSession()).toBeNull();
      const stored = (await repo.listRegistrations()).find((item) => item.email === input.email);
      expect(stored).toMatchObject({
        status: 'awaiting_confirmation',
        visibility: 'members',
        faculty: 'FEEIT',
      });
    });

    it('refuses an e-mail that already has an account, but lets an unconfirmed one start again', async () => {
      const repo = createMockAuthRepository();
      await expect(
        repo.registerMember({ ...input, email: 'marija.s@students.feit.ukim.edu.mk' }),
      ).resolves.toEqual({
        status: 'email_taken',
      });
      await repo.registerMember(input);
      await expect(repo.registerMember({ ...input, name: 'Ivo D.' })).resolves.toMatchObject({
        status: 'registered',
      });
      expect(listMockMail(input.email).filter((mail) => mail.kind === 'confirm')).toHaveLength(2);
    });

    it('is switched off where the mock sign-in is (production)', async () => {
      gate.blocked = true;
      await expect(createMockAuthRepository().registerMember(input)).resolves.toEqual({
        status: 'unavailable',
      });
    });
  });

  describe('confirming the e-mail', () => {
    it('makes the account "pending approval" and signs the person in', async () => {
      const repo = createMockAuthRepository();
      await repo.registerMember(input);
      const token = tokenOf(listMockMail(input.email)[0]?.link);
      await expect(repo.confirmEmail({ token, now: later(60) })).resolves.toEqual({ status: 'confirmed' });
      const session = await repo.getSession();
      expect(session).toMatchObject({ name: 'Ivo Dimitrov', memberStatus: 'pending', adminRole: null });
      expect(session?.username).toBe('ivo-dimitrov');
      expect(session?.headline).toBe('FEEIT · 3rd year');
      // The link works once.
      await expect(repo.confirmEmail({ token, now: later(61) })).resolves.toEqual({ status: 'expired' });
    });

    it('is expired after 24 hours, and for the sample expired link', async () => {
      const repo = createMockAuthRepository();
      await repo.registerMember(input);
      const token = tokenOf(listMockMail(input.email)[0]?.link);
      await expect(repo.confirmEmail({ token, now: later(24 * 60 + 1) })).resolves.toEqual({
        status: 'expired',
      });
      await expect(repo.confirmEmail({ token: 'sample-expired-confirm', now })).resolves.toEqual({
        status: 'expired',
      });
      await expect(repo.confirmEmail({ token: 'nonsense', now })).resolves.toEqual({ status: 'expired' });
    });

    it('a new link replaces the old one', async () => {
      const repo = createMockAuthRepository();
      await repo.registerMember(input);
      const first = tokenOf(listMockMail(input.email)[0]?.link);
      await repo.resendConfirmation({ email: input.email, now: later(5) });
      const second = tokenOf(listMockMail(input.email)[0]?.link);
      expect(second).not.toBe(first);
      await expect(repo.confirmEmail({ token: first, now: later(6) })).resolves.toEqual({
        status: 'expired',
      });
      await expect(repo.confirmEmail({ token: second, now: later(6) })).resolves.toEqual({
        status: 'confirmed',
      });
    });
  });

  describe('member sign-in', () => {
    it('signs in a sample member and a pending member with the sample password', async () => {
      const repo = createMockAuthRepository();
      await expect(
        repo.signInMember({
          email: 'marija.s@students.feit.ukim.edu.mk',
          password: SAMPLE_PASSWORD,
          remember: true,
          now,
        }),
      ).resolves.toEqual({ status: 'signed_in', memberStatus: 'active' });
      await expect(
        repo.signInMember({
          email: 'elena.p@students.finki.ukim.mk',
          password: SAMPLE_PASSWORD,
          remember: false,
          now,
        }),
      ).resolves.toEqual({ status: 'signed_in', memberStatus: 'pending' });
      expect((await repo.getSession())?.name).toBe('Elena Petrovska');
    });

    it('says the same thing for a wrong password and an unknown e-mail', async () => {
      const repo = createMockAuthRepository();
      const wrong = await repo.signInMember({
        email: 'marija.s@students.feit.ukim.edu.mk',
        password: 'nope',
        remember: false,
        now,
      });
      const unknown = await repo.signInMember({
        email: 'nobody@example.com',
        password: 'nope',
        remember: false,
        now,
      });
      expect(wrong).toEqual({ status: 'invalid' });
      expect(unknown).toEqual(wrong);
      expect(await repo.getSession()).toBeNull();
    });

    it('pauses after 5 wrong tries for 15 minutes, even with the right password', async () => {
      const repo = createMockAuthRepository();
      const email = 'marija.s@students.feit.ukim.edu.mk';
      for (let i = 0; i < 4; i += 1)
        await expect(repo.signInMember({ email, password: 'nope', remember: false, now })).resolves.toEqual({
          status: 'invalid',
        });
      const locked = await repo.signInMember({ email, password: 'nope', remember: false, now });
      expect(locked).toMatchObject({ status: 'locked' });
      await expect(
        repo.signInMember({ email, password: SAMPLE_PASSWORD, remember: false, now: later(5) }),
      ).resolves.toMatchObject({
        status: 'locked',
      });
      await expect(
        repo.signInMember({ email, password: SAMPLE_PASSWORD, remember: false, now: later(16) }),
      ).resolves.toMatchObject({
        status: 'signed_in',
      });
    });

    it('tells an unconfirmed account to confirm first, only after the right password', async () => {
      const repo = createMockAuthRepository();
      await repo.registerMember(input);
      await expect(
        repo.signInMember({ email: input.email, password: 'wrong-password', remember: false, now }),
      ).resolves.toEqual({
        status: 'invalid',
      });
      await expect(
        repo.signInMember({ email: input.email, password: input.password, remember: false, now }),
      ).resolves.toEqual({
        status: 'unconfirmed',
      });
      expect(await repo.getSession()).toBeNull();
    });

    it('sends board accounts to /admin/login (the 2-step check cannot be skipped)', async () => {
      const repo = createMockAuthRepository();
      await expect(
        repo.signInMember({ email: 'ana.t@eestec.mk', password: SAMPLE_PASSWORD, remember: false, now }),
      ).resolves.toEqual({ status: 'use_admin_login' });
      expect(jar.get(MOCK_PERSONA_COOKIE)).toBeUndefined();
    });

    it('is switched off where the mock sign-in is (production)', async () => {
      gate.blocked = true;
      await expect(
        createMockAuthRepository().signInMember({
          email: 'marija.s@students.feit.ukim.edu.mk',
          password: SAMPLE_PASSWORD,
          remember: false,
          now,
        }),
      ).resolves.toEqual({ status: 'unavailable' });
    });
  });

  describe('password reset', () => {
    const email = 'marija.s@students.feit.ukim.edu.mk';

    it('sends a link to an account, nothing to anyone else, and answers the same', async () => {
      const repo = createMockAuthRepository();
      await expect(repo.requestPasswordReset({ email: 'nobody@example.com', now })).resolves.toBeUndefined();
      expect(listMockMail('nobody@example.com')).toHaveLength(0);
      await repo.requestPasswordReset({ email, locale: 'mk', now });
      expect(listMockMail(email)[0]?.kind).toBe('reset');
      expect(listMockMail(email)[0]?.link).toMatch(/^\/reset-password\?token=/);
      await repo.requestPasswordReset({ email, locale: 'en', now });
      expect(listMockMail(email)[0]?.link).toMatch(/^\/en\/reset-password\?token=/);
    });

    it('sends nothing to an account that is still waiting for its confirmation link', async () => {
      const repo = createMockAuthRepository();
      await repo.registerMember(input);
      await repo.requestPasswordReset({ email: input.email, now });
      expect(listMockMail(input.email).filter((mail) => mail.kind === 'reset')).toHaveLength(0);
    });

    it('chooses a new password, signs the member in, and the old password stops working', async () => {
      const repo = createMockAuthRepository();
      await repo.requestPasswordReset({ email, now });
      const token = tokenOf(listMockMail(email)[0]?.link);
      await expect(repo.peekToken({ token, kind: 'reset', now: later(10) })).resolves.toMatchObject({
        state: 'valid',
        email,
        name: 'Marija Stojanovska',
      });
      await expect(
        repo.resetPassword({ token, password: 'new-lake-2027-x', now: later(10) }),
      ).resolves.toEqual({
        status: 'ok',
        signedIn: true,
      });
      expect((await repo.getSession())?.name).toBe('Marija Stojanovska');
      await repo.signOut();
      await expect(
        repo.signInMember({ email, password: SAMPLE_PASSWORD, remember: false, now: later(11) }),
      ).resolves.toEqual({
        status: 'invalid',
      });
      await expect(
        repo.signInMember({ email, password: 'new-lake-2027-x', remember: false, now: later(11) }),
      ).resolves.toMatchObject({
        status: 'signed_in',
      });
      // The link works once.
      await expect(
        repo.resetPassword({ token, password: 'another-one-2027', now: later(12) }),
      ).resolves.toEqual({
        status: 'expired',
      });
    });

    it('expires after 30 minutes; the sample links show both screens', async () => {
      const repo = createMockAuthRepository();
      // (Asking for a new link replaces the unused ones of that person, so the samples come first.)
      await expect(repo.peekToken({ token: 'sample-expired-reset', kind: 'reset', now })).resolves.toEqual({
        state: 'expired',
      });
      await expect(
        repo.peekToken({ token: 'sample-valid-reset', kind: 'reset', now }),
      ).resolves.toMatchObject({ state: 'valid' });
      await expect(repo.peekToken({ token: 'nonsense', kind: 'reset', now })).resolves.toEqual({
        state: 'invalid',
      });
      await repo.requestPasswordReset({ email, now });
      const token = tokenOf(listMockMail(email)[0]?.link);
      await expect(repo.peekToken({ token, kind: 'reset', now: later(31) })).resolves.toEqual({
        state: 'expired',
      });
      await expect(repo.peekToken({ token: 'sample-valid-reset', kind: 'reset', now })).resolves.toEqual({
        state: 'invalid',
      });
    });

    it('does not sign a board account in after a reset (2-step stays)', async () => {
      const repo = createMockAuthRepository();
      await repo.requestPasswordReset({ email: 'ana.t@eestec.mk', now });
      const token = tokenOf(listMockMail('ana.t@eestec.mk')[0]?.link);
      await expect(repo.resetPassword({ token, password: 'new-lake-2027-x', now })).resolves.toEqual({
        status: 'ok',
        signedIn: false,
      });
      expect(await repo.getSession()).toBeNull();
    });
  });

  describe('board decisions', () => {
    it('lists the two sample registrations, oldest first, and counts them', async () => {
      const repo = createMockAuthRepository();
      const pending = await repo.listRegistrations({ status: 'pending' });
      expect(pending.map((item) => item.name)).toEqual(['Daniel Ristov', 'Elena Petrovska']);
      await expect(repo.pendingRegistrationSummary()).resolves.toEqual({
        count: 2,
        oldestAt: '2026-10-02T17:00:00+02:00',
      });
    });

    it('approving makes the member active and e-mails them', async () => {
      const repo = createMockAuthRepository();
      const result = await repo.decideRegistration({
        userId: 'u-elena',
        decision: 'approve',
        reason: '',
        now,
      });
      expect(result).toMatchObject({ status: 'decided', registration: { status: 'active' } });
      expect(listMockMail('elena.p@students.finki.ukim.mk')[0]).toMatchObject({ kind: 'approved' });
      await expect(
        repo.signInMember({
          email: 'elena.p@students.finki.ukim.mk',
          password: SAMPLE_PASSWORD,
          remember: false,
          now,
        }),
      ).resolves.toEqual({ status: 'signed_in', memberStatus: 'active' });
      await expect(repo.pendingRegistrationSummary()).resolves.toMatchObject({ count: 1 });
    });

    it('rejecting keeps the reason, e-mails it and shows it at sign-in', async () => {
      const repo = createMockAuthRepository();
      await repo.decideRegistration({
        userId: 'u-daniel-feeit',
        decision: 'reject',
        reason: ' Not on our member list. ',
        now,
      });
      expect(listMockMail('daniel.ristov@students.feit.ukim.edu.mk')[0]).toMatchObject({
        kind: 'rejected',
        reason: 'Not on our member list.',
      });
      await expect(
        repo.signInMember({
          email: 'daniel.ristov@students.feit.ukim.edu.mk',
          password: SAMPLE_PASSWORD,
          remember: false,
          now,
        }),
      ).resolves.toEqual({ status: 'rejected', reason: 'Not on our member list.' });
    });

    it('decides once, and knows who it does not know', async () => {
      const repo = createMockAuthRepository();
      await repo.decideRegistration({ userId: 'u-elena', decision: 'approve', reason: '', now });
      await expect(
        repo.decideRegistration({ userId: 'u-elena', decision: 'reject', reason: '', now }),
      ).resolves.toEqual({
        status: 'already_decided',
      });
      await expect(
        repo.decideRegistration({ userId: 'u-nobody', decision: 'approve', reason: '', now }),
      ).resolves.toEqual({
        status: 'not_found',
      });
    });

    it('does not list an unconfirmed account as pending', async () => {
      const repo = createMockAuthRepository();
      await repo.registerMember(input);
      expect((await repo.listRegistrations({ status: 'pending' })).map((item) => item.email)).not.toContain(
        input.email,
      );
    });
  });
});
