import 'server-only';

import { cookies } from 'next/headers';

import { mockTable } from '@/shared/data/mock/store';

import { mockSignInBlocked } from '../availability';
import { MOCK_PERSONA_COOKIE } from '../session-cookie';

import { type AttemptLog, emptyLog, lockState, recordFailure } from '../domain/lockout';
import { initials } from '@/shared/lib/initials';

import type { AdminAccount, AdminRole, Session } from '../types';
import type { AuthRepository } from './auth.repository';
import { type AccountRecord, accountsFixture } from './fixtures/accounts';
import { SAMPLE_BACKUP_CODE, SAMPLE_PASSWORD, SAMPLE_TOTP_CODE } from './fixtures/personas';

const MOCK_TWO_FACTOR_COOKIE = 'eestec_mock_2fa';

const toSession = ({
  personaId: _id,
  twoFactor: _twoFactor,
  status: _status,
  lastActiveAt: _lastActiveAt,
  invitedAt: _invitedAt,
  ...session
}: AccountRecord): Session => session;

const toAdmin = (account: AccountRecord & { adminRole: AdminRole }): AdminAccount => ({
  userId: account.userId,
  name: account.name,
  email: account.email,
  initials: account.initials,
  role: account.adminRole,
  managedEventIds: account.managedEventIds,
  twoFactor: account.twoFactor,
  status: account.status,
  lastActiveAt: account.lastActiveAt,
  invitedAt: account.invitedAt,
});

const ROLE_ORDER: Record<AdminRole, number> = { super_admin: 0, editor: 1, event_manager: 2 };
const isAdmin = (account: AccountRecord): account is AccountRecord & { adminRole: AdminRole } =>
  account.adminRole !== null;

/**
 * Mock auth: a cookie names one of the sample personas (no cookie = visitor). Admin sign-in checks
 * the sample password, applies the real lockout rule in memory, and asks super admins for 2-step.
 * On a production deployment it is switched off completely (no sessions, no sign-ins).
 */
export function createMockAuthRepository(): AuthRepository {
  const table = mockTable<{ accounts: AccountRecord[] }>('accounts', () => ({ accounts: accountsFixture }));
  const byId = (userId: string) => table.accounts.find((account) => account.userId === userId);
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
      if (mockSignInBlocked()) return null;
      const personaId = (await cookies()).get(MOCK_PERSONA_COOKIE)?.value;
      const account = table.accounts.find(
        (candidate) => candidate.personaId && candidate.personaId === personaId,
      );
      return account ? toSession(account) : null;
    },

    async signOut() {
      const jar = await cookies();
      jar.delete(MOCK_PERSONA_COOKIE);
      jar.delete(MOCK_TWO_FACTOR_COOKIE);
    },

    async signInAdmin({ email, password, remember, now }) {
      if (mockSignInBlocked()) return { status: 'unavailable' };
      const key = email.trim().toLowerCase();
      const log = attempts.byEmail[key] ?? emptyLog();
      const state = lockState(log, now);
      if (state.locked) return { status: 'locked', until: state.until!.toISOString() };

      // Invited people have no password yet; they can't sign in until they accept.
      const persona = table.accounts.find(
        (account) => account.email.toLowerCase() === key && account.personaId && account.status === 'active',
      );
      if (!persona?.personaId || password !== SAMPLE_PASSWORD) {
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
      persona.lastActiveAt = now.toISOString();
      await setSession(persona.personaId, remember);
      return { status: 'signed_in' };
    },

    async verifyTwoFactor({ code, kind, now }) {
      if (mockSignInBlocked()) return { status: 'unavailable' };
      const jar = await cookies();
      const pending = jar.get(MOCK_TWO_FACTOR_COOKIE)?.value;
      if (!pending) return { status: 'expired' };
      const expected = kind === 'totp' ? SAMPLE_TOTP_CODE : SAMPLE_BACKUP_CODE;
      if (code.replace(/\s/g, '') !== expected) return { status: 'invalid' };
      const [personaId = '', remember] = pending.split(':');
      jar.delete(MOCK_TWO_FACTOR_COOKIE);
      const account = table.accounts.find((candidate) => candidate.personaId === personaId);
      if (account) account.lastActiveAt = now.toISOString();
      await setSession(personaId, remember === '1');
      return { status: 'signed_in' };
    },

    requestPasswordReset() {
      return Promise.resolve();
    },

    listAdmins() {
      return Promise.resolve(
        table.accounts
          .filter(isAdmin)
          .sort((a, b) => ROLE_ORDER[a.adminRole] - ROLE_ORDER[b.adminRole] || a.name.localeCompare(b.name))
          .map(toAdmin),
      );
    },

    inviteAdmin({ name, email, role, managedEventIds, now }) {
      const key = email.trim().toLowerCase();
      const events = role === 'event_manager' ? managedEventIds : [];
      const existing = table.accounts.find((account) => account.email.toLowerCase() === key);
      if (existing?.adminRole) return Promise.resolve({ status: 'already_admin' });
      if (existing) {
        // A member gets the role on their own account (no second account).
        existing.adminRole = role;
        existing.managedEventIds = events;
        return Promise.resolve({
          status: 'invited',
          account: toAdmin(existing as AccountRecord & { adminRole: AdminRole }),
        });
      }
      const account: AccountRecord & { adminRole: AdminRole } = {
        personaId: null,
        userId: `u-${crypto.randomUUID()}`,
        name: name.trim(),
        initials: initials(name),
        username: '',
        email: email.trim(),
        headline: '',
        memberStatus: null,
        adminRole: role,
        managedEventIds: events,
        twoFactor: 'not_set_up',
        status: 'invited',
        lastActiveAt: null,
        invitedAt: now.toISOString(),
      };
      table.accounts.push(account);
      return Promise.resolve({ status: 'invited', account: toAdmin(account) });
    },

    updateAdmin(userId, { role, managedEventIds }) {
      const account = byId(userId);
      if (!account?.adminRole) return Promise.resolve(null);
      if (role) account.adminRole = role;
      if (account.adminRole !== 'event_manager') account.managedEventIds = [];
      else if (managedEventIds) account.managedEventIds = managedEventIds;
      return Promise.resolve(toAdmin(account as AccountRecord & { adminRole: AdminRole }));
    },

    removeAdmin(userId) {
      const index = table.accounts.findIndex((account) => account.userId === userId);
      const account = table.accounts[index];
      if (!account?.adminRole) return Promise.resolve(false);
      // An invite without a member account disappears; a member keeps their member account.
      if (account.status === 'invited' && account.memberStatus === null) table.accounts.splice(index, 1);
      else {
        account.adminRole = null;
        account.managedEventIds = [];
      }
      return Promise.resolve(true);
    },

    resendInvite(userId, now) {
      const account = byId(userId);
      if (!account?.adminRole || account.status !== 'invited') return Promise.resolve(null);
      account.invitedAt = now.toISOString();
      return Promise.resolve(toAdmin(account as AccountRecord & { adminRole: AdminRole }));
    },
  };
}
