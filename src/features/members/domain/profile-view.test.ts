import { describe, expect, it } from 'vitest';

import { mandatesFixture } from '../data/fixtures/board';
import { profilesFixture } from '../data/fixtures/profiles';
import { badgesFixture, teamsFixture } from '../data/fixtures/teams';
import { profileResult } from './directory';
import { type EventForProfile, toProfileView } from './profile-view';

const directory = {
  profiles: profilesFixture,
  teams: teamsFixture,
  badges: badgesFixture,
  mandates: mandatesFixture,
};
const event = (id: string, slug: string, timing: 'upcoming' | 'past'): EventForProfile => ({
  id,
  slug,
  title: { text: slug, lang: 'en' },
  startsAt: '2026-05-18T10:00:00+02:00',
  typeName: 'Workshop',
  scope: 'international',
  place: { text: 'Skopje' },
  timing,
});

describe('toProfileView', () => {
  const full = profileResult(directory, 'member', 'marija-stojanovska', 2026)!;

  it('counts organized and attended from the events that exist for visitors, and links by timing', () => {
    const view = toProfileView(
      full,
      [
        event('ev-ai-at-the-edge', 'ai-at-the-edge', 'upcoming'),
        event('ev-eestech-challenge-2025', 'eestech-2025', 'past'),
      ],
      'en',
    );
    expect(view).toMatchObject({
      kind: 'full',
      name: 'Marija Stojanovska',
      initials: 'MS',
      since: 2023,
      counts: { organized: 1, attended: 1 },
      teams: [{ slug: 'events', name: 'Events', role: 'lead' }],
    });
    if (view.kind !== 'full') throw new Error('full expected');
    expect(view.events.map((item) => [item.role, item.path])).toEqual([
      ['organizer', '/upcoming/ai-at-the-edge'],
      ['participant', '/events/eestech-2025'],
    ]);
  });

  it('shows no event that is not listed, and the badge note before the badge description', () => {
    const view = toProfileView(full, [], 'en');
    if (view.kind !== 'full') throw new Error('full expected');
    expect(view.events).toEqual([]);
    expect(view.counts).toEqual({ organized: 0, attended: 0 });
    expect(view.badges[0]).toMatchObject({
      name: 'Organizer',
      text: 'Helped organize 3 events',
      icon: 'star',
    });
  });

  it('turns a restricted result into name and teams only', () => {
    const restricted = profileResult(directory, 'visitor', 'marija-stojanovska', 2026)!;
    expect(toProfileView(restricted, [], 'en')).toEqual({
      kind: 'restricted',
      username: 'marija-stojanovska',
      name: 'Marija Stojanovska',
      initials: 'MS',
      teams: ['Events'],
      memberSince: '2023-10-01',
    });
  });

  it('writes an alumnus as alumni with years, highlight and now', () => {
    const alumnus = profileResult(directory, 'visitor', 'bojan-petreski', 2026)!;
    expect(toProfileView(alumnus, [], 'en')).toMatchObject({
      kind: 'full',
      status: 'alumni',
      activeYears: '2018–2023',
      alumniHighlight: 'Chair 2021/22',
      alumniNow: 'Embedded engineer at Gridnova',
    });
  });
});
