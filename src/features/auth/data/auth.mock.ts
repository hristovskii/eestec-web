import 'server-only';

import { cookies } from 'next/headers';

import { mockTable } from '@/shared/data/mock/store';

import { MOCK_PERSONA_COOKIE } from '../session-cookie';

import { type AttemptLog, emptyLog, lockState, recordFailure } from '../domain/lockout';
import type { Session } from '../types';
import type { AuthRepository } from './auth.repository';
import {
  type Persona,
  personas,
  SAMPLE_BACKUP_CODE,
  SAMPLE_PASSWORD,
  SAMPLE_TOTP_CODE,
} from './fixtures/personas';

const MOCK_TWO_FACTOR_COOKIE = 'eestec_mock_2fa';

const toSession = ({ personaId: _id, label: _label, ...session }: Persona): Session => session;

/**
 * Mock auth: a cookie names one of the sample personas (no cookie = visitor). Admin sign-in checks
 * the sample password, applies the real lockout rule in memory, and asks super admins for 2-step.
 */
export function createMockAuthRepository(): AuthRepository {
  const attempts = mockTable<{ byEmail: Record<string, AttemptLog> }>('loginAttempts', () => ({
    byEmail: {},
  }));

  const setSession = async (personaId: string, remember: boolean) => {
    (await cookies()).set(MOCK_PERSONA_COOKIE, personaId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      // "Keep me signed in on this device for 14 days"; otherwise a browser-session cookie.
      ...(remember ? { maxAge: 14 * 24 * 60 * 60 } : {}),
    });
  };

  return {
    async getSession() {
      const personaId = (await cookies()).get(MOCK_PERSONA_COOKIE)?.value;
      const persona = personas.find((p) => p.personaId === personaId);
      return persona ? toSession(persona) : null;
    },

    async signOut() {
      const jar = await cookies();
      jar.delete(MOCK_PERSONA_COOKIE);
      jar.delete(MOCK_TWO_FACTOR_COOKIE);
    },

    async signInAdmin({ email, password, remember, now }) {
      const key = email.trim().toLowerCase();
      const log = attempts.byEmail[key] ?? emptyLog();
      const state = lockState(log, now);
      if (state.locked) return { status: 'locked', until: state.until!.toISOString() };

      const persona = personas.find((p) => p.email.toLowerCase() === key);
      if (!persona || password !== SAMPLE_PASSWORD) {
        const next = recordFailure(log, now);
        attempts.byEmail[key] = next;
        const after = lockState(next, now);
        return after.locked
          ? { status: 'locked', until: after.until!.toISOString() }
          : { status: 'invalid', attemptsLeft: after.attemptsLeft };
      }

      delete attempts.byEmail[key];
      if (!persona.adminRole) return { status: 'not_staff' };
      if (persona.adminRole === 'super_admin') {
        (await cookies()).set(MOCK_TWO_FACTOR_COOKIE, `${persona.personaId}:${remember ? '1' : '0'}`, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/admin',
          maxAge: 10 * 60,
        });
        return { status: 'two_factor_required' };
      }
      await setSession(persona.personaId, remember);
      return { status: 'signed_in' };
    },

    async verifyTwoFactor({ code, kind }) {
      const jar = await cookies();
      const pending = jar.get(MOCK_TWO_FACTOR_COOKIE)?.value;
      if (!pending) return { status: 'expired' };
      const expected = kind === 'totp' ? SAMPLE_TOTP_CODE : SAMPLE_BACKUP_CODE;
      if (code.replace(/\s/g, '') !== expected) return { status: 'invalid' };
      const [personaId = '', remember] = pending.split(':');
      jar.delete(MOCK_TWO_FACTOR_COOKIE);
      await setSession(personaId, remember === '1');
      return { status: 'signed_in' };
    },

    requestPasswordReset() {
      return Promise.resolve();
    },
  };
}
