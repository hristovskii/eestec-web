import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetMockStore } from '@/shared/data/mock/store';

import { MOCK_PERSONA_COOKIE } from '../session-cookie';
import { createMockAuthRepository } from './auth.mock';
import { SAMPLE_PASSWORD, SAMPLE_TOTP_CODE } from './fixtures/personas';

// A cookie jar standing in for next/headers, and a switch for the production gate.
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

describe('mock auth repository', () => {
  beforeEach(() => {
    jar.clear();
    resetMockStore();
    gate.blocked = false;
  });

  it('signs in an editor with the sample password', async () => {
    const repo = createMockAuthRepository();
    await expect(
      repo.signInAdmin({ email: 'pr@eestec.mk', password: SAMPLE_PASSWORD, remember: false, now }),
    ).resolves.toEqual({ status: 'signed_in' });
    expect((await repo.getSession())?.adminRole).toBe('editor');
  });

  describe('on a production deployment', () => {
    beforeEach(() => {
      gate.blocked = true;
    });

    it('rejects every sign-in and sets no cookie', async () => {
      const repo = createMockAuthRepository();
      await expect(
        repo.signInAdmin({ email: 'pr@eestec.mk', password: SAMPLE_PASSWORD, remember: true, now }),
      ).resolves.toEqual({ status: 'unavailable' });
      await expect(
        repo.signInAdmin({ email: 'ana.t@eestec.mk', password: SAMPLE_PASSWORD, remember: true, now }),
      ).resolves.toEqual({ status: 'unavailable' });
      expect(jar.size).toBe(0);
    });

    it('rejects the 2-step step', async () => {
      jar.set('eestec_mock_2fa', 'super-admin:1');
      await expect(
        createMockAuthRepository().verifyTwoFactor({ code: SAMPLE_TOTP_CODE, kind: 'totp', now }),
      ).resolves.toEqual({ status: 'unavailable' });
      expect(jar.has(MOCK_PERSONA_COOKIE)).toBe(false);
    });

    it('ignores a hand-made persona cookie', async () => {
      jar.set(MOCK_PERSONA_COOKIE, 'super-admin');
      await expect(createMockAuthRepository().getSession()).resolves.toBeNull();
    });
  });
});

describe('admin accounts (mock)', () => {
  beforeEach(() => {
    jar.clear();
    resetMockStore();
    gate.blocked = false;
  });

  it('lists admins by role, including invites, and leaves members out', async () => {
    const admins = await createMockAuthRepository().listAdmins();
    expect(admins.map((admin) => admin.role)).toEqual([
      'super_admin',
      'editor',
      'editor',
      'event_manager',
      'event_manager',
    ]);
    expect(admins.find((admin) => admin.name === 'Petar Kolev')).toMatchObject({
      status: 'invited',
      twoFactor: 'not_set_up',
    });
    expect(admins.some((admin) => admin.name === 'Marija Stojanovska')).toBe(false);
  });

  it('a role change takes effect on the next request of that person', async () => {
    const repo = createMockAuthRepository();
    await repo.updateAdmin('u-stefan', { role: 'event_manager', managedEventIds: ['ev-ai-at-the-edge'] });
    jar.set(MOCK_PERSONA_COOKIE, 'editor');
    await expect(repo.getSession()).resolves.toMatchObject({
      adminRole: 'event_manager',
      managedEventIds: ['ev-ai-at-the-edge'],
    });
    // Leaving event manager clears the events.
    await repo.updateAdmin('u-stefan', { role: 'editor' });
    await expect(repo.getSession()).resolves.toMatchObject({ adminRole: 'editor', managedEventIds: [] });
  });

  it('invites new people, gives members the role on their own account, refuses existing admins', async () => {
    const repo = createMockAuthRepository();
    const invited = await repo.inviteAdmin({
      name: 'Nikola Petrov',
      email: 'nikola.p@eestec.mk',
      role: 'editor',
      managedEventIds: ['ev-ai-at-the-edge'],
      now,
    });
    expect(invited).toMatchObject({
      status: 'invited',
      account: { initials: 'NP', status: 'invited', managedEventIds: [] },
    });
    await expect(
      repo.signInAdmin({ email: 'nikola.p@eestec.mk', password: SAMPLE_PASSWORD, remember: false, now }),
    ).resolves.toMatchObject({ status: 'invalid' });

    const member = await repo.inviteAdmin({
      name: 'Marija Stojanovska',
      email: 'marija.s@students.feit.ukim.edu.mk',
      role: 'event_manager',
      managedEventIds: ['ev-leading-teams'],
      now,
    });
    expect(member).toMatchObject({ status: 'invited', account: { userId: 'u-marija', status: 'active' } });

    await expect(
      repo.inviteAdmin({ name: 'Ana', email: 'ANA.T@eestec.mk', role: 'editor', managedEventIds: [], now }),
    ).resolves.toEqual({ status: 'already_admin' });
  });

  it('removes access: invites disappear, members keep their account', async () => {
    const repo = createMockAuthRepository();
    await repo.removeAdmin('u-petar');
    await repo.removeAdmin('u-daniel');
    const admins = await repo.listAdmins();
    expect(admins.map((admin) => admin.userId)).not.toContain('u-petar');
    expect(admins.map((admin) => admin.userId)).not.toContain('u-daniel');
    jar.set(MOCK_PERSONA_COOKIE, 'event-manager');
    await expect(repo.getSession()).resolves.toMatchObject({ userId: 'u-daniel', adminRole: null });
  });

  it('resends invites only to invited people', async () => {
    const repo = createMockAuthRepository();
    const later = new Date('2026-10-05T09:00:00Z');
    await expect(repo.resendInvite('u-petar', later)).resolves.toMatchObject({
      invitedAt: later.toISOString(),
    });
    await expect(repo.resendInvite('u-ana', later)).resolves.toBeNull();
  });
});
