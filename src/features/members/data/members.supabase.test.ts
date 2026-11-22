import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedId } from '../../../../scripts/generate-seed';
import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { NotImplementedError } from '@/shared/data/select-implementation';
import type { MineContext, SelfEdit } from '../types';
import { describeMembersRepository } from './members.repository.contract';
import { createSupabaseMembersRepository } from './members.supabase';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

/** The seed derives every id from the fixture id; the prefix says which table it belongs to. */
const TABLES: Record<string, string> = {
  'u-': 'auth.users',
  't-': 'teams',
  'b-': 'badges',
  'role-': 'board_roles',
};
const seeded = (id: string) => {
  const prefix = Object.keys(TABLES).find((candidate) => id.startsWith(candidate));
  return prefix ? seedId(TABLES[prefix]!, id) : id;
};

let editor: TestUser;
let member: TestUser;
let manager: TestUser;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Contract Editor' });
  member = await createTestUser({ member: 'active', name: 'Contract Member' });
  manager = await createTestUser({ role: 'event_manager' });
});
afterAll(async () => {
  await editor.cleanup();
  await member.cleanup();
  await manager.cleanup();
});

const repoFor = (client: ReturnType<typeof anonClient>) => createSupabaseMembersRepository(client, 'session');
const NOW = new Date('2026-10-04T16:18:00Z');
const query = { sort: 'name' as const, page: 1, pageSize: 200 };

// "My profile" needs real accounts (below); the rest of the contract runs as the board.
describeMembersRepository('supabase', () => repoFor(editor.client()), { ids: seeded, mine: false });

describe('MembersRepository (supabase, visitor and member)', () => {
  it('shows a visitor the public profiles only, counts the members-only ones, and gives their restricted page', async () => {
    const visitor = repoFor(anonClient());
    const list = await visitor.listActive('visitor', query, 2026);
    expect(list.items.every((item) => !item.membersOnly)).toBe(true);
    expect(list.hiddenCount).toBeGreaterThan(0);
    expect(list.items.map((item) => item.name)).not.toContain('Marija Stojanovska');
    expect(await visitor.getProfile('visitor', 'marija-stojanovska', 2026)).toMatchObject({
      kind: 'restricted',
      name: 'Marija Stojanovska',
      userId: seeded('u-marija'),
    });
    expect(await visitor.getProfile('visitor', 'daniel-ristov', 2026)).toMatchObject({ kind: 'full' });
    expect(await visitor.getProfile('visitor', 'elena-petrovska', 2026)).toBeNull();
    expect(await visitor.listPublicUsernames()).toContain('daniel-ristov');
    expect(await visitor.listPublicUsernames()).not.toContain('marija-stojanovska');
  });

  it('shows a signed-in member the members-only profiles too, and nothing is hidden from them', async () => {
    const asMember = repoFor(member.client());
    const list = await asMember.listActive('member', query, 2026);
    expect(list.items.map((item) => item.name)).toContain('Marija Stojanovska');
    expect(list.hiddenCount).toBe(0);
    expect(await asMember.getProfile('member', 'marija-stojanovska', 2026)).toMatchObject({ kind: 'full' });
    // Private facts stay private: the faculty is only for the person and the board.
    const full = await asMember.getProfile('member', 'marija-stojanovska', 2026);
    expect(full?.kind === 'full' && full.profile.faculty).toBe('');
  });

  it('shows the board of the current year to everybody, and links a seat only where the page may be opened', async () => {
    const board = await repoFor(anonClient()).getBoard();
    expect(board.selected?.isCurrent).toBe(true);
    expect(board.selected?.seats.length).toBeGreaterThan(0);
  });

  it('gives authors their name always, and the page and photo only as far as the audience may see', async () => {
    const ids = [seeded('u-marija'), seeded('u-daniel')];
    const visitor = await repoFor(anonClient()).findAuthors('visitor', ids);
    const byName = Object.fromEntries(visitor.map((author) => [author.name, author]));
    expect(byName['Marija Stojanovska']).toMatchObject({ page: 'restricted', bio: '', photo: null });
    expect(byName['Daniel Ristov']).toMatchObject({ page: 'full' });
    expect(
      (await repoFor(member.client()).findAuthors('member', ids)).every((author) => author.page === 'full'),
    ).toBe(true);
  });

  it('refuses everything the board does to a visitor, a member and an event manager', async () => {
    for (const client of [anonClient(), member.client(), manager.client()]) {
      const repo = repoFor(client);
      await expect(repo.saveTeam({ name: { mk: `Nope ${crypto.randomUUID()}` } })).rejects.toMatchObject({
        kind: 'forbidden',
      });
      await expect(
        repo.saveBadge({
          name: { mk: `Nope ${crypto.randomUUID()}` },
          description: { mk: '' },
          icon: 'star',
        }),
      ).rejects.toMatchObject({ kind: 'forbidden' });
      await expect(
        repo.saveMandate({
          label: '3000/3001',
          startsOn: '3000-10-01',
          endsOn: '3001-09-30',
          isCurrent: false,
        }),
      ).rejects.toMatchObject({ kind: 'forbidden' });
      await expect(
        repo.saveProfile(
          seeded('u-viktor'),
          {
            status: 'hidden',
            memberSince: '2020-01-01',
            activeTo: null,
            teams: [],
            badges: [],
            events: [],
            alumniNow: null,
            alumniHighlight: null,
            hidePhoto: false,
            hideBio: false,
          },
          NOW,
        ),
      ).rejects.toMatchObject({ kind: 'forbidden' });
    }
  });

  it('lets only the board see inactive and hidden profiles', async () => {
    const asBoard = await repoFor(editor.client()).adminList({ ...query, status: 'inactive' });
    const asMember = await repoFor(member.client()).adminList({ ...query, status: 'inactive' });
    expect(asBoard.total).toBeGreaterThanOrEqual(asMember.total);
    expect(asMember.items).toEqual([]);
  });

  it('keeps the public photo address of a seeded profile or none, never a storage address', async () => {
    const list = await repoFor(member.client()).listActive('member', query, 2026);
    for (const item of list.items)
      expect(item.photo === null || item.photo.src === null || !item.photo.src.includes('storage')).toBe(
        true,
      );
  });
});

