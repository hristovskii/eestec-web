import type { Paged } from '@/shared/data/paged';

import type { Committee, CommitteeCounts, CommitteeInput, CommitteeSort, CommitteeStatus } from '../types';

export type AdminCommitteesQuery = {
  q?: string;
  status?: CommitteeStatus;
  /** ISO code. */
  country?: string;
  sort: CommitteeSort;
  page: number;
  pageSize: number;
};

export type SaveCommitteeResult =
  { status: 'saved'; committee: Committee } | { status: 'duplicate' } | { status: 'not_found' };

export type RemoveCommitteesResult = {
  removed: string[];
  /** Our own committee (the red pin) can't be deleted: mark another one first. */
  keptHome: boolean;
};

/** Committees of the map (data-model.md: committees). */
export interface CommitteesRepository {
  /** Every committee, by name (the public map and list). */
  list(): Promise<Committee[]>;

  /** Admin: filtered, sorted, paged; counts per type ignore the type filter, not the search. */
  adminList(
    query: AdminCommitteesQuery,
  ): Promise<Paged<Committee> & { counts: CommitteeCounts; countries: string[] }>;
  get(id: string): Promise<Committee | null>;
  /**
   * Creates (no id) or replaces a committee. Name + country is unique. Marking one as ours moves
   * the highlight; the one that is ours stays ours until another is marked.
   */
  save(input: CommitteeInput, id?: string): Promise<SaveCommitteeResult>;
  remove(ids: readonly string[]): Promise<RemoveCommitteesResult>;
  /** CSV import: adds new committees and updates those with the same name and country. */
  importMany(rows: readonly CommitteeInput[]): Promise<{ created: number; updated: number }>;
}
