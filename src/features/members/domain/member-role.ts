import type { MemberRoleKey, ProfileTeam } from '../types';

/**
 * The line on a card: team lead before trainer before "new member" (joined this year) before plain
 * member. With several teams the highest role wins.
 */
export function memberRole(
  teams: readonly Pick<ProfileTeam, 'role'>[],
  memberSince: string,
  currentYear: number,
): MemberRoleKey {
  if (teams.some((team) => team.role === 'lead')) return 'lead';
  if (teams.some((team) => team.role === 'trainer')) return 'trainer';
  return yearOf(memberSince) === currentYear ? 'new' : 'member';
}

/** The year of an ISO date ("2023-10-01" → 2023), read without time zones. */
export const yearOf = (isoDate: string) => Number(isoDate.slice(0, 4));
