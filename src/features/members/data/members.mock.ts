import 'server-only';

import type { ApprovedMemberIdentity } from '@/features/auth';
import { mockTable } from '@/shared/data/mock/store';

import { adminMembers } from '../domain/admin-directory';
import { type Directory, activeMembers, alumniList, boardView, profileResult } from '../domain/directory';
import { canSee } from '../domain/visibility';
import type { Badge, BoardMandate, Profile, Team } from '../types';
import { mandatesFixture } from './fixtures/board';
import { profilesFixture } from './fixtures/profiles';
import { badgesFixture, teamsFixture } from './fixtures/teams';
import type { MembersRepository } from './members.repository';

type Tables = { profiles: Profile[]; teams: Team[]; badges: Badge[]; mandates: BoardMandate[] };

const tables = () =>
  mockTable<Tables>('members', () => ({
    profiles: profilesFixture,
    teams: teamsFixture,
    badges: badgesFixture,
    mandates: mandatesFixture,
  }));

/**
 * A person the board approved in Approvals has a profile from that moment: public facts from the
 * sign-up, no team, member since the approval. In Supabase this is the same `profiles` row; here the
 * stored profile (once the board edits it) wins over this default.
 */
export function profileFromIdentity(identity: ApprovedMemberIdentity): Profile {
  return {
    userId: identity.userId,
    username: identity.username,
    name: identity.name,
    photo: identity.photoUrl ? { src: identity.photoUrl } : null,
    hidePhoto: false,
    bio: '',
    hideBio: false,
    linkedinUrl: '',
    githubUrl: '',
    visibility: identity.visibility === 'public' ? 'public' : 'members_only',
    status: 'active',
    memberSince: identity.approvedAt.slice(0, 10),
    activeTo: null,
    alumniNow: null,
    alumniHighlight: null,
    faculty: identity.faculty,
    teams: [],
    badges: [],
    events: [],
  };
}

export function createMockMembersRepository(
  approvedIdentities: () => Promise<ApprovedMemberIdentity[]> = () => Promise.resolve([]),
): MembersRepository {
  const db = tables();

  const directory = async (): Promise<Directory> => {
    const stored = new Set(db.profiles.map((profile) => profile.userId));
    const adopted = (await approvedIdentities())
      .filter((identity) => !stored.has(identity.userId))
      .map(profileFromIdentity);
    return {
      profiles: [...db.profiles, ...adopted],
      teams: db.teams,
      badges: db.badges,
      mandates: db.mandates,
    };
  };

  return {
    async listActive(audience, query, currentYear) {
      return structuredClone(activeMembers(await directory(), audience, query, currentYear));
    },
    async listAlumni(audience, query) {
      return structuredClone(alumniList(await directory(), audience, query));
    },
    async getBoard(label) {
      return structuredClone(boardView(await directory(), label));
    },
    async getProfile(audience, username, currentYear) {
      return structuredClone(profileResult(await directory(), audience, username, currentYear));
    },
    async adminList(query) {
      const { profiles, teams } = await directory();
      return structuredClone({
        ...adminMembers(profiles, teams, query),
        teams: [...teams].sort((a, b) => a.sortOrder - b.sortOrder),
      });
    },
    getCatalog() {
      return Promise.resolve(
        structuredClone({
          teams: [...db.teams].sort((a, b) => a.sortOrder - b.sortOrder),
          badges: db.badges,
        }),
      );
    },
    async saveProfile(userId, edit, now) {
      const known = (await directory()).profiles.find((profile) => profile.userId === userId);
      if (!known) return { status: 'not_found' as const };
      // The first save of a person the board approved (not stored yet) keeps what they gave at sign-up.
      let profile = db.profiles.find((item) => item.userId === userId);
      if (!profile) {
        profile = structuredClone(known);
        db.profiles.push(profile);
      }
      const awarded = new Map(profile.badges.map((badge) => [badge.badgeId, badge.awardedAt]));
      profile.status = edit.status;
      profile.memberSince = edit.memberSince;
      profile.activeTo = edit.status === 'alumni' ? edit.activeTo : null;
      profile.teams = edit.teams.filter((entry) => db.teams.some((team) => team.id === entry.teamId));
      profile.badges = edit.badges
        .filter((entry) => db.badges.some((badge) => badge.id === entry.badgeId))
        .map((entry) => ({
          badgeId: entry.badgeId,
          note: entry.note,
          awardedAt: awarded.get(entry.badgeId) ?? now.toISOString().slice(0, 10),
        }));
      profile.events = edit.events;
      profile.alumniNow = edit.status === 'alumni' ? edit.alumniNow : null;
      profile.alumniHighlight = edit.status === 'alumni' ? edit.alumniHighlight : null;
      profile.hidePhoto = edit.hidePhoto;
      profile.hideBio = edit.hideBio;
      return { status: 'saved' as const, profile: structuredClone(profile) };
    },
    async listPublicUsernames() {
      return (await directory()).profiles
        .filter((profile) => canSee('visitor', profile))
        .map((profile) => profile.username)
        .sort();
    },
  };
}
