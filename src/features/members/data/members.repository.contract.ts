import { describe, expect, it } from 'vitest';

import type {
  ActiveMembersQuery,
  AdminMembersQuery,
  MineContext,
  Profile,
  ProfileEdit,
  SelfEdit,
} from '../types';
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
const unique = () => crypto.randomUUID().slice(0, 6);

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

      describe('teams', () => {
        it('lists the teams in their order with the people in each, and keeps the address when a team is renamed', async () => {
          const repo = await createRepo();
          const before = await repo.adminTeams();
          expect(before.map((team) => team.slug).slice(0, 3)).toEqual(['events', 'it', 'pr']);
          expect(before.find((team) => team.slug === 'events')?.members).toBeGreaterThanOrEqual(3);
          const made = await repo.saveTeam({ name: { mk: `Testers ${unique()}`, en: 'Testers' } });
          if (made.status !== 'saved') throw new Error('not saved');
          try {
            expect(made.team.slug).toMatch(/^testers/);
            const renamed = await repo.saveTeam({ name: { mk: 'Quality', en: 'Quality' } }, made.team.id);
            expect(renamed).toMatchObject({
              status: 'saved',
              team: { slug: made.team.slug, name: { mk: 'Quality' } },
            });
            const listed = (await repo.adminTeams()).find((team) => team.id === made.team.id);
            expect(listed).toMatchObject({ members: 0, sortOrder: expect.any(Number) as number });
          } finally {
            await repo.removeTeam(made.team.id);
          }
          expect((await repo.adminTeams()).map((team) => team.id)).toEqual(before.map((team) => team.id));
        });

        it('refuses a second team with the same name, in either language', async () => {
          const repo = await createRepo();
          expect(await repo.saveTeam({ name: { mk: 'events' } })).toEqual({ status: 'duplicate' });
          expect(await repo.saveTeam({ name: { mk: 'x' } }, 'nope')).toEqual({ status: 'not_found' });
        });

        it('does not delete a team with people in it, and deletes it when it is empty', async () => {
          const repo = await createRepo();
          const made = await repo.saveTeam({ name: { mk: `Temp ${unique()}` } });
          if (made.status !== 'saved') throw new Error('not saved');
          const viktor = await adminProfile(repo, 'viktor-trajanov');
          try {
            await repo.saveProfile(
              viktor.userId,
              { ...editOf(viktor), teams: [...viktor.teams, { teamId: made.team.id, role: 'member' }] },
              NOW,
            );
            expect(await repo.removeTeam(made.team.id)).toEqual({ status: 'in_use', members: 1 });
          } finally {
            await repo.saveProfile(viktor.userId, editOf(viktor), NOW);
          }
          expect(await repo.removeTeam(made.team.id)).toEqual({ status: 'removed' });
          expect(await repo.removeTeam(made.team.id)).toEqual({ status: 'not_found' });
        });

        it('puts the teams in the order given', async () => {
          const repo = await createRepo();
          const before = (await repo.adminTeams()).map((team) => team.id);
          try {
            await repo.reorderTeams([...before].reverse());
            expect((await repo.adminTeams()).map((team) => team.id)).toEqual([...before].reverse());
            const chips = (await repo.listActive('member', query(), 2026)).teams.map((team) => team.id);
            expect(chips).toEqual([...before].reverse());
          } finally {
            await repo.reorderTeams(before);
          }
          expect((await repo.adminTeams()).map((team) => team.id)).toEqual(before);
        });
      });

      describe('badges', () => {
        it('creates, renames and counts a badge; refuses the same name twice', async () => {
          const repo = await createRepo();
          const made = await repo.saveBadge({
            name: { mk: `Mentor ${unique()}` },
            description: { mk: 'Mentors new members' },
            icon: 'heart',
          });
          if (made.status !== 'saved') throw new Error('not saved');
          try {
            expect((await repo.adminBadges()).find((badge) => badge.id === made.badge.id)).toMatchObject({
              awarded: 0,
              icon: 'heart',
            });
            const edited = await repo.saveBadge(
              { name: made.badge.name, description: { mk: 'Better words' }, icon: 'star' },
              made.badge.id,
            );
            expect(edited).toMatchObject({
              status: 'saved',
              badge: { icon: 'star', description: { mk: 'Better words' } },
            });
            expect(
              await repo.saveBadge({
                name: { mk: made.badge.name.mk.toUpperCase() },
                description: { mk: '' },
                icon: 'star',
              }),
            ).toEqual({ status: 'duplicate' });
            expect(
              await repo.saveBadge({ name: { mk: 'x' }, description: { mk: '' }, icon: 'star' }, 'nope'),
            ).toEqual({
              status: 'not_found',
            });
          } finally {
            await repo.removeBadge(made.badge.id);
          }
        });

        it('takes a deleted badge away from the people who have it', async () => {
          const repo = await createRepo();
          const made = await repo.saveBadge({
            name: { mk: `Temp ${unique()}` },
            description: { mk: '' },
            icon: 'award',
          });
          if (made.status !== 'saved') throw new Error('not saved');
          const viktor = await adminProfile(repo, 'viktor-trajanov');
          try {
            await repo.saveProfile(
              viktor.userId,
              { ...editOf(viktor), badges: [{ badgeId: made.badge.id, note: 'x' }] },
              NOW,
            );
            expect((await repo.adminBadges()).find((badge) => badge.id === made.badge.id)?.awarded).toBe(1);
            expect(await repo.removeBadge(made.badge.id)).toEqual({ status: 'removed', affected: 1 });
            expect((await adminProfile(repo, 'viktor-trajanov')).badges).toEqual([]);
          } finally {
            await repo.saveProfile(viktor.userId, editOf(viktor), NOW);
          }
          expect(await repo.removeBadge(made.badge.id)).toEqual({ status: 'not_found' });
        });
      });

      describe('board', () => {
        const mandate = () => {
          const year = 2200 + Math.floor(Math.random() * 90);
          return {
            label: `${year}/${year + 1}`,
            startsOn: `${year}-10-01`,
            endsOn: `${year + 1}-09-30`,
            isCurrent: false,
          };
        };

        it('lists the boards, current first, and the people a seat can go to', async () => {
          const repo = await createRepo();
          const { mandates, people } = await repo.adminBoards();
          expect(mandates[0]).toMatchObject({ label: '2026/2027', isCurrent: true });
          expect(mandates.filter((item) => item.isCurrent)).toHaveLength(1);
          expect(people.map((person) => person.name)).toContain('Marija Stojanovska');
          expect(people.map((person) => person.name)).not.toContain('Elena Petrovska');
          expect(people.map((person) => person.name)).toEqual(
            [...people.map((person) => person.name)].sort((a, b) => a.localeCompare(b, 'en')),
          );
        });

        it('adds a board with seats in order, shows it on the public page, and removes it', async () => {
          const repo = await createRepo();
          const input = mandate();
          const made = await repo.saveMandate(input);
          if (made.status !== 'saved') throw new Error('not saved');
          const id = made.mandate.id;
          try {
            expect(made.mandate).toMatchObject({ isCurrent: false, seats: [] });
            expect(await repo.saveMandate(input)).toEqual({ status: 'duplicate' });
            const first = await repo.saveSeat(id, {
              boardRoleId: 'role-chair',
              title: 'Chair',
              userId: 'u-marija',
            });
            const second = await repo.saveSeat(id, {
              boardRoleId: 'role-pr',
              title: 'PR',
              userId: 'u-stefan',
            });
            if (first.status !== 'saved' || second.status !== 'saved') throw new Error('not saved');
            expect(second.mandate.seats.map((seat) => seat.title)).toEqual(['Chair', 'PR']);
            // Order, edit and the public page (names come from the profiles, a past board has no e-mails).
            const [a, b] = second.mandate.seats;
            await repo.reorderSeats(id, [b!.id, a!.id]);
            await repo.saveSeat(
              id,
              { boardRoleId: 'role-pr', title: 'PR and media', userId: 'u-stefan' },
              b!.id,
            );
            const view = await repo.getBoard(input.label);
            expect(view.selected?.seats.map((seat) => [seat.title, seat.name])).toEqual([
              ['PR and media', 'Stefan Nikolovski'],
              ['Chair', 'Marija Stojanovska'],
            ]);
            expect(await repo.removeSeat(id, a!.id)).toBe(true);
            expect(await repo.removeSeat(id, a!.id)).toBe(false);
            expect(
              await repo.saveSeat(id, { boardRoleId: 'role-pr', title: 'x', userId: 'u-nobody' }),
            ).toEqual({
              status: 'person_not_found',
            });
            expect(
              await repo.saveSeat('nope', { boardRoleId: 'role-pr', title: 'x', userId: 'u-stefan' }),
            ).toEqual({
              status: 'not_found',
            });
          } finally {
            expect(await repo.removeMandate(id)).toEqual({ status: 'removed' });
          }
          expect((await repo.getBoard(input.label)).selected?.label).toBe('2026/2027');
        });

        it('moves the current board when another is marked, never has none, and keeps the current one', async () => {
          const repo = await createRepo();
          const made = await repo.saveMandate({ ...mandate(), isCurrent: true });
          if (made.status !== 'saved') throw new Error('not saved');
          const original = (await repo.adminBoards()).mandates.find((item) => item.label === '2026/2027')!;
          try {
            const boards = (await repo.adminBoards()).mandates;
            expect(boards.filter((item) => item.isCurrent).map((item) => item.id)).toEqual([made.mandate.id]);
            expect(await repo.removeMandate(made.mandate.id)).toEqual({ status: 'current' });
            // Unmarking the current board is ignored: mark another instead.
            const kept = await repo.saveMandate(
              { ...mandate(), label: made.mandate.label, isCurrent: false },
              made.mandate.id,
            );
            expect(kept).toMatchObject({ status: 'saved', mandate: { isCurrent: true } });
            expect((await repo.getBoard()).selected?.id).toBe(made.mandate.id);
          } finally {
            await repo.saveMandate(
              {
                label: original.label,
                startsOn: original.startsOn,
                endsOn: original.endsOn,
                isCurrent: true,
              },
              original.id,
            );
            await repo.removeMandate(made.mandate.id);
          }
          expect((await repo.getBoard()).selected?.label).toBe('2026/2027');
        });
      });
    });

    describe('my profile (M16)', () => {
      const person = (patch: Partial<MineContext> = {}): MineContext => {
        const id = unique();
        return {
          userId: `u-me-${id}`,
          name: `Test Person ${id}`,
          username: `test-person-${id}`,
          faculty: 'FEEIT',
          visibility: 'members_only',
          photoUrl: null,
          since: '2026-10-05',
          pending: false,
          ...patch,
        };
      };
      const edit = (who: MineContext, patch: Partial<SelfEdit> = {}): SelfEdit => ({
        name: who.name,
        username: who.username,
        bio: '',
        linkedinUrl: '',
        githubUrl: '',
        faculty: who.faculty,
        ...patch,
      });

      it('starts from what the person gave at sign-up, with every choice off', async () => {
        const repo = await createRepo();
        const who = person({ photoUrl: '/api/dev-member-photos/abc' });
        const mine = await repo.getMine(who, 2026);
        expect(mine.profile).toMatchObject({
          name: who.name,
          username: who.username,
          bio: '',
          visibility: 'members_only',
          photo: { src: '/api/dev-member-photos/abc' },
          memberSince: '2026-10-05',
        });
        expect(mine.pending).toBe(false);
        expect(mine.consents).toEqual({
          newsletter: false,
          galleryName: false,
          cvOptIn: false,
          cvConsentAt: null,
        });
        expect(mine.cv).toBeNull();
        expect(mine.cvViewsThisYear).toBe(0);
      });

      it('saves the edits, and the profile then shows them to members', async () => {
        const repo = await createRepo();
        const who = person();
        const result = await repo.updateMine(
          who,
          edit(who, { bio: 'Hello', githubUrl: 'https://github.com/test', username: `new-${unique()}` }),
        );
        expect(result.status).toBe('saved');
        if (result.status !== 'saved') return;
        const mine = await repo.getMine(who, 2026);
        expect(mine.profile).toMatchObject({ bio: 'Hello', githubUrl: 'https://github.com/test' });
        const seen = await repo.getProfile('member', result.profile.username, 2026);
        expect(seen).toMatchObject({ kind: 'full', profile: { bio: 'Hello' } });
        // The old address is gone.
        expect(await repo.getProfile('member', who.username, 2026)).toBeNull();
      });

      it("refuses an address that another profile has, or that is reserved, and keeps one's own", async () => {
        const repo = await createRepo();
        const who = person();
        expect(await repo.updateMine(who, edit(who, { username: 'marija-stojanovska' }))).toEqual({
          status: 'username_taken',
        });
        expect(await repo.updateMine(who, edit(who, { username: 'admin' }))).toEqual({
          status: 'username_reserved',
        });
        expect(await repo.usernameAvailable(who.userId, 'marija-stojanovska')).toBe(false);
        expect(await repo.usernameAvailable('u-marija', 'marija-stojanovska')).toBe(true);
        expect((await repo.updateMine(who, edit(who))).status).toBe('saved');
      });

      it('keeps what a person waiting for the board writes as a draft nobody sees, and uses it at approval', async () => {
        const repo = await createRepo();
        const waiting = person({ pending: true });
        await repo.updateMine(waiting, edit(waiting, { bio: 'Waiting bio' }));
        await repo.setVisibility(waiting, 'public');
        expect((await repo.getMine(waiting, 2026)).profile).toMatchObject({
          bio: 'Waiting bio',
          visibility: 'public',
          status: 'inactive',
        });
        // Nobody else sees a draft.
        expect(await repo.getProfile('member', waiting.username, 2026)).toBeNull();
        // Approved: the same person, no longer pending, keeps the draft.
        const approved = { ...waiting, pending: false };
        const mine = await repo.getMine(approved, 2026);
        expect(mine.profile).toMatchObject({ bio: 'Waiting bio', visibility: 'public', status: 'active' });
        await repo.updateMine(approved, edit(approved, { bio: 'Now active' }));
        expect(await repo.getProfile('visitor', waiting.username, 2026)).toMatchObject({
          kind: 'full',
          profile: { bio: 'Now active', visibility: 'public' },
        });
      });

      it('changes visibility and the photo, and says which photo the old one was', async () => {
        const repo = await createRepo();
        const who = person({ photoUrl: '/api/dev-member-photos/one' });
        await repo.setVisibility(who, 'public');
        expect((await repo.getMine(who, 2026)).profile.visibility).toBe('public');
        expect(await repo.setPhoto(who, '/api/dev-member-photos/two')).toBe('/api/dev-member-photos/one');
        expect((await repo.getMine(who, 2026)).profile.photo).toEqual({ src: '/api/dev-member-photos/two' });
        expect(await repo.setPhoto(who, null)).toBe('/api/dev-member-photos/two');
        expect((await repo.getMine(who, 2026)).profile.photo).toBeNull();
        expect(await repo.setPhoto(who, null)).toBeNull();
      });

      it('records when CV sharing was turned on, takes a PDF only while it is on, and deletes it when turned off', async () => {
        const repo = await createRepo();
        const who = person();
        const file = { fileName: 'cv.pdf', bytes: new Uint8Array([37, 80, 68, 70, 45]) };
        expect(await repo.storeCv(who.userId, file, NOW)).toEqual({ status: 'not_opted_in' });
        const on = await repo.setConsents(who.userId, { cvOptIn: true, newsletter: true }, NOW);
        expect(on).toEqual({
          newsletter: true,
          galleryName: false,
          cvOptIn: true,
          cvConsentAt: NOW.toISOString(),
        });
        expect(await repo.storeCv(who.userId, file, NOW)).toMatchObject({
          status: 'stored',
          cv: { fileName: 'cv.pdf', size: 5 },
        });
        expect((await repo.getMine(who, 2026)).cv).toMatchObject({ fileName: 'cv.pdf' });
        expect((await repo.getCvFile(who.userId))?.bytes).toEqual(file.bytes);
        // Turning on again does not change the date.
        const later = new Date(NOW.getTime() + 60_000);
        expect((await repo.setConsents(who.userId, { cvOptIn: true }, later)).cvConsentAt).toBe(
          NOW.toISOString(),
        );
        const off = await repo.setConsents(who.userId, { cvOptIn: false }, later);
        expect(off).toMatchObject({ cvOptIn: false, cvConsentAt: null, newsletter: true });
        expect(await repo.getCvFile(who.userId)).toBeNull();
      });

      it('removes the CV file and leaves sharing on', async () => {
        const repo = await createRepo();
        const who = person();
        await repo.setConsents(who.userId, { cvOptIn: true }, NOW);
        await repo.storeCv(who.userId, { fileName: 'a.pdf', bytes: new Uint8Array(3) }, NOW);
        expect(await repo.removeCv(who.userId)).toBe(true);
        expect(await repo.removeCv(who.userId)).toBe(false);
        expect((await repo.getMine(who, 2026)).consents.cvOptIn).toBe(true);
      });

      it('deletes the profile, choices and CV, and gives up a seat on a board', async () => {
        const repo = await createRepo();
        const who = person({ photoUrl: '/api/dev-member-photos/gone' });
        await repo.updateMine(who, edit(who, { bio: 'bye' }));
        await repo.setConsents(who.userId, { cvOptIn: true }, NOW);
        await repo.storeCv(who.userId, { fileName: 'a.pdf', bytes: new Uint8Array(3) }, NOW);
        expect(await repo.deleteMine(who.userId)).toEqual({ photoUrl: '/api/dev-member-photos/gone' });
        expect(await repo.getProfile('member', who.username, 2026)).toBeNull();
        expect(await repo.getCvFile(who.userId)).toBeNull();
        expect((await repo.getMine(who, 2026)).consents.cvOptIn).toBe(false);
      });
    });
  });
}
