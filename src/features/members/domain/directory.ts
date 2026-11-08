import type {
  ActiveMembers,
  ActiveMembersQuery,
  AlumniList,
  AlumniQuery,
  Audience,
  Badge,
  BoardMandate,
  BoardView,
  Profile,
  ProfileResult,
  Team,
} from '../types';
import { memberRole, yearOf } from './member-role';
import { canSee, hasPage, isRestrictedFor } from './visibility';

// The reads of /members and /members/<username> as pure functions over the stored tables. The mock
// repository calls them; a SQL implementation must give the same answers (the contract tests).

export type Directory = {
  profiles: readonly Profile[];
  teams: readonly Team[];
  badges: readonly Badge[];
  mandates: readonly BoardMandate[];
};

const byTeamOrder = (a: Team, b: Team) => a.sortOrder - b.sortOrder;
const lower = (text: string) => text.trim().toLocaleLowerCase('en');
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en');
const photoOf = (profile: Profile) => (profile.hidePhoto ? null : profile.photo);

function teamsOf(directory: Directory, profile: Profile): Team[] {
  return profile.teams
    .map((entry) => directory.teams.find((team) => team.id === entry.teamId))
    .filter((team): team is Team => !!team)
    .sort(byTeamOrder);
}

export function activeMembers(
  directory: Directory,
  audience: Audience,
  query: ActiveMembersQuery,
  currentYear: number,
): ActiveMembers {
  const needle = lower(query.q ?? '');
  const teams = [...directory.teams].sort(byTeamOrder);
  const active = directory.profiles.filter((profile) => profile.status === 'active');
  const visible = active.filter((profile) => canSee(audience, profile));

  const matching = visible.filter((profile) => {
    if (needle && !lower(profile.name).includes(needle)) return false;
    if (query.joined) {
      const joined = yearOf(profile.memberSince);
      if (query.joined.orEarlier ? joined > query.joined.year : joined !== query.joined.year) return false;
    }
    return true;
  });

  const inTeam = query.team
    ? matching.filter((profile) => teamsOf(directory, profile).some((team) => team.slug === query.team))
    : matching;

  const sorted = [...inTeam].sort((a, b) => {
    switch (query.sort) {
      case 'newest':
        return b.memberSince.localeCompare(a.memberSince) || byName(a, b);
      case 'longest':
        return a.memberSince.localeCompare(b.memberSince) || byName(a, b);
      case 'name':
        return byName(a, b);
    }
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / query.pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const slice = sorted.slice((page - 1) * query.pageSize, page * query.pageSize);

  return {
    items: slice.map((profile) => ({
      userId: profile.userId,
      username: profile.username,
      name: profile.name,
      photo: photoOf(profile),
      teams: teamsOf(directory, profile),
      role: memberRole(profile.teams, profile.memberSince, currentYear),
      memberSince: profile.memberSince,
      membersOnly: profile.visibility === 'members_only',
    })),
    total: sorted.length,
    page,
    pageCount,
    teamCounts: teams.map((team) => ({
      team,
      count: matching.filter((profile) => profile.teams.some((entry) => entry.teamId === team.id)).length,
    })),
    allCount: matching.length,
    visibleTotal: visible.length,
    hiddenCount:
      audience === 'visitor' ? active.filter((profile) => profile.visibility === 'members_only').length : 0,
    teams,
  };
}

export function alumniList(directory: Directory, audience: Audience, query: AlumniQuery): AlumniList {
  const needle = lower(query.q ?? '');
  const visible = directory.profiles.filter(
    (profile) => profile.status === 'alumni' && canSee(audience, profile),
  );
  const matching = visible
    .filter((profile) => !needle || lower(profile.name).includes(needle))
    // Most recent leavers first.
    .sort((a, b) => (b.activeTo ?? '').localeCompare(a.activeTo ?? '') || byName(a, b));
  const shown = query.limit === 'all' ? matching : matching.slice(0, query.limit);
  return {
    items: shown.map((profile) => ({
      userId: profile.userId,
      username: profile.username,
      name: profile.name,
      memberSince: profile.memberSince,
      activeTo: profile.activeTo,
      now: profile.alumniNow,
      highlight: profile.alumniHighlight,
    })),
    total: visible.length,
    matching: matching.length,
  };
}

/** The current board is first, then past ones newest first. */
const newestFirst = (a: BoardMandate, b: BoardMandate) =>
  Number(b.isCurrent) - Number(a.isCurrent) || b.startsOn.localeCompare(a.startsOn);

/** `label` picks a board; unknown or none → the current one. Names come from the profiles, even members-only ones (the board is public). */
export function boardView(directory: Directory, label?: string): BoardView {
  const mandates = [...directory.mandates].sort(newestFirst);
  const chosen = mandates.find((mandate) => mandate.label === label) ?? mandates.find((m) => m.isCurrent);
  return {
    mandates: mandates.map(({ id, label: text, isCurrent }) => ({ id, label: text, isCurrent })),
    selected: chosen
      ? {
          id: chosen.id,
          label: chosen.label,
          isCurrent: chosen.isCurrent,
          seats: chosen.seats.flatMap((seat) => {
            const profile = directory.profiles.find((item) => item.userId === seat.userId);
            if (!profile) return [];
            return [
              {
                seatId: seat.id,
                boardRoleId: seat.boardRoleId,
                title: seat.title,
                name: profile.name,
                username: hasPage(profile) ? profile.username : null,
                photo: photoOf(profile),
              },
            ];
          }),
        }
      : null,
  };
}

/** null: there is no such page for this viewer (unknown, hidden, inactive). */
export function profileResult(
  directory: Directory,
  audience: Audience,
  username: string,
  currentYear: number,
): ProfileResult | null {
  const profile = directory.profiles.find((item) => item.username === username);
  if (!profile || !hasPage(profile)) return null;
  const teams = teamsOf(directory, profile);
  if (isRestrictedFor(audience, profile)) {
    return {
      kind: 'restricted',
      userId: profile.userId,
      username: profile.username,
      name: profile.name,
      teams,
      memberSince: profile.memberSince,
    };
  }
  return {
    kind: 'full',
    profile: {
      ...profile,
      photo: photoOf(profile),
      bio: profile.hideBio ? '' : profile.bio,
    },
    teams: profile.teams.flatMap((entry) => {
      const team = directory.teams.find((item) => item.id === entry.teamId);
      return team ? [{ team, role: entry.role }] : [];
    }),
    badges: profile.badges.flatMap((entry) => {
      const badge = directory.badges.find((item) => item.id === entry.badgeId);
      return badge ? [{ badge, note: entry.note, awardedAt: entry.awardedAt }] : [];
    }),
    role: memberRole(profile.teams, profile.memberSince, currentYear),
  };
}
