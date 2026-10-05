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
        createMockAuthRepository().verifyTwoFactor({ code: SAMPLE_TOTP_CODE, kind: 'totp' }),
      ).resolves.toEqual({ status: 'unavailable' });
      expect(jar.has(MOCK_PERSONA_COOKIE)).toBe(false);
    });

    it('ignores a hand-made persona cookie', async () => {
      jar.set(MOCK_PERSONA_COOKIE, 'super-admin');
      await expect(createMockAuthRepository().getSession()).resolves.toBeNull();
    });
  });
});
