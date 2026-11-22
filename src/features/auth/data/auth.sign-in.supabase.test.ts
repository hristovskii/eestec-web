import { afterAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { totpCode } from '../../../../tests/supabase/totp';
import { createSupabaseAuthRepository } from './auth.supabase';
import type { SignInDeps } from './auth.supabase-sign-in';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const NOW = new Date('2026-10-05T08:00:00.000Z');
const PASSWORD = 'a long enough password 1';

const created: TestUser[] = [];
afterAll(async () => {
  for (const user of created) await user.cleanup();
});
const user = async (options: Parameters<typeof createTestUser>[0] = {}) => {
  const made = await createTestUser({ password: PASSWORD, ...options });
  created.push(made);
  return made;
};

/** One browser: a single Auth client that holds the session, and the choices the app would have written to cookies. */
function browser() {
  const client = anonClient();
  const choices: (boolean | null)[] = [];
  const deps: SignInDeps = {
    service: () => serviceClient(),
    signInClient: () => Promise.resolve(client),
    rememberChoice: (remember) => {
      choices.push(remember);
      return Promise.resolve();
    },
  };
  return { client, choices, repo: createSupabaseAuthRepository(client, 'session', deps) };
}

const credentials = (who: TestUser, password = PASSWORD) => ({
  email: who.email,
  password,
  remember: false,
  now: NOW,
});

/** Gives an account an authenticator and returns the secret (a super admin cannot enter without one). */
async function enrolAuthenticator(who: TestUser): Promise<string> {
  const own = anonClient();
  const signedIn = await own.auth.signInWithPassword({ email: who.email, password: PASSWORD });
  if (signedIn.error) throw signedIn.error;
  const enrolled = await own.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'test' });
  if (enrolled.error) throw enrolled.error;
  const secret = enrolled.data.totp.secret;
  const verified = await own.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: totpCode(secret),
  });
  if (verified.error) throw verified.error;
  return secret;
}

