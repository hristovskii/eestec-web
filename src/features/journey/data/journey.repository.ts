import type { JourneyInput, JourneyRecord } from '../types';

/** The content of the Journey page and the Home teaser (data-model.md: journey_steps, journey_quotes, page_blocks journey). */
export interface JourneyRepository {
  /** Everything, in both languages. */
  get(): Promise<JourneyRecord>;
  /** Replaces everything Admin › Pages › Journey edits; returns the stored result. */
  save(input: JourneyInput): Promise<JourneyRecord>;
}
