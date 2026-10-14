import type { HomeInput, HomeRecord } from '../types';

/** The content of the Home page (data-model.md: page_blocks home, home_activities, timeline_milestones, home_stats). */
export interface HomeRepository {
  /** Everything, in both languages (public reads resolve it; the admin form edits it). */
  get(): Promise<HomeRecord>;
  /** Replaces everything Admin › Pages › Home edits; returns the stored result. */
  save(input: HomeInput): Promise<HomeRecord>;
}
