import type { Paged } from '@/shared/data/paged';

import type {
  AdminEventCounts,
  AdminEventFacets,
  AdminEventRow,
  AdminEventsQuery,
  ContentStatus,
  EventEditor,
  EventOption,
  EventRecord,
  EventTopic,
  EventType,
  TaxonomyUsage,
} from '../types';

/** What the edit form sends (the repository sets id, timestamps and the editor). */
export type EventInput = Omit<EventRecord, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>;

export type SaveEventResult =
  { status: 'saved'; record: EventRecord } | { status: 'slug_taken' } | { status: 'not_found' };

/**
 * Events (one table for upcoming and past, D1). The public archive, upcoming list and detail
 * methods arrive with the public pages (M6, M7).
 */
export interface EventsRepository {
  /** Every event as a choice, newest first (admin forms). */
  listOptions(): Promise<EventOption[]>;
  /** /admin/events: filtered, sorted, paged; counts per tab ignore the tab but not `onlyIds`. */
  adminList(query: AdminEventsQuery): Promise<Paged<AdminEventRow> & { counts: AdminEventCounts }>;
  adminFacets(query: { onlyIds?: readonly string[] }): Promise<AdminEventFacets>;
  get(id: string): Promise<EventRecord | null>;
  /**
   * Creates (no id) or replaces an event. Changing the slug of a published event keeps the old
   * address as a redirect (decided rule).
   */
  save(input: EventInput & { id?: string }, editor: EventEditor, now: Date): Promise<SaveEventResult>;
  /** Bulk Publish / Move to draft / Hide. Returns the ids that changed. */
  setStatus(ids: readonly string[], status: ContentStatus, editor: EventEditor, now: Date): Promise<string[]>;
  /** Deletes events (their gallery links and redirects go with them; the files stay in the library). */
  remove(ids: readonly string[]): Promise<string[]>;
  /** Is this address used by another event (or kept as a redirect of one)? */
  slugTaken(slug: string, exceptId?: string): Promise<boolean>;
  /** Old addresses → current slug (the proxy uses them in M6). */
  redirectFor(slug: string): Promise<string | null>;
}

export type TaxonomyKind = 'types' | 'topics';
type TaxonomyItem = EventType | EventTopic;

export type RemoveTaxonomyResult =
  | { status: 'removed' }
  | { status: 'not_found' }
  /** A type in use needs another type for its events. */
  | { status: 'replacement_required'; eventCount: number };

/** Event types and topics (Admin › Events › Event types & topics). */
export interface EventTaxonomyRepository {
  list(kind: TaxonomyKind): Promise<TaxonomyUsage<TaxonomyItem>[]>;
  create(kind: TaxonomyKind, name: TaxonomyItem['name']): Promise<TaxonomyItem>;
  rename(kind: TaxonomyKind, id: string, name: TaxonomyItem['name']): Promise<TaxonomyItem | null>;
  /** `ids` in the new order; must be exactly the current ids. */
  reorder(kind: TaxonomyKind, ids: readonly string[]): Promise<boolean>;
  /** Topics are simply taken off their events; a type in use moves its events to `replacementId`. */
  remove(kind: TaxonomyKind, id: string, replacementId?: string): Promise<RemoveTaxonomyResult>;
}
