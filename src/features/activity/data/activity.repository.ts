import type { Paged } from '@/shared/data/paged';

import type { ActivityActor, ActivityEntry, ActivityQuery } from '../types';

/** The activity log: newest first, never edited. */
export interface ActivityRepository {
  list(query: ActivityQuery): Promise<Paged<ActivityEntry> & { actors: ActivityActor[] }>;
  /**
   * Adds an entry (mock data). In the backend phase database triggers write the log, and this
   * becomes a no-op so actions don't need to change.
   */
  record(entry: Omit<ActivityEntry, 'id'>): Promise<void>;
}
