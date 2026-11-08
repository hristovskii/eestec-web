import { describe, expect, it } from 'vitest';

import type { ActiveMembersQuery, AdminMembersQuery, Profile, ProfileEdit } from '../types';
import type { MembersRepository } from './members.repository';

// Runs against every implementation (mock now, Supabase later). Read-only: the sample data decides
// the numbers, so these tests state rules, not exact counts (except where the canvas fixes them).

const query = (patch: Partial<ActiveMembersQuery> = {}): ActiveMembersQuery => ({
  sort: 'name',
  page: 1,
  pageSize: 100,
  ...patch,
});

const adminQuery = (patch: Partial<AdminMembersQuery> = {}): AdminMembersQuery => ({
  sort: 'name',
  page: 1,
  pageSize: 100,
  ...patch,
});

const NOW = new Date('2026-10-04T16:18:00Z');

/** What the board could edit, as it is now (to put it back after a test). */
const editOf = (profile: Profile): ProfileEdit => ({
  status: profile.status,
  memberSince: profile.memberSince,
  activeTo: profile.activeTo,
  teams: profile.teams,
  badges: profile.badges.map(({ badgeId, note }) => ({ badgeId, note })),
  events: profile.events,
  alumniNow: profile.alumniNow,
  alumniHighlight: profile.alumniHighlight,
  hidePhoto: profile.hidePhoto,
  hideBio: profile.hideBio,
});

async function adminProfile(repo: MembersRepository, username: string) {
  const { items } = await repo.adminList(adminQuery({ q: username }));
  const profile = items.find((item) => item.username === username);
  if (!profile) throw new Error(`no profile ${username}`);
  return profile;
}

/** Changes one sample profile for a test and always puts it back. */
async function withEdit(
  repo: MembersRepository,
  username: string,
  change: (before: ProfileEdit) => ProfileEdit,
  test: (profile: Profile) => Promise<void>,
) {
  const before = await adminProfile(repo, username);
  const saved = await repo.saveProfile(before.userId, change(editOf(before)), NOW);
  if (saved.status !== 'saved') throw new Error('not saved');
  try {
    await test(saved.profile);
  } finally {
    await repo.saveProfile(before.userId, editOf(before), NOW);
  }
}

