import { paginate } from '@/shared/data/paged';

import type { AdminMemberCounts, AdminMembersQuery, Profile, Team } from '../types';

// Admin › Members: the list over every profile (all statuses), as a pure function like `directory.ts`.

const lower = (text: string) => text.trim().toLocaleLowerCase('en');
const byName = (a: Profile, b: Profile) => a.name.localeCompare(b.name, 'en');
const STATUS_ORDER = { active: 0, alumni: 1, inactive: 2, hidden: 3 } as const;

export function adminMembers(profiles: readonly Profile[], teams: readonly Team[], query: AdminMembersQuery) {
  const needle = lower(query.q ?? '');
  const team = query.team ? teams.find((item) => item.slug === query.team) : undefined;
  const matching = profiles.filter(
    (profile) =>
      (!needle || lower(profile.name).includes(needle) || lower(profile.username).includes(needle)) &&
      (!query.team || (!!team && profile.teams.some((entry) => entry.teamId === team.id))),
  );
  const counts: AdminMemberCounts = { all: matching.length, active: 0, alumni: 0, inactive: 0, hidden: 0 };
  for (const profile of matching) counts[profile.status] += 1;

  const rows = matching.filter((profile) => !query.status || profile.status === query.status);
  const sorted = [...rows].sort((a, b) => {
    switch (query.sort) {
      case 'name':
        return byName(a, b);
      case '-name':
        return byName(b, a);
      case 'since':
        return a.memberSince.localeCompare(b.memberSince) || byName(a, b);
      case '-since':
        return b.memberSince.localeCompare(a.memberSince) || byName(a, b);
      case 'status':
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byName(a, b);
    }
  });
  return { ...paginate(sorted, query.page, query.pageSize), counts };
}
