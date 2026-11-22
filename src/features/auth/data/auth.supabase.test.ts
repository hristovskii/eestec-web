import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { NotImplementedError } from '@/shared/data/select-implementation';
import { createSupabaseAuthRepository } from './auth.supabase';
import type { SignInDeps } from './auth.supabase-sign-in';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
type Client = ReturnType<typeof anonClient>;

const NOW = new Date('2026-10-05T08:00:00.000Z');
const unique = () => crypto.randomUUID().slice(0, 8);
// Signing in is tested in auth.supabase-sign-in.test.ts; here the sign-in wiring is never used.
const unused: SignInDeps = {
  service: () => {
    throw new Error('not used');
  },
  signInClient: () => Promise.reject(new Error('not used')),
  rememberChoice: () => Promise.resolve(),
};
const repoFor = (client: Client) => createSupabaseAuthRepository(client, 'session', unused);

const created: TestUser[] = [];
const track = async <T extends TestUser>(user: Promise<T>) => {
  const made = await user;
  created.push(made);
  return made;
};

let superAdmin: TestUser;
let editor: TestUser;
let manager: TestUser;
let member: TestUser;
let event: string;

beforeAll(async () => {
  superAdmin = await track(createTestUser({ role: 'super_admin', name: 'Auth Super' }));
  editor = await track(createTestUser({ role: 'editor', name: 'Auth Editor' }));
  manager = await track(createTestUser({ role: 'event_manager', name: 'Auth Manager' }));
  member = await track(createTestUser({ member: 'active', name: 'Auth Member' }));
  // An event of our own: editing the managers of a sample event would make it a real one, and its sample text
  // does not pass the checks of a real event.
  const type = (await serviceClient().from('event_types').select('id').limit(1).single()).data!;
  const localized = { mk: 'Тест', en: 'Test' };
  const made = await serviceClient()
    .from('events')
    .insert({
      slug: `auth-test-${unique()}`,
      title: localized,
      short_description: localized,
      scope: 'local',
      type_id: type.id,
      starts_at: '2031-01-01T10:00:00Z',
      ends_at: '2031-01-01T12:00:00Z',
      location: localized,
      city: localized,
      country: localized,
      description: localized,
      requirements: localized,
      seo_title: localized,
      seo_description: localized,
      status: 'draft',
    })
    .select('id')
    .single();
  if (made.error) throw made.error;
  event = made.data.id;
  await serviceClient().from('event_managers').insert({ event_id: event, user_id: manager.id });
  await serviceClient().from('member_accounts').insert({
    profile_id: member.id,
    faculty: 'FEEIT',
    year_of_study: '2',
    phone: '070 111 222',
    data_consent_at: NOW.toISOString(),
  });
});
afterAll(async () => {
  await serviceClient().from('event_managers').delete().eq('event_id', event);
  for (const user of created) await user.cleanup();
  await serviceClient().from('events').delete().eq('id', event);
});

/** A sign-up as it looks in the database: a profile, its private row and an Auth account that may be unconfirmed. */
async function registration(options: { confirmed: boolean; name?: string }) {
  const tag = unique();
  const service = serviceClient();
  const email = `registration-${tag}@example.invalid`;
  const made = await service.auth.admin.createUser({ email, email_confirm: options.confirmed });
  if (made.error || !made.data.user) throw made.error ?? new Error('no user');
  const id = made.data.user.id;
  const name = options.name ?? `Registrant ${tag}`;
  await service.from('profiles').insert({ id, username: `reg-${tag}`, full_name: name, status: 'pending' });
  await service.from('member_accounts').insert({
    profile_id: id,
    faculty: 'FINKI',
    year_of_study: '3',
    phone: '071 000 000',
    data_consent_at: NOW.toISOString(),
    registration_locale: 'en',
  });
  created.push({
    id,
    email,
    client: () => anonClient(),
    async cleanup() {
      await service.from('profiles').delete().eq('id', id);
      await service.auth.admin.deleteUser(id);
    },
  });
  return { id, email, name, tag };
}

