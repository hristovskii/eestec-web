import type { Paged } from '@/shared/data/paged';

import type { Locale } from '@/shared/i18n/routing';

import type {
  AdminEventCounts,
  ArchiveFacets,
  ArchiveQuery,
  EventDetail,
  EventLink,
  EventSummary,
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

/** What the public site may show: listed = published (and past its "Publish on"); hidden = by link. */
export type PublicContext = { locale: Locale; now: Date; justEndedDays: number };

/**
 * Events (one table for upcoming and past, D1). The upcoming list arrives with M7. Public reads
 * return localized read models and never drafts.
 */
export interface EventsRepository {
  /** /events: past, listed events of one category. */
  listArchive(query: ArchiveQuery): Promise<Paged<EventSummary>>;
  archiveFacets(query: { now: Date }): Promise<ArchiveFacets>;
  /** A published or hidden event by its current address; null for drafts and unknown slugs. */
  findBySlug(slug: string, context: PublicContext): Promise<EventDetail | null>;
  /** Neighbours in the archive by start date (listed past events, any category). */
  findAdjacent(
    slug: string,
    context: PublicContext,
  ): Promise<{ prev: EventLink | null; next: EventLink | null }>;
  /** Addresses of listed past events (static params). */
  archiveSlugs(now: Date): Promise<string[]>;

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
