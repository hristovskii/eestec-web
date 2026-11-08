import type { IdeaFormSettings } from '../types';

/** The texts and idea types of /submit (data-model.md: idea_types, page_blocks submit). */
export interface IdeaFormRepository {
  /** Everything, in both languages. */
  get(): Promise<IdeaFormSettings>;
  /** Replaces everything Form settings edits; returns the stored result. */
  save(input: IdeaFormSettings): Promise<IdeaFormSettings>;
}
