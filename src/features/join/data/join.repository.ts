import type { JoinInput, JoinRecord } from '../types';

/** The content of the Join Us page (data-model.md: page_blocks join, join_benefits, join_steps, join_rules, faq_items, documents). */
export interface JoinRepository {
  /** Everything, in both languages. */
  get(): Promise<JoinRecord>;
  /** Replaces everything Admin › Pages › Join Us edits; returns the stored result. */
  save(input: JoinInput): Promise<JoinRecord>;
}