describe('AuthRepository (supabase, who is signed in)', () => {
  it('knows nobody for a visitor', async () => {
    expect(await repoFor(anonClient()).getSession()).toBeNull();
  });

  it('describes a member by their account, profile and teams', async () => {
    const session = await repoFor(member.client()).getSession();
    expect(session).toMatchObject({
      userId: member.id,
      email: member.email,
      name: 'Auth Member',
      memberStatus: 'active',
      adminRole: null,
      managedEventIds: [],
    });
    expect(session?.initials).toBe('AM');
    expect(session?.headline).toMatch(/^member since \d{4}$/);
  });

  it('describes board accounts by the role the access rules see: a super admin counts only with 2-step', async () => {
    expect((await repoFor(editor.client()).getSession())?.adminRole).toBe('editor');
    expect((await repoFor(editor.client()).getSession())?.memberStatus).toBeNull();
    expect((await repoFor(superAdmin.client('aal1')).getSession())?.adminRole).toBeNull();
    expect((await repoFor(superAdmin.client('aal2')).getSession())?.adminRole).toBe('super_admin');
    expect(await repoFor(manager.client()).getSession()).toMatchObject({
      adminRole: 'event_manager',
      managedEventIds: [event],
    });
  });

  it('knows nobody once the account is being deleted', async () => {
    const user = await track(createTestUser({ member: 'active', name: 'Going Away' }));
    expect(await repoFor(user.client()).getSession()).not.toBeNull();
    await serviceClient()
      .from('account_deletion_jobs')
      .insert({ user_id: user.id, delete_published_memories: false });
    expect(await repoFor(user.client()).getSession()).toBeNull();
    await serviceClient().from('account_deletion_jobs').delete().eq('user_id', user.id);
  });

  it('leaves links, passwords and invites to M21', async () => {
    const repo = repoFor(anonClient());
    await expect(repo.verifyPassword({ userId: member.id, password: 'x', now: NOW })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
    await expect(
      repo.inviteAdmin({ name: 'A B', email: 'a@b.c', role: 'editor', managedEventIds: [], now: NOW }),
    ).rejects.toBeInstanceOf(NotImplementedError);
    await expect(repo.deleteAccount({ userId: member.id, now: NOW })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });
});

describe('AuthRepository (supabase, my account)', () => {
  it('reads and changes the member’s own details', async () => {
    const repo = repoFor(member.client());
    expect(await repo.getAccountDetails(member.id)).toMatchObject({
      userId: member.id,
      email: member.email,
      phone: '070 111 222',
      year: '2',
    });
    expect(
      await repo.updateAccountDetails(member.id, { phone: '  075 999 888 ', year: 'master' }),
    ).toMatchObject({
      phone: '075 999 888',
      year: 'master',
    });
    expect(await repo.updateAccountDetails(crypto.randomUUID(), { phone: '1' })).toBeNull();
    expect(await repo.getAccountDetails('not-an-id')).toBeNull();
  });

  it('keeps one person’s details from another, but not from the board', async () => {
    const other = await track(createTestUser({ member: 'active', name: 'Other Member' }));
    expect(await repoFor(other.client()).getAccountDetails(member.id)).toBeNull();
    expect(await repoFor(other.client()).updateAccountDetails(member.id, { phone: '000' })).toBeNull();
    expect((await repoFor(editor.client()).getAccountDetails(member.id))?.email).toBe(member.email);
    expect(
      await repoFor(anonClient())
        .getAccountDetails(member.id)
        .catch(() => 'refused'),
    ).toBe('refused');
  });

  it('changes the name and address, and says when the address is taken', async () => {
    const repo = repoFor(member.client());
    const address = `renamed-${unique()}`;
    expect(await repo.updateIdentity(member.id, { name: '  Renamed Member ', username: address })).toBe('ok');
    const session = await repo.getSession();
    expect(session).toMatchObject({ name: 'Renamed Member', username: address });
    const other = await track(createTestUser({ member: 'active', name: 'Taken Address' }));
    const taken = (await serviceClient().from('profiles').select('username').eq('id', other.id).single())
      .data!.username;
    expect(await repo.updateIdentity(member.id, { username: taken })).toBe('taken');
    expect(await repo.usernameTaken(member.id, taken.toUpperCase())).toBe(true);
    expect(await repo.usernameTaken(member.id, address)).toBe(false);
    expect(await repo.updateIdentity(crypto.randomUUID(), { name: 'Nobody Here' })).toBe('not_found');
    await repo.updateIdentity(member.id, { name: 'Auth Member' });
  });

  it('exports what the account holds', async () => {
    const exported = await repoFor(member.client()).exportAccount(member.id);
    expect(exported).toMatchObject({ account: { userId: member.id, email: member.email } });
    expect(typeof exported?.details.phone).toBe('string');
    expect(await repoFor(member.client()).exportAccount(crypto.randomUUID())).toBeNull();
  });
});

describe('AuthRepository (supabase, member registrations)', () => {
  it('lists registrations for the board, oldest first, with what the person entered', async () => {
    const waiting = await registration({ confirmed: true });
    const unconfirmed = await registration({ confirmed: false });
    const rows = await repoFor(editor.client()).listRegistrations();
    const mine = rows.find((row) => row.userId === waiting.id);
    expect(mine).toMatchObject({
      name: waiting.name,
      email: waiting.email,
      faculty: 'FINKI',
      year: '3',
      phone: '071 000 000',
      visibility: 'members',
      status: 'pending',
      locale: 'en',
      photoId: null,
      photoSrc: null,
      decidedAt: null,
    });
    expect(rows.find((row) => row.userId === unconfirmed.id)?.status).toBe('awaiting_confirmation');
    expect(rows.map((row) => row.submittedAt)).toEqual([...rows.map((row) => row.submittedAt)].sort());
    expect(
      (await repoFor(editor.client()).listRegistrations({ status: 'pending' })).every(
        (row) => row.status === 'pending',
      ),
    ).toBe(true);
    expect(await repoFor(editor.client()).getRegistration(waiting.id)).toEqual(mine);
    expect(await repoFor(editor.client()).getRegistration('not-an-id')).toBeNull();
  });

  it('shows a person their own registration only, and a visitor none', async () => {
    const own = await repoFor(member.client()).listRegistrations();
    expect(own.map((row) => row.userId)).toEqual([member.id]);
    expect(own[0]?.status).toBe('active');
    expect(
      await repoFor(member.client()).getRegistration((await registration({ confirmed: true })).id),
    ).toBeNull();
    expect(
      await repoFor(anonClient())
        .listRegistrations()
        .catch(() => 'refused'),
    ).toBe('refused');
  });

  it('approves, so the profile goes live, and refuses to decide twice', async () => {
    const person = await registration({ confirmed: true });
    const result = await repoFor(editor.client()).decideRegistration({
      userId: person.id,
      decision: 'approve',
      reason: '',
      now: NOW,
    });
    expect(result).toMatchObject({ status: 'decided', registration: { status: 'active' } });
    const profile = (
      await serviceClient().from('profiles').select('status, member_since').eq('id', person.id).single()
    ).data;
    expect(profile).toMatchObject({ status: 'active' });
    expect(profile?.member_since).toBeTruthy();
    expect(
      await repoFor(editor.client()).decideRegistration({
        userId: person.id,
        decision: 'reject',
        reason: '',
        now: NOW,
      }),
    ).toEqual({ status: 'already_decided' });
  });

  it('rejects with the reason, and does not decide someone who has not confirmed the e-mail', async () => {
    const person = await registration({ confirmed: true });
    const result = await repoFor(editor.client()).decideRegistration({
      userId: person.id,
      decision: 'reject',
      reason: 'Not a student',
      now: NOW,
    });
    expect(result).toMatchObject({
      status: 'decided',
      registration: { status: 'rejected', rejectionReason: 'Not a student' },
    });
    const unconfirmed = await registration({ confirmed: false });
    expect(
      await repoFor(editor.client()).decideRegistration({
        userId: unconfirmed.id,
        decision: 'approve',
        reason: '',
        now: NOW,
      }),
    ).toEqual({ status: 'already_decided' });
    expect(
      await repoFor(editor.client()).decideRegistration({
        userId: crypto.randomUUID(),
        decision: 'approve',
        reason: '',
        now: NOW,
      }),
    ).toEqual({ status: 'not_found' });
  });

  it('lets only the board decide: anyone else cannot even see the registration', async () => {
    const person = await registration({ confirmed: true });
    for (const who of [member.client(), manager.client(), anonClient()]) {
      const outcome = await repoFor(who)
        .decideRegistration({ userId: person.id, decision: 'approve', reason: '', now: NOW })
        .catch(() => 'refused');
      expect(['refused', 'not_found']).toContain(typeof outcome === 'string' ? outcome : outcome.status);
    }
    expect(
      (await serviceClient().from('profiles').select('status').eq('id', person.id).single()).data?.status,
    ).toBe('pending');
  });

  it('counts the people waiting for the board, and derives no profiles from them', async () => {
    const person = await registration({ confirmed: true });
    const summary = await repoFor(editor.client()).pendingRegistrationSummary();
    expect(summary.count).toBeGreaterThanOrEqual(1);
    expect(summary.oldestAt).not.toBeNull();
    expect(await repoFor(editor.client()).approvedMemberIdentities()).toEqual([]);
    void person;
  });
});

describe('AuthRepository (supabase, Admin users and roles)', () => {
  it('lists everyone with a board role to a super admin with 2-step, and to nobody else', async () => {
    const accounts = await repoFor(superAdmin.client('aal2')).listAdmins();
    const roles = Object.fromEntries(accounts.map((account) => [account.userId, account.role]));
    expect(roles).toMatchObject({
      [superAdmin.id]: 'super_admin',
      [editor.id]: 'editor',
      [manager.id]: 'event_manager',
    });
    expect(accounts.find((account) => account.userId === manager.id)).toMatchObject({
      name: 'Auth Manager',
      email: manager.email,
      initials: 'AM',
      managedEventIds: [event],
      twoFactor: 'off',
    });
    expect(accounts.find((account) => account.userId === superAdmin.id)?.twoFactor).toBe('not_set_up');
    const order = accounts.map((account) => ['super_admin', 'editor', 'event_manager'].indexOf(account.role));
    expect(order).toEqual([...order].sort());
    for (const who of [
      superAdmin.client('aal1'),
      editor.client(),
      manager.client(),
      member.client(),
      anonClient(),
    ])
      await expect(repoFor(who).listAdmins()).rejects.toBeTruthy();
  });

  it('changes a role and the events an event manager looks after, and clears them when the role changes', async () => {
    const person = await track(createTestUser({ role: 'event_manager', name: 'Role Person' }));
    const repo = repoFor(superAdmin.client('aal2'));
    const updated = await repo.updateAdmin(person.id, { managedEventIds: [event] });
    expect(updated).toMatchObject({ role: 'event_manager', managedEventIds: [event] });
    expect((await repoFor(person.client()).getSession())?.managedEventIds).toEqual([event]);
    expect(await repo.updateAdmin(person.id, { managedEventIds: [] })).toMatchObject({ managedEventIds: [] });
    await repo.updateAdmin(person.id, { managedEventIds: [event] });
    expect(await repo.updateAdmin(person.id, { role: 'editor' })).toMatchObject({
      role: 'editor',
      managedEventIds: [],
    });
    expect(await repo.updateAdmin(crypto.randomUUID(), { role: 'editor' })).toBeNull();
    await expect(
      repoFor(editor.client()).updateAdmin(person.id, { role: 'super_admin' }),
    ).rejects.toBeTruthy();
  });

  it('removes board access and leaves the member account', async () => {
    const person = await track(createTestUser({ role: 'editor', member: 'active', name: 'Leaving Board' }));
    const repo = repoFor(superAdmin.client('aal2'));
    expect(await repo.removeAdmin(person.id)).toBe(true);
    expect(await repo.removeAdmin(person.id)).toBe(false);
    expect(await repoFor(person.client()).getSession()).toMatchObject({
      adminRole: null,
      memberStatus: 'active',
    });
    await expect(repoFor(editor.client()).removeAdmin(person.id)).rejects.toBeTruthy();
  });
});
