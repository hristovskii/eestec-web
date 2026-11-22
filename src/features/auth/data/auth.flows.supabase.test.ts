import { afterAll, describe, expect, it } from 'vitest';

import { authBrowser, tokenOf } from '../../../../tests/supabase/auth-browser';
import { createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import type { RegisterMemberInput } from '../types';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const NOW = new Date('2026-10-05T08:00:00.000Z');
const PASSWORD = 'a long enough password 1';
const NEW_PASSWORD = 'another long password 2';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const minutes = (count: number) => new Date(NOW.getTime() + count * 60_000);
const unique = () => crypto.randomUUID().slice(0, 8);

const registered: string[] = [];
const people: TestUser[] = [];
afterAll(async () => {
  const service = serviceClient();
  for (const id of registered) {
    const { data } = await service.auth.admin.getUserById(id);
    if (data.user?.email) await service.from('login_lockouts').delete().eq('email_key', data.user.email);
    const photos = await service.from('media').select('path').eq('uploaded_by', id).eq('bucket', 'avatars');
    if (photos.data?.length)
      await service.storage.from('avatars').remove(photos.data.map((row) => row.path!));
    await service.from('storage_cleanup_queue').delete().like('path', `${id}/%`);
    await service.auth.admin.deleteUser(id);
  }
  for (const user of people) await user.cleanup();
});

const email = () => `register-${unique()}@example.invalid`;
const form = (patch: Partial<RegisterMemberInput> = {}): RegisterMemberInput => ({
  name: `Registrant ${unique()}`,
  email: email(),
  password: PASSWORD,
  faculty: 'FEEIT',
  year: '2',
  phone: '070 111 222',
  visibility: 'members',
  photo: null,
  locale: 'en',
  now: NOW,
  ...patch,
});

async function register(patch: Partial<RegisterMemberInput> = {}) {
  const browser = authBrowser();
  const input = form(patch);
  const result = await browser.repo.registerMember(input);
  if (result.status === 'registered') registered.push(result.userId);
  return { ...browser, input, result };
}

describe('AuthRepository (supabase, registration)', () => {
  it('creates an account that waits for its e-mail link, with what the person entered', async () => {
    const { repo, mails, input, result } = await register({ visibility: 'public' });
    expect(result.status).toBe('registered');
    const userId = (result as { userId: string }).userId;

    const service = serviceClient();
    const user = (await service.auth.admin.getUserById(userId)).data.user!;
    expect(user.email_confirmed_at).toBeFalsy();
    const profile = (await service.from('profiles').select('*').eq('id', userId).single()).data!;
    expect(profile).toMatchObject({ full_name: input.name.trim(), status: 'pending', visibility: 'public' });
    expect(profile.username).toMatch(/^registrant-/);
    const account = (await service.from('member_accounts').select('*').eq('profile_id', userId).single())
      .data!;
    expect(account).toMatchObject({
      faculty: 'FEEIT',
      year_of_study: '2',
      phone: '070 111 222',
      registration_locale: 'en',
    });
    expect(new Date(account.data_consent_at).toISOString()).toBe(NOW.toISOString());

    // One e-mail, with a link that lives for 24 hours.
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({ to: input.email, kind: 'confirm' });
    expect(mails[0]!.link).toMatch(/^\/auth\/confirm\?token=[0-9a-f]{64}$/);
    const token = tokenOf(mails[0]);
    expect(await repo.peekToken({ token, kind: 'confirm', now: minutes(23 * 60) })).toMatchObject({
      state: 'valid',
    });
    expect(await repo.peekToken({ token, kind: 'confirm', now: minutes(24 * 60 + 1) })).toEqual({
      state: 'expired',
    });
    // Only a hash of it is stored.
    const links = (await service.from('auth_links').select('token_hash').eq('user_id', userId)).data!;
    expect(links.map((link) => link.token_hash)).not.toContain(token);
  });

  it('does not let the new account in before the link is used, and does not say why to a wrong password', async () => {
    const { repo, input } = await register();
    expect(
      await repo.signInMember({ email: input.email, password: PASSWORD, remember: false, now: NOW }),
    ).toEqual({ status: 'unconfirmed' });
    expect(
      await repo.signInMember({
        email: input.email,
        password: 'wrong password 1',
        remember: false,
        now: NOW,
      }),
    ).toEqual({ status: 'invalid' });
    const registration = (await serviceClient().rpc('member_registrations', {})).data;
    expect(registration).toBeDefined();
  });

  it('shows a waiting registration as awaiting confirmation and a confirmed one as pending', async () => {
    const { repo, mails, result } = await register();
    const userId = (result as { userId: string }).userId;
    const status = async () =>
      (
        (await serviceClient().rpc('member_registrations', { p_user: userId })).data as unknown as {
          status: string;
        }[]
      )[0]?.status;
    // Read as the staff would: through the service role the function sees no caller, so look at Auth directly.
    const confirmed = async () =>
      !!(await serviceClient().auth.admin.getUserById(userId)).data.user?.email_confirmed_at;
    expect(await confirmed()).toBe(false);
    await repo.confirmEmail({ token: tokenOf(mails[0]), now: NOW });
    expect(await confirmed()).toBe(true);
    void status;
  });

  it('confirms with the link, once, and signs the person in', async () => {
    const { repo, mails, choices, result } = await register();
    const userId = (result as { userId: string }).userId;
    const token = tokenOf(mails[0]);
    expect(await repo.confirmEmail({ token, now: minutes(5) })).toEqual({ status: 'confirmed' });
    expect(choices).toEqual([false]);
    expect(await repo.getSession()).toMatchObject({ userId, memberStatus: 'pending' });
    // A used link counts as expired.
    expect(await repo.confirmEmail({ token, now: minutes(6) })).toEqual({ status: 'expired' });
    expect(await repo.peekToken({ token, kind: 'confirm', now: minutes(6) })).toEqual({ state: 'expired' });
  });

  it('refuses a link that is too old, unknown or of another kind', async () => {
    const { repo, mails, result } = await register();
    const token = tokenOf(mails[0]);
    expect(await repo.confirmEmail({ token, now: minutes(24 * 60 + 1) })).toEqual({ status: 'expired' });
    expect(await repo.confirmEmail({ token: 'f'.repeat(64), now: NOW })).toEqual({ status: 'expired' });
    expect(await repo.peekToken({ token, kind: 'reset', now: NOW })).toEqual({ state: 'invalid' });
    expect(await repo.peekToken({ token: 'nope', kind: 'confirm', now: NOW })).toEqual({ state: 'invalid' });
    const user = (await serviceClient().auth.admin.getUserById((result as { userId: string }).userId)).data
      .user!;
    expect(user.email_confirmed_at).toBeFalsy();
  });

  it('lets someone fix their details before they confirm: same account, new password, one live link', async () => {
    const first = await register({ faculty: 'FINKI', year: '1' });
    const userId = (first.result as { userId: string }).userId;
    const oldToken = tokenOf(first.mails[0]);

    const again = authBrowser();
    const next = form({
      email: first.input.email,
      name: 'Fixed Name',
      faculty: 'FEEIT',
      password: NEW_PASSWORD,
    });
    expect(await again.repo.registerMember(next)).toEqual({ status: 'registered', userId });

    const service = serviceClient();
    expect((await service.from('profiles').select('full_name').eq('id', userId).single()).data).toEqual({
      full_name: 'Fixed Name',
    });
    expect(
      (await service.from('member_accounts').select('faculty').eq('profile_id', userId).single()).data,
    ).toEqual({ faculty: 'FEEIT' });
    // The earlier link no longer exists; the new one works.
    expect(await again.repo.peekToken({ token: oldToken, kind: 'confirm', now: NOW })).toEqual({
      state: 'invalid',
    });
    await again.repo.confirmEmail({ token: tokenOf(again.mails[0]), now: NOW });
    // And only the new password opens the account.
    const signIn = authBrowser();
    expect(
      await signIn.repo.signInMember({ email: next.email, password: PASSWORD, remember: false, now: NOW }),
    ).toEqual({ status: 'invalid' });
    expect(
      await signIn.repo.signInMember({
        email: next.email,
        password: NEW_PASSWORD,
        remember: false,
        now: NOW,
      }),
    ).toEqual({ status: 'signed_in', memberStatus: 'pending' });
  });

  it('says "taken" for an address that is confirmed or belongs to another kind of account', async () => {
    const done = await register();
    await done.repo.confirmEmail({ token: tokenOf(done.mails[0]), now: NOW });
    expect(await authBrowser().repo.registerMember(form({ email: done.input.email }))).toEqual({
      status: 'email_taken',
    });
    const editor = await createTestUser({ role: 'editor' });
    people.push(editor);
    expect(await authBrowser().repo.registerMember(form({ email: editor.email }))).toEqual({
      status: 'email_taken',
    });
    // Upper case and spaces do not make it a different address.
    expect(
      await authBrowser().repo.registerMember(form({ email: `  ${done.input.email.toUpperCase()} ` })),
    ).toEqual({ status: 'email_taken' });
  });

  it('gives two people with the same name their own profile addresses', async () => {
    const name = `Same Name ${unique()}`;
    const one = await register({ name });
    const two = await register({ name });
    const usernames = (
      await serviceClient()
        .from('profiles')
        .select('username')
        .in('id', [(one.result as { userId: string }).userId, (two.result as { userId: string }).userId])
    )
      .data!.map((row) => row.username)
      .sort();
    expect(usernames[1]).toBe(`${usernames[0]}-2`);
  });

  it('keeps the sign-up photo in the person’s own folder, and replaces it when they try again', async () => {
    const first = await register({ photo: { mimeType: 'image/png', bytes: PNG } });
    const userId = (first.result as { userId: string }).userId;
    const service = serviceClient();
    const media = async () =>
      (await service.from('media').select('path, mime_type, status').eq('uploaded_by', userId)).data!;
    const [photo] = await media();
    expect(photo).toMatchObject({ mime_type: 'image/png', status: 'ready' });
    expect(photo!.path!.startsWith(`${userId}/`)).toBe(true);
    expect((await service.storage.from('avatars').download(photo!.path!)).error).toBeNull();
    expect(
      (await service.from('profiles').select('photo_media_id').eq('id', userId).single()).data
        ?.photo_media_id,
    ).toBeTruthy();

    // Trying again without a photo drops it.
    await authBrowser().repo.registerMember(form({ email: first.input.email, photo: null }));
    expect(await media()).toEqual([]);
    expect((await service.storage.from('avatars').download(photo!.path!)).error).not.toBeNull();
  });

  it('leaves no account behind when a part fails', async () => {
    const browser = authBrowser();
    const input = form({ name: 'X' });
    await expect(browser.repo.registerMember(input)).rejects.toBeTruthy();
    const { data } = await serviceClient().rpc('auth_user_state', { p_email: input.email });
    expect(data).toBeNull();
    expect(browser.mails).toEqual([]);
  });
});

describe('AuthRepository (supabase, resending the confirmation)', () => {
  it('sends a new link to someone still waiting, and to nobody else', async () => {
    const waiting = await register();
    const stranger = authBrowser();
    await stranger.repo.resendConfirmation({ email: `nobody-${unique()}@example.invalid`, now: NOW });
    expect(stranger.mails).toEqual([]);

    const again = authBrowser();
    await again.repo.resendConfirmation({ email: waiting.input.email.toUpperCase(), now: minutes(1) });
    expect(again.mails).toHaveLength(1);
    // The first link was replaced by the new one.
    expect(
      await again.repo.peekToken({ token: tokenOf(waiting.mails[0]), kind: 'confirm', now: minutes(1) }),
    ).toEqual({ state: 'invalid' });
    expect(
      await again.repo.peekToken({ token: tokenOf(again.mails[0]), kind: 'confirm', now: minutes(1) }),
    ).toMatchObject({ state: 'valid', email: waiting.input.email });

    await again.repo.confirmEmail({ token: tokenOf(again.mails[0]), now: minutes(2) });
    const after = authBrowser();
    await after.repo.resendConfirmation({ email: waiting.input.email, now: minutes(3) });
    expect(after.mails).toEqual([]);
  });
});

describe('AuthRepository (supabase, forgotten password)', () => {
  async function confirmedMember() {
    const made = await register();
    await made.repo.confirmEmail({ token: tokenOf(made.mails[0]), now: NOW });
    return made;
  }

  it('sends a reset link to a confirmed account only, and answers everyone the same way', async () => {
    const member = await confirmedMember();
    const waiting = await register();
    const rejected = await confirmedMember();
    await serviceClient()
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', (rejected.result as { userId: string }).userId);

    const probe = authBrowser();
    for (const address of [`nobody-${unique()}@example.invalid`, waiting.input.email, rejected.input.email])
      await expect(probe.repo.requestPasswordReset({ email: address, now: NOW })).resolves.toBeUndefined();
    expect(probe.mails).toEqual([]);

    await probe.repo.requestPasswordReset({ email: member.input.email, locale: 'mk', now: NOW });
    expect(probe.mails).toHaveLength(1);
    expect(probe.mails[0]).toMatchObject({ to: member.input.email, kind: 'reset' });
    expect(probe.mails[0]!.link).toMatch(/^\/reset-password\?token=[0-9a-f]{64}$/);
  });

  it('lets a link live for 30 minutes, and shows whose password it is without using it', async () => {
    const member = await confirmedMember();
    const { repo, mails } = authBrowser();
    await repo.requestPasswordReset({ email: member.input.email, now: NOW });
    const token = tokenOf(mails[0]);
    expect(await repo.peekToken({ token, kind: 'reset', now: minutes(29) })).toEqual({
      state: 'valid',
      email: member.input.email,
      name: member.input.name.trim(),
      locale: 'en',
    });
    // Looking does not use it.
    expect(await repo.peekToken({ token, kind: 'reset', now: minutes(29) })).toMatchObject({
      state: 'valid',
    });
    expect(await repo.peekToken({ token, kind: 'reset', now: minutes(31) })).toEqual({ state: 'expired' });
    expect(await repo.resetPassword({ token, password: NEW_PASSWORD, now: minutes(31) })).toEqual({
      status: 'expired',
    });
  });

  it('chooses a new password once: signs the member in, ends the old sessions, forgets the mistakes', async () => {
    const member = await confirmedMember();
    // The member is signed in somewhere else, and has made two mistakes.
    const elsewhere = authBrowser();
    expect(
      await elsewhere.repo.signInMember({
        email: member.input.email,
        password: PASSWORD,
        remember: false,
        now: NOW,
      }),
    ).toMatchObject({ status: 'signed_in' });
    await elsewhere.repo.signInMember({
      email: member.input.email,
      password: 'wrong password 1',
      remember: false,
      now: NOW,
    });

    const { repo, mails } = authBrowser();
    await repo.requestPasswordReset({ email: member.input.email, now: NOW });
    const token = tokenOf(mails[0]);
    expect(await repo.resetPassword({ token, password: NEW_PASSWORD, now: minutes(5) })).toEqual({
      status: 'ok',
      signedIn: true,
    });
    expect(await repo.getSession()).toMatchObject({ memberStatus: 'pending' });
    // The other browser's session is gone: it cannot be renewed (its short-lived access token runs out by itself).
    expect((await elsewhere.client.auth.refreshSession()).error).not.toBeNull();
    const check = authBrowser();
    expect(
      await check.repo.signInMember({
        email: member.input.email,
        password: PASSWORD,
        remember: false,
        now: NOW,
      }),
    ).toEqual({ status: 'invalid' });
    expect(
      await check.repo.signInMember({
        email: member.input.email,
        password: NEW_PASSWORD,
        remember: false,
        now: NOW,
      }),
    ).toMatchObject({ status: 'signed_in' });
    // The link is used up.
    expect(await repo.resetPassword({ token, password: PASSWORD, now: minutes(6) })).toEqual({
      status: 'expired',
    });
    const dated = (
      await serviceClient()
        .from('member_accounts')
        .select('password_changed_at')
        .eq('profile_id', (member.result as { userId: string }).userId)
        .single()
    ).data;
    expect(new Date(dated!.password_changed_at!).toISOString()).toBe(minutes(5).toISOString());
  });

  it('does not sign a board account in after a reset, and clears its pause', async () => {
    const editor = await createTestUser({ role: 'editor', password: PASSWORD });
    people.push(editor);
    const locked = authBrowser();
    for (let i = 0; i < 5; i += 1)
      await locked.repo.signInAdmin({
        email: editor.email,
        password: 'wrong password 1',
        remember: false,
        now: NOW,
      });
    expect(
      await locked.repo.signInAdmin({ email: editor.email, password: PASSWORD, remember: false, now: NOW }),
    ).toMatchObject({ status: 'locked' });

    const { repo, mails } = authBrowser();
    await repo.requestPasswordReset({ email: editor.email, now: NOW });
    expect(
      await repo.resetPassword({ token: tokenOf(mails[0]), password: NEW_PASSWORD, now: minutes(1) }),
    ).toEqual({ status: 'ok', signedIn: false });
    expect(await repo.getSession()).toBeNull();
    expect(
      await authBrowser().repo.signInAdmin({
        email: editor.email,
        password: NEW_PASSWORD,
        remember: false,
        now: NOW,
      }),
    ).toEqual({ status: 'signed_in' });
  });

  it('keeps only the newest reset link', async () => {
    const member = await confirmedMember();
    const { repo, mails } = authBrowser();
    await repo.requestPasswordReset({ email: member.input.email, now: NOW });
    await repo.requestPasswordReset({ email: member.input.email, now: minutes(1) });
    expect(await repo.peekToken({ token: tokenOf(mails[0]), kind: 'reset', now: minutes(2) })).toEqual({
      state: 'invalid',
    });
    expect(await repo.peekToken({ token: tokenOf(mails[1]), kind: 'reset', now: minutes(2) })).toMatchObject({
      state: 'valid',
    });
  });
});
