import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { paginate } from '@/shared/data/paged';
import { countryName } from '@/shared/i18n/country';

import type { Committee, CommitteeCounts } from '../types';
import type { CommitteesRepository } from './committees.repository';
import { committeesFixture } from './fixtures/committees';

const tables = () =>
  mockTable<{ committees: Committee[] }>('committees', () => ({ committees: committeesFixture }));

const key = (committee: Pick<Committee, 'name' | 'country'>) =>
  `${committee.name.trim().toLowerCase()}|${committee.country}`;
const byName = (a: Committee, b: Committee) => a.name.localeCompare(b.name, 'en');
const newId = () => `cm-${crypto.randomUUID().slice(0, 8)}`;

export function createMockCommitteesRepository(): CommitteesRepository {
  const db = tables();

  /** Exactly one committee is ours: marking another moves the highlight. */
  const claimHome = (id: string) => {
    for (const committee of db.committees) committee.isHome = committee.id === id;
  };

  return {
    list() {
      return Promise.resolve(structuredClone([...db.committees].sort(byName)));
    },

    adminList(query) {
      const needle = query.q?.trim().toLowerCase();
      const matching = db.committees.filter(
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
            return byName(a, b);
          case '-name':
            return byName(b, a);
          case 'country':
            return countryName(a.country, 'en').localeCompare(countryName(b.country, 'en')) || byName(a, b);
          case '-country':
            return countryName(b.country, 'en').localeCompare(countryName(a.country, 'en')) || byName(a, b);
          case 'status':
            return a.status.localeCompare(b.status) || byName(a, b);
        }
      });
      const countries = [...new Set(db.committees.map((committee) => committee.country))].sort((a, b) =>
        countryName(a, 'en').localeCompare(countryName(b, 'en')),
      );
      return Promise.resolve({
        ...paginate(structuredClone(sorted), query.page, query.pageSize),
        counts,
        countries,
      });
    },

    get(id) {
      const committee = db.committees.find((candidate) => candidate.id === id);
      return Promise.resolve(committee ? structuredClone(committee) : null);
    },

    save(input, id) {
      const existing = id ? db.committees.find((candidate) => candidate.id === id) : undefined;
      if (id && !existing) return Promise.resolve({ status: 'not_found' });
      const taken = db.committees.some((candidate) => candidate.id !== id && key(candidate) === key(input));
      if (taken) return Promise.resolve({ status: 'duplicate' });
      const committee: Committee = { ...structuredClone(input), id: existing?.id ?? newId() };
      // The one that is ours stays ours until another is marked.
      if (existing?.isHome) committee.isHome = true;
      if (existing) db.committees[db.committees.indexOf(existing)] = committee;
      else db.committees.push(committee);
      if (committee.isHome) claimHome(committee.id);
      return Promise.resolve({ status: 'saved', committee: structuredClone(committee) });
    },

    remove(ids) {
      const doomed = db.committees.filter((committee) => ids.includes(committee.id));
      const removed = doomed.filter((committee) => !committee.isHome).map((committee) => committee.id);
      db.committees = db.committees.filter((committee) => !removed.includes(committee.id));
      return Promise.resolve({ removed, keptHome: doomed.some((committee) => committee.isHome) });
    },

    importMany(rows) {
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const existing = db.committees.find((candidate) => key(candidate) === key(row));
        if (existing) {
          // Imports never move the highlight.
          Object.assign(existing, structuredClone(row), { id: existing.id, isHome: existing.isHome });
          updated += 1;
        } else {
          db.committees.push({ ...structuredClone(row), id: newId(), isHome: false });
          created += 1;
        }
      }
      return Promise.resolve({ created, updated });
    },
  };
}
