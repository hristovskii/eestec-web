import { describe, expect, it } from 'vitest';

import { mandatesFixture } from '../data/fixtures/board';
import { profilesFixture } from '../data/fixtures/profiles';
import { badgesFixture, teamsFixture } from '../data/fixtures/teams';
import type { Profile } from '../types';
import { activeMembers, boardView, profileResult } from './directory';

const directory = (profiles: Profile[] = profilesFixture) => ({
  profiles,
  teams: teamsFixture,
  badges: badgesFixture,
  mandates: mandatesFixture,
});
const base = { sort: 'name', page: 1, pageSize: 100 } as const;

describe('moderation', () => {
  const marija = profilesFixture.find((profile) => profile.username === 'marija-stojanovska')!;

  it('leaves out a hidden photo and a hidden bio, but not the person', () => {
    const profiles = [{ ...marija, hidePhoto: true, hideBio: true }];
    const result = profileResult(directory(profiles), 'member', 'marija-stojanovska', 2026);
    expect(result).toMatchObject({ kind: 'full', profile: { photo: null, bio: '' } });
    const list = activeMembers(directory(profiles), 'member', base, 2026);
    expect(list.items[0]?.photo).toBeNull();
  });

  it('shows nobody a hidden or inactive profile, in the lists, the page or the board link', () => {
    for (const status of ['hidden', 'inactive'] as const) {
      const profiles = profilesFixture.map((profile) =>
        profile.userId === 'u-stefan' ? { ...profile, status } : profile,
      );
      expect(profileResult(directory(profiles), 'member', 'stefan-nikolovski', 2026)).toBeNull();
      expect(
        activeMembers(directory(profiles), 'member', base, 2026).items.map((item) => item.name),
      ).not.toContain('Stefan Nikolovski');
      const seat = boardView(directory(profiles)).selected?.seats.find(
        (item) => item.name === 'Stefan Nikolovski',
      );
      expect(seat?.username).toBeNull();
    }
  });
});

describe('sorting and counting', () => {
  it('sorts newest members first and longest active first', () => {
    const newest = activeMembers(directory(), 'member', { ...base, sort: 'newest' }, 2026).items;
    expect(newest[0]?.memberSince.slice(0, 4)).toBe('2026');
    const longest = activeMembers(directory(), 'member', { ...base, sort: 'longest' }, 2026).items;
    expect(longest[0]?.name).toBe('Aleksandar Popov');
  });

  it('counts team chips for the search, and everyone in allCount', () => {
    const result = activeMembers(directory(), 'member', { ...base, q: 'ma' }, 2026);
    const names = result.items.map((item) => item.name);
    expect(result.allCount).toBe(names.length);
    expect(names.every((name) => name.toLowerCase().includes('ma'))).toBe(true);
  });
});