describe('AuthRepository (supabase, admin sign-in)', () => {
  it('signs an editor in, and out again', async () => {
    const editor = await user({ role: 'editor', name: 'Sign-in Editor' });
    const { repo, choices } = browser();
    expect(await repo.signInAdmin({ ...credentials(editor), remember: true })).toEqual({
      status: 'signed_in',
    });
    expect(choices).toEqual([true]);
    expect(await repo.getSession()).toMatchObject({ userId: editor.id, adminRole: 'editor' });
    await repo.signOut();
    expect(await repo.getSession()).toBeNull();
    expect(choices.at(-1)).toBeNull();
  });

  it('answers a wrong password and an unknown address the same way, and counts down', async () => {
    const editor = await user({ role: 'editor' });
    const { repo } = browser();
    expect(await repo.signInAdmin(credentials(editor, 'wrong password 1'))).toEqual({
      status: 'invalid',
      attemptsLeft: 4,
    });
    expect(
      await repo.signInAdmin({
        email: `nobody-${crypto.randomUUID()}@example.invalid`,
        password: 'wrong password 1',
        remember: false,
        now: NOW,
      }),
    ).toEqual({ status: 'invalid', attemptsLeft: 4 });
    expect(await repo.getSession()).toBeNull();
  });

  it('pauses sign-in after five wrong tries, even for the right password', async () => {
    const editor = await user({ role: 'editor' });
    const { repo } = browser();
    for (const left of [4, 3, 2, 1])
      expect(await repo.signInAdmin(credentials(editor, 'wrong password 1'))).toEqual({
        status: 'invalid',
        attemptsLeft: left,
      });
    expect(await repo.signInAdmin(credentials(editor, 'wrong password 1'))).toMatchObject({
      status: 'locked',
    });
    const locked = await repo.signInAdmin(credentials(editor));
    expect(locked).toMatchObject({ status: 'locked' });
    expect(Date.parse((locked as { until: string }).until)).toBeGreaterThan(Date.now());
    expect(await repo.getSession()).toBeNull();
  });

  it('forgets earlier mistakes after a success', async () => {
    const editor = await user({ role: 'editor' });
    const { repo } = browser();
    await repo.signInAdmin(credentials(editor, 'wrong password 1'));
    await repo.signInAdmin(credentials(editor));
    expect(await repo.signInAdmin(credentials(editor, 'wrong password 1'))).toEqual({
      status: 'invalid',
      attemptsLeft: 4,
    });
  });

  it('sends someone without a board role away, signed out', async () => {
    const member = await user({ member: 'active' });
    const { repo } = browser();
    expect(await repo.signInAdmin(credentials(member))).toEqual({ status: 'not_staff' });
    expect(await repo.getSession()).toBeNull();
  });

  it('gives a super admin no powers until the 2-step code is right', async () => {
    const admin = await user({ role: 'super_admin', name: 'Sign-in Super' });
    const secret = await enrolAuthenticator(admin);
    const { repo, choices } = browser();
    expect(await repo.signInAdmin({ ...credentials(admin), remember: true })).toEqual({
      status: 'two_factor_required',
    });
    expect(choices).toEqual([true]);
    // Signed in with the password only: the board role does not count yet (aal1).
    expect(await repo.getSession()).toMatchObject({ userId: admin.id, adminRole: null });

    expect(await repo.verifyTwoFactor({ code: '000000', kind: 'totp', now: NOW })).toEqual({
      status: 'invalid',
    });
    expect(await repo.getSession()).toMatchObject({ adminRole: null });
    expect(await repo.verifyTwoFactor({ code: totpCode(secret), kind: 'totp', now: NOW })).toEqual({
      status: 'signed_in',
    });
    expect(await repo.getSession()).toMatchObject({ userId: admin.id, adminRole: 'super_admin' });
  });

  it('counts wrong 2-step codes too: five, then the right one is refused for a while', async () => {
    const admin = await user({ role: 'super_admin' });
    const secret = await enrolAuthenticator(admin);
    const { repo } = browser();
    await repo.signInAdmin(credentials(admin));
    for (let i = 0; i < 5; i += 1)
      expect(await repo.verifyTwoFactor({ code: '000000', kind: 'totp', now: NOW })).toEqual({
        status: 'invalid',
      });
    expect(await repo.verifyTwoFactor({ code: totpCode(secret), kind: 'totp', now: NOW })).toEqual({
      status: 'invalid',
    });
    expect(await repo.getSession()).toMatchObject({ adminRole: null });
  });

  it('says "expired" to a 2-step code without a password step, or from someone who is no super admin', async () => {
    const { repo } = browser();
    expect(await repo.verifyTwoFactor({ code: '123456', kind: 'totp', now: NOW })).toEqual({
      status: 'expired',
    });
    const editor = await user({ role: 'editor' });
    const other = browser();
    await other.repo.signInAdmin(credentials(editor));
    expect(await other.repo.verifyTwoFactor({ code: '123456', kind: 'totp', now: NOW })).toEqual({
      status: 'expired',
    });
  });

  it('does not let a super admin without an authenticator in (set-up is M21b)', async () => {
    const admin = await user({ role: 'super_admin' });
    const { repo } = browser();
    expect(await repo.signInAdmin(credentials(admin))).toEqual({ status: 'unavailable' });
    expect(await repo.getSession()).toBeNull();
  });
});

