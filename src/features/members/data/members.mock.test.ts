import { describe, expect, it } from 'vitest';

import type { ApprovedMemberIdentity } from '@/features/auth';

import { describeMembersRepository } from './members.repository.contract';
import { createMockMembersRepository } from './members.mock';

describeMembersRepository('mock', () => createMockMembersRepository());

const identity = (patch: Partial<ApprovedMemberIdentity> = {}): ApprovedMemberIdentity => ({
  userId: 'u-new-one',
  name: 'Nova Person',
  username: 'nova-person',
  faculty: 'FINKI',
  year: '1',
  visibility: 'members',
  photoUrl: null,
  approvedAt: '2026-10-05T10:00:00.000Z',
  ...patch,
});

describe('a member the board approves', () => {
  it('gets a profile at once: members only by default, no team, new member', async () => {
    const repo = createMockMembersRepository(() => Promise.resolve([identity()]));
    const asVisitor = await repo.getProfile('visitor', 'nova-person', 2026);
    expect(asVisitor).toMatchObject({ kind: 'restricted', name: 'Nova Person', memberSince: '2026-10-05' });
    const asMember = await repo.getProfile('member', 'nova-person', 2026);
    expect(asMember).toMatchObject({ kind: 'full', role: 'new' });
    const list = await repo.listActive('member', { sort: 'name', page: 1, pageSize: 100 }, 2026);
    expect(list.items.map((item) => item.name)).toContain('Nova Person');
  });

  it('is public when they chose so, with their sign-up photo', async () => {
    const repo = createMockMembersRepository(() =>
      Promise.resolve([
        identity({
          userId: 'u-pub',
          username: 'pub-person',
          visibility: 'public',
          photoUrl: '/api/dev-member-photos/x',
        }),
      ]),
    );
    const profile = await repo.getProfile('visitor', 'pub-person', 2026);
    expect(profile).toMatchObject({ kind: 'full', profile: { photo: { src: '/api/dev-member-photos/x' } } });
    expect(await repo.listPublicUsernames()).toContain('pub-person');
  });

  it('is stored on the first save of the board, and the stored profile wins from then on', async () => {
    const repo = createMockMembersRepository(() =>
      Promise.resolve([identity({ userId: 'u-first-save', username: 'first-save', name: 'First Save' })]),
    );
    const edit = {
      status: 'active' as const,
      memberSince: '2026-10-05',
      activeTo: null,
      teams: [{ teamId: 't-pr', role: 'trainer' as const }],
      badges: [],
      events: [],
      alumniNow: null,
      alumniHighlight: null,
      hidePhoto: false,
      hideBio: false,
    };
    const saved = await repo.saveProfile('u-first-save', edit, new Date('2026-10-06T10:00:00Z'));
    expect(saved).toMatchObject({ status: 'saved', profile: { name: 'First Save', faculty: 'FINKI' } });
    // Even if the sign-up identity disappears, the stored profile stays.
    const later = createMockMembersRepository(() => Promise.resolve([]));
    expect(await later.getProfile('member', 'first-save', 2026)).toMatchObject({
      kind: 'full',
      role: 'trainer',
    });
    // Saving twice does not make two profiles.
    await repo.saveProfile('u-first-save', { ...edit, status: 'inactive' }, new Date());
    const list = await repo.adminList({ q: 'first save', sort: 'name', page: 1, pageSize: 10 });
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.status).toBe('inactive');
  });

  it('never shows a stored hidden profile', async () => {
    const repo = createMockMembersRepository(() => Promise.resolve([]));
    expect(await repo.getProfile('member', 'elena-petrovska', 2026)).toBeNull();
  });
});
