import type { ContactPageInput, ContactPageRecord } from '../types';

/** The content of the Contact page: texts, subjects with their routing, and the map (data-model.md: contact_subjects, page_blocks contact). */
export interface ContactRepository {
  /** Everything, in both languages. */
  get(): Promise<ContactPageRecord>;
  /** Replaces everything Admin › Pages › Contact edits; returns the stored result. */
  save(input: ContactPageInput): Promise<ContactPageRecord>;
}