describe('AuthRepository (supabase, member sign-in)', () => {
  it('signs an approved member in', async () => {
    const member = await user({ member: 'active', name: 'Sign-in Member' });
    const { repo, choices } = browser();
    expect(await repo.signInMember(credentials(member))).toEqual({
      status: 'signed_in',
      memberStatus: 'active',
    });
    expect(choices).toEqual([false]);
    expect(await repo.getSession()).toMatchObject({ userId: member.id, memberStatus: 'active' });
  });

  it('lets a member who waits for the board in, and one whose profile is switched off', async () => {
    for (const [status, expected] of [
      ['pending', 'pending'],
      ['inactive', null],
      ['hidden', null],
    ] as const) {
      const person = await user({ member: 'pending' });
      await serviceClient().from('profiles').update({ status }).eq('id', person.id);
      expect(await browser().repo.signInMember(credentials(person))).toEqual({
        status: 'signed_in',
        memberStatus: expected,
      });
    }
  });

  it('shares the pause with the admin sign-in, and counts minutes on the app’s clock', async () => {
    const member = await user({ member: 'active' });
    const { repo } = browser();
    for (let i = 0; i < 4; i += 1)
      expect(await repo.signInMember(credentials(member, 'wrong password 1'))).toEqual({ status: 'invalid' });
    const locked = await repo.signInMember(credentials(member, 'wrong password 1'));
    expect(locked).toMatchObject({ status: 'locked' });
    const now = new Date();
    const later = await repo.signInMember({ ...credentials(member), now });
    expect(later).toMatchObject({ status: 'locked' });
    expect((later as { minutes: number }).minutes).toBeGreaterThanOrEqual(14);
    expect((later as { minutes: number }).minutes).toBeLessThanOrEqual(15);
    // The same address is paused at /admin/login too.
    expect(await browser().repo.signInAdmin(credentials(member))).toMatchObject({ status: 'locked' });
  });

  it('tells a board account to use the admin sign-in, signed out', async () => {
    const editor = await user({ role: 'editor', member: 'active' });
    const { repo } = browser();
    expect(await repo.signInMember(credentials(editor))).toEqual({ status: 'use_admin_login' });
    expect(await repo.getSession()).toBeNull();
  });

  it('signs a rejected member out with the reason', async () => {
    const member = await user({ member: 'pending' });
    await serviceClient().from('profiles').update({ status: 'rejected' }).eq('id', member.id);
    await serviceClient().from('member_accounts').insert({
      profile_id: member.id,
      data_consent_at: NOW.toISOString(),
      rejection_reason: 'Not a student',
    });
    const { repo } = browser();
    expect(await repo.signInMember(credentials(member))).toEqual({
      status: 'rejected',
      reason: 'Not a student',
    });
    expect(await repo.getSession()).toBeNull();
  });

  it('says "unconfirmed" only to the right password, and "invalid" to a wrong one', async () => {
    const created_ = await serviceClient().auth.admin.createUser({
      email: `unconfirmed-${crypto.randomUUID().slice(0, 8)}@example.invalid`,
      password: PASSWORD,
    });
    const id = created_.data.user!.id;
    try {
      const { repo } = browser();
      const email = created_.data.user!.email!;
      expect(await repo.signInMember({ email, password: PASSWORD, remember: false, now: NOW })).toEqual({
        status: 'unconfirmed',
      });
      expect(
        await repo.signInMember({ email, password: 'wrong password 1', remember: false, now: NOW }),
      ).toEqual({ status: 'invalid' });
      expect(await repo.getSession()).toBeNull();
    } finally {
      await serviceClient().from('login_lockouts').delete().eq('email_key', created_.data.user!.email!);
      await serviceClient().auth.admin.deleteUser(id);
    }
  });

  it('gives an account without a profile no way in, and one that is being deleted', async () => {
    const bare = await user();
    expect(await browser().repo.signInMember(credentials(bare))).toEqual({ status: 'invalid' });

    const leaving = await user({ member: 'active' });
    await serviceClient()
      .from('account_deletion_jobs')
      .insert({ user_id: leaving.id, delete_published_memories: false });
    expect(await browser().repo.signInMember(credentials(leaving))).toEqual({ status: 'invalid' });
    await serviceClient().from('account_deletion_jobs').delete().eq('user_id', leaving.id);
  });
});
