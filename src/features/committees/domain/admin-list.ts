import { type Paged, paginate } from '@/shared/data/paged';
import { countryName } from '@/shared/i18n/country';

import type { Committee, CommitteeCounts } from '../types';
import type { AdminCommitteesQuery } from '../data/committees.repository';

export const committeeByName = (a: Committee, b: Committee) => a.name.localeCompare(b.name, 'en');

/**
 * The admin list over every committee: search (name, city, country name), country and type filter,
 * sort and page. The map has about sixty rows, so both repositories filter in memory with this one
 * function; the counts per type ignore the type filter but not the search.
 */
export function adminCommitteeList(
  committees: readonly Committee[],
  query: AdminCommitteesQuery,
): Paged<Committee> & { counts: CommitteeCounts; countries: string[] } {
  const needle = query.q?.trim().toLowerCase();
  const matching = committees.filter(
    (committee) =>
      (!query.country || committee.country === query.country) &&
      (!needle ||
        committee.name.toLowerCase().includes(needle) ||
        committee.city.mk.toLowerCase().includes(needle) ||
        !!committee.city.en?.toLowerCase().includes(needle) ||
        countryName(committee.country, 'en').toLowerCase().includes(needle)),
  );
  const counts: CommitteeCounts = { all: matching.length, lc: 0, observer: 0, jlc: 0 };
  for (const committee of matching) counts[committee.status] += 1;
  const rows = matching.filter((committee) => !query.status || committee.status === query.status);
  const sorted = [...rows].sort((a, b) => {
    switch (query.sort) {
      case 'name':
        return committeeByName(a, b);
      case '-name':
        return committeeByName(b, a);
      case 'country':
        return (
          countryName(a.country, 'en').localeCompare(countryName(b.country, 'en')) || committeeByName(a, b)
        );
      case '-country':
        return (
          countryName(b.country, 'en').localeCompare(countryName(a.country, 'en')) || committeeByName(a, b)
        );
      case 'status':
        return a.status.localeCompare(b.status) || committeeByName(a, b);
    }
  });
  const countries = [...new Set(committees.map((committee) => committee.country))].sort((a, b) =>
    countryName(a, 'en').localeCompare(countryName(b, 'en')),
  );
  return { ...paginate(structuredClone(sorted), query.page, query.pageSize), counts, countries };
}