export function describeMembersRepository(
  name: string,
  createRepo: () => MembersRepository | Promise<MembersRepository>,
) {
  describe(`MembersRepository (${name})`, () => {
    it('shows visitors public profiles only, and counts the members-only ones without naming them', async () => {
      const repo = await createRepo();
      const visitor = await repo.listActive('visitor', query(), 2026);
      const member = await repo.listActive('member', query(), 2026);
      expect(visitor.items.every((item) => !item.membersOnly)).toBe(true);
      expect(visitor.hiddenCount).toBeGreaterThan(0);
      expect(member.hiddenCount).toBe(0);
      expect(member.total).toBe(visitor.total + visitor.hiddenCount);
      const visitorNames = visitor.items.map((item) => item.name);
      expect(visitorNames).not.toContain('Marija Stojanovska');
      expect(member.items.map((item) => item.name)).toContain('Marija Stojanovska');
    });

    it('never lists pending people, and sorts by name by default', async () => {
      const repo = await createRepo();
      const { items } = await repo.listActive('member', query(), 2026);
      expect(items.map((item) => item.name)).not.toContain('Elena Petrovska');
      expect(items.map((item) => item.name)).toEqual(
        [...items.map((item) => item.name)].sort((a, b) => a.localeCompare(b, 'en')),
      );
    });

    it('filters by name, team and joined year, and pages', async () => {
      const repo = await createRepo();
      const byName = await repo.listActive('member', query({ q: 'marija' }), 2026);
      expect(byName.items.map((item) => item.name)).toEqual(['Marija Stojanovska']);
      const events = await repo.listActive('member', query({ team: 'events' }), 2026);
      expect(events.items.length).toBeGreaterThan(0);
      expect(events.items.every((item) => item.teams.some((team) => team.slug === 'events'))).toBe(true);
      const joined = await repo.listActive(
        'member',
        query({ joined: { year: 2026, orEarlier: false } }),
        2026,
      );
      expect(joined.items.every((item) => item.memberSince.startsWith('2026'))).toBe(true);
      const earlier = await repo.listActive(
        'member',
        query({ joined: { year: 2022, orEarlier: true } }),
        2026,
      );
      expect(earlier.items.every((item) => Number(item.memberSince.slice(0, 4)) <= 2022)).toBe(true);
      const paged = await repo.listActive('member', query({ pageSize: 5, page: 2 }), 2026);
      expect(paged.items).toHaveLength(5);
      expect(paged.page).toBe(2);
      const clamped = await repo.listActive('member', query({ pageSize: 5, page: 99 }), 2026);
      expect(clamped.page).toBe(clamped.pageCount);
    });

    it('counts a person with two teams in both and keeps the team counts when a team is chosen', async () => {
      const repo = await createRepo();
      const all = await repo.listActive('member', query(), 2026);
      const chosen = await repo.listActive('member', query({ team: 'it' }), 2026);
      expect(chosen.teamCounts.map((entry) => entry.count)).toEqual(
        all.teamCounts.map((entry) => entry.count),
      );
      const daniel = all.items.find((item) => item.name === 'Daniel Ristov');
      expect(daniel?.teams.map((team) => team.slug)).toEqual(['events', 'it']);
    });

    it('gives each card its role line', async () => {
      const repo = await createRepo();
      const { items } = await repo.listActive('member', query(), 2026);
      const role = (name: string) => items.find((item) => item.name === name)?.role;
      expect(role('Marija Stojanovska')).toBe('lead');
      expect(role('Nikola Jovanovski')).toBe('trainer');
      expect(role('Ivana Mitrevska')).toBe('new');
      expect(role('Sara Dimova')).toBe('member');
    });

    it('lists alumni, newest leavers first, with a limit and a search', async () => {
      const repo = await createRepo();
      const some = await repo.listAlumni('visitor', { limit: 3 });
      expect(some.items).toHaveLength(3);
      expect(some.total).toBeGreaterThanOrEqual(9);
      const all = await repo.listAlumni('visitor', { limit: 'all' });
      expect(all.items).toHaveLength(all.matching);
      expect(all.items[0]?.name).toBe('Katerina Angelova');
      const found = await repo.listAlumni('visitor', { q: 'bojan', limit: 'all' });
      expect(found.items.map((item) => item.name)).toEqual(['Bojan Petreski']);
      expect(found.total).toBe(all.total);
    });

    it('returns the current board first, a past board without asking, and the current one for an unknown label', async () => {
      const repo = await createRepo();
      const current = await repo.getBoard();
      expect(current.mandates[0]).toMatchObject({ label: '2026/2027', isCurrent: true });
      expect(current.selected?.seats.map((seat) => seat.name)).toEqual([
        'Ana Trajkovska',
        'Ivana Kostova',
        'Marko Iliev',
        'Elena Dimitrova',
        'Stefan Nikolovski',
      ]);
      const past = await repo.getBoard('2025/2026');
      expect(past.selected).toMatchObject({ label: '2025/2026', isCurrent: false });
      expect(past.selected?.seats[0]?.name).toBe('Bojan Petreski');
      expect((await repo.getBoard('1999/2000')).selected?.label).toBe('2026/2027');
    });

    it('opens a public profile in full, a members-only one as restricted for a visitor, and nothing else', async () => {
      const repo = await createRepo();
      expect(await repo.getProfile('visitor', 'daniel-ristov', 2026)).toMatchObject({
        kind: 'full',
        role: 'member',
      });
      const restricted = await repo.getProfile('visitor', 'marija-stojanovska', 2026);
      expect(restricted).toEqual({
        kind: 'restricted',
        userId: 'u-marija',
        username: 'marija-stojanovska',
        name: 'Marija Stojanovska',
        teams: [expect.objectContaining({ slug: 'events' })],
        memberSince: '2023-10-01',
      });
      // A restricted profile carries no bio, links, events or badges.
      expect(JSON.stringify(restricted)).not.toMatch(/burek|linkedin|ai-at-the-edge/);
      const full = await repo.getProfile('member', 'marija-stojanovska', 2026);
      expect(full).toMatchObject({ kind: 'full', role: 'lead' });
      expect(full?.kind === 'full' && full.badges.map((entry) => entry.badge.id)).toEqual([
        'b-organizer',
        'b-first-international',
        'b-team-lead',
      ]);
      expect(await repo.getProfile('member', 'elena-petrovska', 2026)).toBeNull();
      expect(await repo.getProfile('member', 'nobody-here', 2026)).toBeNull();
    });

    it('lists public usernames for the sitemap (no members-only profile)', async () => {
      const repo = await createRepo();
      const usernames = await repo.listPublicUsernames();
      expect(usernames).toContain('daniel-ristov');
      expect(usernames).toContain('bojan-petreski');
      expect(usernames).not.toContain('marija-stojanovska');
    });

    describe('admin', () => {
      it('lists every status, counts them for the tabs, and filters by name, status and team', async () => {
        const repo = await createRepo();
        const all = await repo.adminList(adminQuery());
        expect(all.counts.all).toBe(all.total);
        expect(all.counts.active + all.counts.alumni + all.counts.inactive + all.counts.hidden).toBe(
          all.counts.all,
        );
        expect(all.counts.alumni).toBeGreaterThanOrEqual(9);
        const alumni = await repo.adminList(adminQuery({ status: 'alumni' }));
        expect(alumni.items.every((item) => item.status === 'alumni')).toBe(true);
        // The tab counts ignore the status tab.
        expect(alumni.counts).toEqual(all.counts);
        const named = await repo.adminList(adminQuery({ q: 'MARIJA' }));
        expect(named.items.map((item) => item.name)).toEqual(['Marija Stojanovska']);
        expect((await repo.adminList(adminQuery({ q: 'ristov' }))).total).toBeGreaterThanOrEqual(2);
        const events = await repo.adminList(adminQuery({ team: 'events' }));
        expect(events.items.length).toBeGreaterThan(0);
        expect(events.items.every((item) => item.teams.some((entry) => entry.teamId === 't-events'))).toBe(
          true,
        );
        expect((await repo.adminList(adminQuery({ team: 'no-such-team' }))).total).toBe(0);
      });

      it('sorts by name, member since and status, and pages', async () => {
        const repo = await createRepo();
        const down = (await repo.adminList(adminQuery({ sort: '-name' }))).items.map((item) => item.name);
        expect(down).toEqual([...down].sort((a, b) => b.localeCompare(a, 'en')));
        const since = (await repo.adminList(adminQuery({ sort: 'since' }))).items.map(
          (item) => item.memberSince,
        );
        expect(since).toEqual([...since].sort());
        const status = (await repo.adminList(adminQuery({ sort: 'status' }))).items;
        expect(status[0]?.status).toBe('active');
        expect(status.at(-1)?.status).toBe('alumni');
        const second = await repo.adminList(adminQuery({ pageSize: 10, page: 2 }));
        expect(second.items).toHaveLength(10);
        expect(second.page).toBe(2);
      });

      it('offers the teams and badges to give', async () => {
        const catalog = await (await createRepo()).getCatalog();
        expect(catalog.teams.map((team) => team.slug)).toEqual(['events', 'it', 'pr', 'hr', 'fr', 'design']);
        expect(catalog.badges.map((badge) => badge.id)).toContain('b-organizer');
      });

      it('hides a profile at once from every public list and page, and shows it again when restored', async () => {
        const repo = await createRepo();
        await withEdit(
          repo,
          'viktor-trajanov',
          (edit) => ({ ...edit, status: 'hidden' }),
          async () => {
            expect(await repo.getProfile('member', 'viktor-trajanov', 2026)).toBeNull();
            expect(await repo.getProfile('visitor', 'viktor-trajanov', 2026)).toBeNull();
            const list = await repo.listActive('member', query({ q: 'viktor' }), 2026);
            expect(list.items).toEqual([]);
            expect(await repo.listPublicUsernames()).not.toContain('viktor-trajanov');
            const hidden = await repo.adminList(adminQuery({ status: 'hidden' }));
            expect(hidden.items.map((item) => item.name)).toContain('Viktor Trajanov');
          },
        );
        expect(await repo.getProfile('member', 'viktor-trajanov', 2026)).toMatchObject({ kind: 'full' });
      });

      it('changes teams, role and badges, and keeps the day a badge was awarded', async () => {
        const repo = await createRepo();
        await withEdit(
          repo,
          'viktor-trajanov',
          (edit) => ({
            ...edit,
            teams: [
              { teamId: 't-events', role: 'member' },
              { teamId: 't-it', role: 'lead' },
              { teamId: 't-gone', role: 'member' },
            ],
            badges: [
              { badgeId: 'b-trainer', note: 'Soft skills' },
              { badgeId: 'b-gone', note: '' },
            ],
          }),
          async (profile) => {
            expect(profile.teams.map((entry) => entry.teamId)).toEqual(['t-events', 't-it']);
            expect(profile.badges).toEqual([
              { badgeId: 'b-trainer', note: 'Soft skills', awardedAt: '2026-10-04' },
            ]);
            const card = (await repo.listActive('member', query({ q: 'viktor' }), 2026)).items[0];
            expect(card?.role).toBe('lead');
            expect(card?.teams.map((team) => team.slug)).toEqual(['events', 'it']);
            // Saving again later keeps the original award day.
            const again = await repo.saveProfile(
              profile.userId,
              { ...editOf(profile), badges: [{ badgeId: 'b-trainer', note: 'Soft skills 2' }] },
              new Date('2027-01-01T00:00:00Z'),
            );
            expect(again.status === 'saved' && again.profile.badges[0]?.awardedAt).toBe('2026-10-04');
          },
        );
      });

      it('moves a member to the alumni with their years and lines, and drops the lines when they are active again', async () => {
        const repo = await createRepo();
        await withEdit(
          repo,
          'viktor-trajanov',
          (edit) => ({
            ...edit,
            status: 'alumni',
            activeTo: '2026-06-30',
            alumniNow: { mk: 'Инженер', en: 'Engineer' },
            alumniHighlight: null,
          }),
          async (profile) => {
            expect(profile.alumniNow).toEqual({ mk: 'Инженер', en: 'Engineer' });
            const alumni = await repo.listAlumni('member', { q: 'viktor', limit: 'all' });
            expect(alumni.items.map((item) => item.name)).toEqual(['Viktor Trajanov']);
            const back = await repo.saveProfile(
              profile.userId,
              { ...editOf(profile), status: 'active' },
              NOW,
            );
            expect(back.status === 'saved' && [back.profile.activeTo, back.profile.alumniNow]).toEqual([
              null,
              null,
            ]);
          },
        );
      });

      it('hides a photo or a bio without hiding the person', async () => {
        const repo = await createRepo();
        await withEdit(
          repo,
          'marija-stojanovska',
          (edit) => ({ ...edit, hidePhoto: true, hideBio: true }),
          async () => {
            const full = await repo.getProfile('member', 'marija-stojanovska', 2026);
            expect(full).toMatchObject({ kind: 'full', profile: { photo: null, bio: '' } });
          },
        );
        const restored = await repo.getProfile('member', 'marija-stojanovska', 2026);
        expect(restored?.kind === 'full' && restored.profile.bio).toContain('burek');
      });

      it('says when nobody has that id', async () => {
        const repo = await createRepo();
        const before = await adminProfile(repo, 'viktor-trajanov');
        expect(await repo.saveProfile('u-nobody', editOf(before), NOW)).toEqual({ status: 'not_found' });
      });
    });
  });
}