describe('MembersRepository (supabase, my profile)', () => {
  const created: TestUser[] = [];
  afterAll(async () => {
    for (const user of created) {
      await serviceClient().from('cv_export_log').delete().eq('profile_id', user.id);
      await user.cleanup();
    }
  });

  /** A real account: an Auth user, a profile row (as sign-up makes it) and its private account row. */
  async function person(status: 'pending' | 'active' = 'active') {
    const user = await createTestUser({ member: status, name: 'Test Person' });
    created.push(user);
    const { error } = await serviceClient().from('member_accounts').insert({
      profile_id: user.id,
      faculty: 'FEEIT',
      year_of_study: '2',
      data_consent_at: NOW.toISOString(),
    });
    if (error) throw error;
    const username = (await serviceClient().from('profiles').select('username').eq('id', user.id).single())
      .data!.username;
    const who: MineContext = {
      userId: user.id,
      name: 'Test Person',
      username,
      faculty: 'FEEIT',
      visibility: 'members_only',
      photoUrl: null,
      since: '2026-10-05',
      pending: status === 'pending',
    };
    return { user, who, repo: repoFor(user.client()) };
  }
  const edit = (who: MineContext, patch: Partial<SelfEdit> = {}): SelfEdit => ({
    name: who.name,
    username: who.username,
    bio: '',
    linkedinUrl: '',
    githubUrl: '',
    faculty: who.faculty,
    ...patch,
  });

  it('starts from the profile row sign-up made, with every choice off and nothing sent to partners', async () => {
    const { who, repo } = await person();
    const mine = await repo.getMine(who, 2026);
    expect(mine.profile).toMatchObject({
      name: 'Test Person',
      username: who.username,
      visibility: 'members_only',
      faculty: 'FEEIT',
    });
    expect(mine.consents).toEqual({
      newsletter: false,
      galleryName: false,
      cvOptIn: false,
      cvConsentAt: null,
    });
    expect(mine).toMatchObject({ pending: false, cv: null, cvViewsThisYear: 0 });
  });

  it('counts the times partners got the CV this year (Skopje year)', async () => {
    const { user, who, repo } = await person();
    await serviceClient()
      .from('cv_export_log')
      .insert({ profile_id: user.id, sponsor_name: 'Sponsor', exported_at: new Date().toISOString() });
    expect((await repo.getMine(who, new Date().getUTCFullYear())).cvViewsThisYear).toBe(1);
    expect((await repo.getMine(who, 1999)).cvViewsThisYear).toBe(0);
  });

  it('falls back to what sign-up gave when there is no profile row yet', async () => {
    const user = await createTestUser();
    created.push(user);
    const who: MineContext = {
      userId: user.id,
      name: 'No Row',
      username: 'no-row',
      faculty: 'FINKI',
      visibility: 'public',
      photoUrl: null,
      since: '2026-10-05',
      pending: true,
    };
    const mine = await repoFor(user.client()).getMine(who, 2026);
    expect(mine.profile).toMatchObject({ name: 'No Row', visibility: 'public', status: 'inactive' });
    await expect(repoFor(user.client()).updateMine(who, edit(who))).rejects.toMatchObject({
      kind: 'not_found',
    });
  });

  it('saves the edits all at once and members then see them; the old address is gone', async () => {
    const { who, repo } = await person();
    const username = `new-${crypto.randomUUID().slice(0, 6)}`;
    const result = await repo.updateMine(
      who,
      edit(who, {
        name: 'Renamed Person',
        bio: 'Hello',
        githubUrl: 'https://github.com/test',
        username,
        faculty: 'FINKI',
      }),
    );
    expect(result.status).toBe('saved');
    expect((await repo.getMine(who, 2026)).profile).toMatchObject({
      name: 'Renamed Person',
      bio: 'Hello',
      username,
      faculty: 'FINKI',
    });
    expect(await repoFor(member.client()).getProfile('member', username, 2026)).toMatchObject({
      kind: 'full',
      profile: { bio: 'Hello' },
    });
    expect(await repoFor(member.client()).getProfile('member', who.username, 2026)).toBeNull();
  });

  it("refuses an address another profile has (any letter case) or that is reserved, and keeps one's own", async () => {
    const { who, repo } = await person();
    expect(await repo.updateMine(who, edit(who, { username: 'marija-stojanovska' }))).toEqual({
      status: 'username_taken',
    });
    expect(await repo.updateMine(who, edit(who, { username: 'admin' }))).toEqual({
      status: 'username_reserved',
    });
    expect(await repo.usernameAvailable(who.userId, 'Marija-Stojanovska')).toBe(false);
    expect(await repo.usernameAvailable(who.userId, who.username)).toBe(true);
    expect(await repo.usernameAvailable(who.userId, `free-${crypto.randomUUID().slice(0, 6)}`)).toBe(true);
    expect((await repo.updateMine(who, edit(who))).status).toBe('saved');
  });

  it('keeps what a person waiting for the board writes on their own profile, invisible to others, until they are approved', async () => {
    const { user, who, repo } = await person('pending');
    await repo.updateMine(who, edit(who, { bio: 'Waiting bio' }));
    await repo.setVisibility(who, 'public');
    expect(await repo.getMine(who, 2026)).toMatchObject({
      pending: true,
      profile: { bio: 'Waiting bio', visibility: 'public', status: 'inactive' },
    });
    expect(await repoFor(member.client()).getProfile('member', who.username, 2026)).toBeNull();
    expect(await repoFor(anonClient()).getProfile('visitor', who.username, 2026)).toBeNull();
    // The board approves them (Approvals): the same profile goes live with the draft.
    await serviceClient().from('profiles').update({ status: 'active' }).eq('id', user.id);
    expect(await repoFor(anonClient()).getProfile('visitor', who.username, 2026)).toMatchObject({
      kind: 'full',
      profile: { bio: 'Waiting bio', visibility: 'public' },
    });
    expect((await repo.getMine(who, 2026)).pending).toBe(false);
  });

  it('changes only your own visibility', async () => {
    const { who, repo } = await person();
    await repo.setVisibility(who, 'public');
    expect((await repo.getMine(who, 2026)).profile.visibility).toBe('public');
    const other = await person();
    await expect(repo.setVisibility({ ...who, userId: other.who.userId }, 'public')).rejects.toMatchObject({
      kind: 'not_found',
    });
    expect((await other.repo.getMine(other.who, 2026)).profile.visibility).toBe('members_only');
  });

  it('records when CV sharing was turned on (database clock), keeps the date when turned on again, forgets it when turned off', async () => {
    const { who, repo } = await person();
    const on = await repo.setConsents(who.userId, { cvOptIn: true, newsletter: true }, NOW);
    expect(on).toMatchObject({ newsletter: true, galleryName: false, cvOptIn: true });
    expect(Math.abs(Date.now() - Date.parse(on.cvConsentAt!))).toBeLessThan(60_000);
    const again = await repo.setConsents(who.userId, { cvOptIn: true }, new Date(Date.now() + 60_000));
    expect(again.cvConsentAt).toBe(on.cvConsentAt);
    const off = await repo.setConsents(who.userId, { cvOptIn: false }, NOW);
    expect(off).toMatchObject({ cvOptIn: false, cvConsentAt: null, newsletter: true });
    expect(await repo.setConsents(who.userId, {}, NOW)).toEqual(off);
  });

  it('changes nobody else’s choices', async () => {
    const mine = await person();
    const other = await person();
    await mine.repo.setConsents(other.who.userId, { newsletter: true }, NOW);
    expect((await other.repo.getMine(other.who, 2026)).consents.newsletter).toBe(false);
  });

  const jpeg = (last: number) => new Uint8Array([0xff, 0xd8, 0xff, last]);
  const pdf = (last: number) => new Uint8Array([37, 80, 68, 70, 45, last]);
  const folder = async (bucket: string, userId: string) =>
    (await serviceClient().storage.from(bucket).list(userId)).data ?? [];
  const queued = async (bucket: string, path: string) =>
    (
      await serviceClient()
        .from('storage_cleanup_queue')
        .select('reason')
        .eq('bucket', bucket)
        .eq('path', path)
    ).data ?? [];

  it('stores a photo in the person’s own folder and says where it is delivered from', async () => {
    const { who, repo } = await person();
    const { src } = await repo.savePhoto(who, { mimeType: 'image/jpeg', bytes: jpeg(1) });
    expect(src).toMatch(new RegExp(`^/api/member-photos/${who.userId}/[0-9a-f-]{36}\\.jpg$`));
    expect((await repo.getMine(who, 2026)).profile.photo).toEqual({ src });
    expect(await repo.getPhotoFile(who)).toEqual({ mimeType: 'image/jpeg', bytes: jpeg(1) });
    expect(await folder('avatars', who.userId)).toHaveLength(1);
  });

  it('delivers a photo only to those who may see the profile, and a refusal looks like a missing file', async () => {
    const { who, repo } = await person();
    const { src } = await repo.savePhoto(who, { mimeType: 'image/jpeg', bytes: jpeg(2) });
    const path = src!.slice('/api/member-photos/'.length);
    const sees = (client: ReturnType<typeof anonClient>) => repoFor(client).avatarFile(path);
    const file = { mimeType: 'image/jpeg', bytes: jpeg(2) };
    // Members only: the owner, other members and staff, not a visitor or another person's request for a made-up path.
    expect(await sees(anonClient())).toBeNull();
    expect(await sees(member.client())).toEqual(file);
    expect(await sees(editor.client())).toEqual(file);
    expect(await repo.avatarFile(path)).toEqual(file);
    expect(await sees(member.client())).toEqual(file);
    expect(await repo.avatarFile(`${who.userId}/${crypto.randomUUID()}.jpg`)).toBeNull();
    expect(await repo.avatarFile('../etc/passwd')).toBeNull();
    // Public: everyone. A hidden photo: only the owner and staff.
    await repo.setVisibility(who, 'public');
    expect(await sees(anonClient())).toEqual(file);
    await serviceClient().from('profiles').update({ hide_photo: true }).eq('id', who.userId);
    expect(await sees(anonClient())).toBeNull();
    expect(await sees(member.client())).toBeNull();
    expect(await repo.avatarFile(path)).toEqual(file);
    expect(await sees(editor.client())).toEqual(file);
  });

  it('replaces a photo (the old file goes and is queued) and removes it', async () => {
    const { who, repo } = await person();
    const first = (await repo.savePhoto(who, { mimeType: 'image/jpeg', bytes: jpeg(1) })).src!;
    const second = (await repo.savePhoto(who, { mimeType: 'image/jpeg', bytes: jpeg(2) })).src!;
    expect(second).not.toBe(first);
    expect(await repo.getPhotoFile(who)).toEqual({ mimeType: 'image/jpeg', bytes: jpeg(2) });
    expect(await repo.avatarFile(first.slice('/api/member-photos/'.length))).toBeNull();
    expect(await folder('avatars', who.userId)).toHaveLength(1);
    expect(await queued('avatars', first.slice('/api/member-photos/'.length))).toHaveLength(1);
    expect(await repo.savePhoto(who, null)).toEqual({ src: null });
    expect((await repo.getMine(who, 2026)).profile.photo).toBeNull();
    expect(await repo.getPhotoFile(who)).toBeNull();
    expect(await folder('avatars', who.userId)).toHaveLength(0);
    expect(await repo.savePhoto(who, null)).toEqual({ src: null });
  });

  it('cannot put a photo into someone else’s folder or onto someone else’s profile', async () => {
    const mine = await person();
    const other = await person();
    await expect(
      mine.repo.savePhoto(
        { ...mine.who, userId: other.who.userId },
        { mimeType: 'image/jpeg', bytes: jpeg(3) },
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(await folder('avatars', other.who.userId)).toHaveLength(0);
    expect((await other.repo.getMine(other.who, 2026)).profile.photo).toBeNull();
  });

  it('takes a CV only while sharing is on, keeps it in the person’s folder and hands it back', async () => {
    const { who, repo } = await person();
    const file = { fileName: 'cv.pdf', bytes: pdf(1) };
    expect(await repo.storeCv(who.userId, file, NOW)).toEqual({ status: 'not_opted_in' });
    expect(await folder('cvs', who.userId)).toHaveLength(0);
    await repo.setConsents(who.userId, { cvOptIn: true }, NOW);
    expect(await repo.storeCv(who.userId, file, NOW)).toEqual({
      status: 'stored',
      cv: { fileName: 'cv.pdf', size: 6, uploadedAt: NOW.toISOString() },
    });
    expect((await repo.getMine(who, 2026)).cv).toEqual({
      fileName: 'cv.pdf',
      size: 6,
      uploadedAt: NOW.toISOString(),
    });
    expect(await repo.getCvFile(who.userId)).toEqual({ fileName: 'cv.pdf', size: 6, bytes: pdf(1) });
    // Nobody else reads it through Storage: not another member, not staff.
    const path = (await folder('cvs', who.userId))[0]!.name;
    for (const other of [member, editor])
      expect(
        (await other.client().storage.from('cvs').download(`${who.userId}/${path}`)).error,
      ).not.toBeNull();
    expect(await repoFor(member.client()).getCvFile(who.userId)).toBeNull();
  });

  it('replaces the CV (the old file goes and is queued) and removes it, leaving sharing on', async () => {
    const { who, repo } = await person();
    await repo.setConsents(who.userId, { cvOptIn: true }, NOW);
    await repo.storeCv(who.userId, { fileName: 'a.pdf', bytes: pdf(1) }, NOW);
    const first = `${who.userId}/${(await folder('cvs', who.userId))[0]!.name}`;
    await repo.storeCv(who.userId, { fileName: 'b.pdf', bytes: pdf(2) }, NOW);
    expect(await folder('cvs', who.userId)).toHaveLength(1);
    expect(await queued('cvs', first)).toHaveLength(1);
    expect(await repo.getCvFile(who.userId)).toMatchObject({ fileName: 'b.pdf', bytes: pdf(2) });
    expect(await repo.removeCv(who.userId)).toBe(true);
    expect(await repo.removeCv(who.userId)).toBe(false);
    expect(await folder('cvs', who.userId)).toHaveLength(0);
    expect(await repo.getCvFile(who.userId)).toBeNull();
    expect((await repo.getMine(who, 2026)).consents.cvOptIn).toBe(true);
  });

  it('deletes the CV file at once when CV sharing is turned off', async () => {
    const { who, repo } = await person();
    await repo.setConsents(who.userId, { cvOptIn: true }, NOW);
    await repo.storeCv(who.userId, { fileName: 'a.pdf', bytes: pdf(1) }, NOW);
    const path = `${who.userId}/${(await folder('cvs', who.userId))[0]!.name}`;
    await repo.setConsents(who.userId, { cvOptIn: false }, NOW);
    expect(await folder('cvs', who.userId)).toHaveLength(0);
    expect(await repo.getCvFile(who.userId)).toBeNull();
    expect((await repo.getMine(who, 2026)).cv).toBeNull();
    expect(await queued('cvs', path)).toHaveLength(1);
  });

  it('leaves the account deletion to the part that owns it (M20i)', async () => {
    const { who, repo } = await person();
    await expect(repo.deleteMine(who.userId)).rejects.toBeInstanceOf(NotImplementedError);
  });
});
