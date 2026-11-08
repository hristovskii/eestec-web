import 'server-only';

import type { ApprovedMemberIdentity } from '@/features/auth';
import { mockTable } from '@/shared/data/mock/store';
import { slugify } from '@/shared/lib/slug';

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

    // ─── Teams ───
    async adminTeams() {
      const teams = [...db.teams].sort((a, b) => a.sortOrder - b.sortOrder);
      const members = (await directory()).profiles;
      return structuredClone(
        teams.map((team) => ({
          ...team,
          members: members.filter((profile) => profile.teams.some((entry) => entry.teamId === team.id))
            .length,
        })),
      );
    },
    saveTeam(input, id) {
      const same = (team: Team) =>
        [team.name.mk, team.name.en].some(
          (name) => name?.trim().toLowerCase() === input.name.mk.trim().toLowerCase(),
        );
      if (db.teams.some((team) => team.id !== id && same(team)))
        return Promise.resolve({ status: 'duplicate' as const });
      if (id) {
        const team = db.teams.find((item) => item.id === id);
        if (!team) return Promise.resolve({ status: 'not_found' as const });
        team.name = structuredClone(input.name);
        return Promise.resolve({ status: 'saved' as const, team: structuredClone(team) });
      }
      const base = slugify(input.name.en?.trim() || input.name.mk) || 'team';
      let slug = base;
      for (let n = 2; db.teams.some((team) => team.slug === slug); n += 1) slug = `${base}-${n}`;
      const team: Team = {
        id: `t-${crypto.randomUUID().slice(0, 8)}`,
        slug,
        name: structuredClone(input.name),
        sortOrder: Math.max(0, ...db.teams.map((item) => item.sortOrder)) + 1,
      };
      db.teams.push(team);
      return Promise.resolve({ status: 'saved' as const, team: structuredClone(team) });
    },
    async removeTeam(id) {
      const team = db.teams.find((item) => item.id === id);
      if (!team) return { status: 'not_found' as const };
      const members = (await directory()).profiles.filter((profile) =>
        profile.teams.some((entry) => entry.teamId === id),
      ).length;
      if (members > 0) return { status: 'in_use' as const, members };
      db.teams.splice(db.teams.indexOf(team), 1);
      return { status: 'removed' as const };
    },
    reorderTeams(ids) {
      const listed = ids.flatMap((id) => db.teams.filter((team) => team.id === id));
      const rest = db.teams
        .filter((team) => !ids.includes(team.id))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      [...listed, ...rest].forEach((team, index) => {
        team.sortOrder = index + 1;
      });
      return Promise.resolve();
    },

    // ─── Badges ───
    async adminBadges() {
      const profiles = (await directory()).profiles;
      return structuredClone(
        db.badges.map((badge) => ({
          ...badge,
          awarded: profiles.filter((profile) => profile.badges.some((entry) => entry.badgeId === badge.id))
            .length,
        })),
      );
    },
    saveBadge(input, id) {
      const name = input.name.mk.trim().toLowerCase();
      if (db.badges.some((badge) => badge.id !== id && badge.name.mk.trim().toLowerCase() === name))
        return Promise.resolve({ status: 'duplicate' as const });
      if (id) {
        const badge = db.badges.find((item) => item.id === id);
        if (!badge) return Promise.resolve({ status: 'not_found' as const });
        Object.assign(badge, structuredClone(input));
        return Promise.resolve({ status: 'saved' as const, badge: structuredClone(badge) });
      }
      const badge: Badge = { id: `b-${crypto.randomUUID().slice(0, 8)}`, ...structuredClone(input) };
      db.badges.push(badge);
      return Promise.resolve({ status: 'saved' as const, badge: structuredClone(badge) });
    },
    async removeBadge(id) {
      const badge = db.badges.find((item) => item.id === id);
      if (!badge) return { status: 'not_found' as const };
      // Stored profiles lose the award; people the board never edited have none to lose.
      let affected = 0;
      for (const profile of (await directory()).profiles) {
        if (profile.badges.some((entry) => entry.badgeId === id)) affected += 1;
      }
      for (const profile of db.profiles)
        profile.badges = profile.badges.filter((entry) => entry.badgeId !== id);
      db.badges.splice(db.badges.indexOf(badge), 1);
      return { status: 'removed' as const, affected };
    },

    // ─── Board ───
    async adminBoards() {
      const people = (await directory()).profiles
        .filter((profile) => profile.status === 'active' || profile.status === 'alumni')
        .map((profile) => ({ userId: profile.userId, name: profile.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en'));
      const mandates = [...db.mandates].sort(
        (a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.startsOn.localeCompare(a.startsOn),
      );
      return structuredClone({ mandates, people });
    },
    saveMandate(input, id) {
      if (db.mandates.some((mandate) => mandate.id !== id && mandate.label === input.label))
        return Promise.resolve({ status: 'duplicate' as const });
      let mandate = id ? db.mandates.find((item) => item.id === id) : undefined;
      if (id && !mandate) return Promise.resolve({ status: 'not_found' as const });
      if (!mandate) {
        mandate = {
          id: `m-${crypto.randomUUID().slice(0, 8)}`,
          label: input.label,
          startsOn: input.startsOn,
          endsOn: input.endsOn,
          isCurrent: false,
          seats: [],
        };
        db.mandates.push(mandate);
      }
      mandate.label = input.label;
      mandate.startsOn = input.startsOn;
      mandate.endsOn = input.endsOn;
      // Exactly one board is current: marking one moves it, and the first board is current.
      if (input.isCurrent || !db.mandates.some((item) => item !== mandate && item.isCurrent)) {
        for (const item of db.mandates) item.isCurrent = item === mandate;
      }
      return Promise.resolve({ status: 'saved' as const, mandate: structuredClone(mandate) });
    },
    removeMandate(id) {
      const mandate = db.mandates.find((item) => item.id === id);
      if (!mandate) return Promise.resolve({ status: 'not_found' as const });
      if (mandate.isCurrent) return Promise.resolve({ status: 'current' as const });
      db.mandates.splice(db.mandates.indexOf(mandate), 1);
      return Promise.resolve({ status: 'removed' as const });
    },
    async saveSeat(mandateId, input, seatId) {
      const mandate = db.mandates.find((item) => item.id === mandateId);
      if (!mandate) return { status: 'not_found' as const };
      const person = (await directory()).profiles.find((profile) => profile.userId === input.userId);
      if (!person || (person.status !== 'active' && person.status !== 'alumni'))
        return { status: 'person_not_found' as const };
      // A person on the board must have a stored profile to be kept even if sign-up data changes.
      if (!db.profiles.some((profile) => profile.userId === person.userId))
        db.profiles.push(structuredClone(person));
      if (seatId) {
        const seat = mandate.seats.find((item) => item.id === seatId);
        if (!seat) return { status: 'not_found' as const };
        Object.assign(seat, input);
      } else {
        mandate.seats.push({ id: `bs-${crypto.randomUUID().slice(0, 8)}`, ...input });
      }
      return { status: 'saved' as const, mandate: structuredClone(mandate) };
    },
    removeSeat(mandateId, seatId) {
      const mandate = db.mandates.find((item) => item.id === mandateId);
      const seat = mandate?.seats.find((item) => item.id === seatId);
      if (!mandate || !seat) return Promise.resolve(false);
      mandate.seats.splice(mandate.seats.indexOf(seat), 1);
      return Promise.resolve(true);
    },
    reorderSeats(mandateId, seatIds) {
      const mandate = db.mandates.find((item) => item.id === mandateId);
      if (mandate) {
        const listed = seatIds.flatMap((id) => mandate.seats.filter((seat) => seat.id === id));
        mandate.seats = [...listed, ...mandate.seats.filter((seat) => !seatIds.includes(seat.id))];
      }
      return Promise.resolve();
    },

    async listPublicUsernames() {
      return (await directory()).profiles
        .filter((profile) => canSee('visitor', profile))
        .map((profile) => profile.username)
        .sort();
    },
  };
}
