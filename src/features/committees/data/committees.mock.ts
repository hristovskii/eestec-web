import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import { adminCommitteeList, committeeByName } from '../domain/admin-list';
import type { Committee } from '../types';
import type { CommitteesRepository } from './committees.repository';
import { committeesFixture } from './fixtures/committees';

const tables = () =>
  mockTable<{ committees: Committee[] }>('committees', () => ({ committees: committeesFixture }));

const key = (committee: Pick<Committee, 'name' | 'country'>) =>
  `${committee.name.trim().toLowerCase()}|${committee.country}`;
const newId = () => `cm-${crypto.randomUUID().slice(0, 8)}`;

export function createMockCommitteesRepository(): CommitteesRepository {
  const db = tables();

  /** Exactly one committee is ours: marking another moves the highlight. */
  const claimHome = (id: string) => {
    for (const committee of db.committees) committee.isHome = committee.id === id;
  };

  return {
    list() {
      return Promise.resolve(structuredClone([...db.committees].sort(committeeByName)));
    },

    adminList(query) {
      return Promise.resolve(adminCommitteeList(db.committees, query));
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
