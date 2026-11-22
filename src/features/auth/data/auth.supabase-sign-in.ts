import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { unwrap } from '@/shared/data/supabase/errors';

import type { AdminRole, MemberStatus, SignInMemberResult, SignInResult, TwoFactorResult } from '../types';
import type { AuthRepository } from './auth.repository';

/**
 * What the sign-in needs from the outside. `signInClient(remember)` is the client that holds the new session (in the
 * app it writes the Auth cookies with the person's choice); `rememberChoice` keeps that choice for later refreshes.
 */
export type SignInDeps = {
  service: () => DbClient;
  signInClient: (remember: boolean) => Promise<DbClient>;
  rememberChoice: (remember: boolean | null) => Promise<void>;
};

type Gate = { locked: boolean; until: string | null; attempts_left: number };

/** Two-step codes are counted like passwords, under a key no e-mail address can have. */
const twoFactorKey = (userId: string) => `2fa:${userId}`;

const minutesLeft = (until: string, now: Date) =>
  Math.max(1, Math.ceil((new Date(until).getTime() - now.getTime()) / 60_000));

type PasswordStep =
  | { kind: 'locked'; until: string; minutes: number }
  | { kind: 'invalid'; attemptsLeft: number }
  | { kind: 'unconfirmed' }
  | { kind: 'ok'; client: DbClient; userId: string };

type Who = { role: AdminRole | null; profile: string | null; rejection: string | null };

/**
 * Signing in and out on a database (M21a). The password is checked by Auth; the pause after five wrong tries is ours
 * (`login_gate` / `login_record`, service role, keyed by e-mail so an unknown address behaves the same). A wrong
 * password and an unknown address are the same answer.
 */
export function createSignInMethods(
  deps: SignInDeps,
  client: DbClient,
): Pick<AuthRepository, 'signOut' | 'signInAdmin' | 'signInMember' | 'verifyTwoFactor'> {
  const gate = async (key: string) =>
    unwrap(await deps.service().rpc('login_gate', { p_email: key })) as unknown as Gate;
  const record = async (key: string, ok: boolean) =>
    unwrap(await deps.service().rpc('login_record', { p_email: key, p_ok: ok })) as unknown as Gate;

  async function who(userId: string): Promise<Who> {
    const service = deps.service();
    const [role, profile, account] = await Promise.all([
      service.from('admin_roles').select('role').eq('user_id', userId).maybeSingle(),
      service.from('profiles').select('status').eq('id', userId).maybeSingle(),
      service.from('member_accounts').select('rejection_reason').eq('profile_id', userId).maybeSingle(),
    ]);
    return {
      role: unwrap(role)?.role ?? null,
      profile: unwrap(profile)?.status ?? null,
      rejection: unwrap(account)?.rejection_reason ?? null,
    };
  }

  /** The password step both sign-ins share. Success leaves a session on `client`. */
  async function passwordStep(
    email: string,
    password: string,
    remember: boolean,
    now: Date,
  ): Promise<PasswordStep> {
    const key = email.trim().toLowerCase();
    const before = await gate(key);
    if (before.locked && before.until)
      return { kind: 'locked', until: before.until, minutes: minutesLeft(before.until, now) };

    const signedIn = await deps.signInClient(remember);
    const { data, error } = await signedIn.auth.signInWithPassword({ email: key, password });
    if (error) {
      // Auth checks the password first: "not confirmed" means the password was right.
      if (error.code === 'email_not_confirmed') {
        await record(key, true);
        return { kind: 'unconfirmed' };
      }
      if (error.code !== 'invalid_credentials' && error.code !== 'user_banned') throw error;
      const after = await record(key, false);
      return after.locked && after.until
        ? { kind: 'locked', until: after.until, minutes: minutesLeft(after.until, now) }
        : { kind: 'invalid', attemptsLeft: after.attempts_left };
    }
    await record(key, true);
    return { kind: 'ok', client: signedIn, userId: data.user.id };
  }

  const leave = async (session: DbClient) => {
    await session.auth.signOut({ scope: 'local' });
    await deps.rememberChoice(null);
  };

  return {
    async signOut() {
      await client.auth.signOut({ scope: 'local' });
      await deps.rememberChoice(null);
    },

    async signInAdmin({ email, password, remember, now }): Promise<SignInResult> {
      const step = await passwordStep(email, password, remember, now);
      if (step.kind === 'locked') return { status: 'locked', until: step.until };
      // An invited person without a password cannot be "unconfirmed" here: the same answer as a wrong password.
      if (step.kind === 'invalid') return { status: 'invalid', attemptsLeft: step.attemptsLeft };
      if (step.kind === 'unconfirmed')
        return { status: 'invalid', attemptsLeft: (await gate(email)).attempts_left };

      const person = await who(step.userId);
      if (!person.role) {
        await leave(step.client);
        return { status: 'not_staff' };
      }
      if (person.role !== 'super_admin') {
        await deps.rememberChoice(remember);
        return { status: 'signed_in' };
      }

      // A super admin has no powers until the 2-step code is given (the session is aal1 until then). Setting up the
      // first authenticator and the backup codes is M21b: until it exists, an account without one cannot enter.
      const factors = await step.client.auth.mfa.listFactors();
      if (factors.error || factors.data.totp.length === 0) {
        await leave(step.client);
        return { status: 'unavailable' };
      }
      await deps.rememberChoice(remember);
      return { status: 'two_factor_required' };
    },

    async verifyTwoFactor({ code, kind }): Promise<TwoFactorResult> {
      if (kind === 'backup') throw new Error('Backup codes come with the 2-step set-up (M21b)');
      const { data } = await client.auth.getUser();
      const user = data.user;
      if (!user) return { status: 'expired' };
      if ((await who(user.id)).role !== 'super_admin') return { status: 'expired' };

      const key = twoFactorKey(user.id);
      if ((await gate(key)).locked) return { status: 'invalid' };
      const factors = await client.auth.mfa.listFactors();
      const factor = factors.data?.totp[0];
      if (!factor) return { status: 'expired' };

      const checked = await client.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.replace(/\s/g, ''),
      });
      if (checked.error) {
        await record(key, false);
        return { status: 'invalid' };
      }
      await record(key, true);
      return { status: 'signed_in' };
    },

    async signInMember({ email, password, remember, now }): Promise<SignInMemberResult> {
      const step = await passwordStep(email, password, remember, now);
      if (step.kind === 'locked') return { status: 'locked', until: step.until, minutes: step.minutes };
      if (step.kind === 'invalid') return { status: 'invalid' };
      if (step.kind === 'unconfirmed') return { status: 'unconfirmed' };

      const person = await who(step.userId);
      // Board accounts sign in at /admin/login: 2-step for a super admin cannot be skipped.
      if (person.role) {
        await leave(step.client);
        return { status: 'use_admin_login' };
      }
      if (person.profile === 'rejected') {
        await leave(step.client);
        return { status: 'rejected', reason: person.rejection };
      }
      // An account without a profile, or one whose deletion has started, has no way in.
      const session = person.profile
        ? (unwrap(await step.client.rpc('my_session')) as unknown as { member_status: string | null } | null)
        : null;
      if (!session) {
        await leave(step.client);
        return { status: 'invalid' };
      }
      // Inactive and hidden profiles may sign in: it is the profile that is off, not the account (D44).
      await deps.rememberChoice(remember);
      return { status: 'signed_in', memberStatus: memberStatusOf(session.member_status) };
    },
  };
}

const memberStatusOf = (status: string | null): MemberStatus | null =>
  status === 'pending' || status === 'active' || status === 'alumni' ? status : null;
