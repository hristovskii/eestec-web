import { describe, expect, it } from 'vitest';

import type { ActiveMembersQuery } from '../types';
import type { MembersRepository } from './members.repository';

// Runs against every implementation (mock now, Supabase later). Read-only: the sample data decides
// the numbers, so these tests state rules, not exact counts (except where the canvas fixes them).

const query = (patch: Partial<ActiveMembersQuery> = {}): ActiveMembersQuery => ({
  sort: 'name',
  page: 1,
  pageSize: 100,
  ...patch,
});

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
  });
}
