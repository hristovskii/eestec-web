import { describe, expect, it } from 'vitest';

import { boardView } from './directory';
import { mandatesFixture } from '../data/fixtures/board';
import { profilesFixture } from '../data/fixtures/profiles';
import { badgesFixture, teamsFixture } from '../data/fixtures/teams';
import { activeYears, toAlumniCard, toBoardView, toMemberCard } from './view';

const directory = {
  profiles: profilesFixture,
  teams: teamsFixture,
  badges: badgesFixture,
  mandates: mandatesFixture,
};

describe('view models', () => {
  it('writes alumni years and falls back to Macedonian text per field', () => {
    expect(activeYears('2018-10-01', '2023-06-30')).toBe('2018–2023');
    expect(activeYears('2018-10-01', null)).toBe('2018–');
    const card = toAlumniCard(
      {
        userId: 'x',
        username: 'x',
        name: 'Ljupcho Georgiev',
        memberSince: '2014-10-01',
        activeTo: '2018-06-30',
        now: { mk: 'Инженер' },
        highlight: null,
      },
      'en',
    );
    expect(card).toEqual({
      username: 'x',
      name: 'Ljupcho Georgiev',
      initials: 'LG',
      years: '2014–2018',
      highlight: '',
      now: 'Инженер',
    });
  });

  it('names teams in the language of the page and reads the join year', () => {
    const summary = {
      userId: 'u',
      username: 'u',
      name: 'Kristina Velkovska',
      photo: null,
      teams: [{ id: 't', slug: 'pr', name: { mk: 'ПР', en: 'PR' }, sortOrder: 1 }],
      role: 'member' as const,
      memberSince: '2024-10-01',
      membersOnly: false,
    };
    expect(toMemberCard(summary, 'mk')).toMatchObject({ teams: ['ПР'], since: 2024, initials: 'KV' });
    expect(toMemberCard(summary, 'en').teams).toEqual(['PR']);
  });

  it('shows position e-mails on the current board only', () => {
    const email = (id: string) => `${id}@eestec.mk`;
    const current = toBoardView(boardView(directory), email).selected;
    expect(current?.cards[0]).toMatchObject({ position: 'Chairperson', email: 'role-chair@eestec.mk' });
    const past = toBoardView(boardView(directory, '2025/2026'), email).selected;
    expect(past?.cards.every((card) => card.email === null)).toBe(true);
  });
});
