import type {
  AdminMemoriesQuery,
  AdminMemoryCounts,
  AdminMemoryRow,
  DecideMemoryResult,
  MemoriesPage,
  MemoriesQuery,
  MemoryContent,
  MemoryFacets,
  MemoryListItem,
  MemoryPost,
  MemoryQueueItem,
  MemoryRecord,
  MemoryReview,
  MemorySource,
  MemorySummary,
  OwnMemory,
  RetireResult,
  SaveMemoryResult,
  SubmitMemoryResult,
} from '../types';
import type { Paged } from '@/shared/data/paged';

/**
 * Memories (data-model.md: memories, memory_photos, memory_revisions). Public reads return
 * published Memories only. The author methods take the signed-in member's id (the caller has
 * checked who is signed in); the admin methods are for callers that checked the permission.
 * Files (photos) live in the photo store next to this repository, not in the rows.
 */
export interface MemoriesRepository {
  // ── Public reads (published only) ──
  list(query: MemoriesQuery): Promise<MemoriesPage>;
  /** What the filters offer and the numbers under the intro. */
  facets(): Promise<MemoryFacets>;
  /** The post page by address; null for drafts, waiting, not approved and unknown addresses. */
  findPost(slug: string): Promise<MemoryPost | null>;
  /** Newest first. `excludeId` leaves one Memory out ("More Memories from this event"). */
  listByEvent(eventId: string, options: { limit: number; excludeId?: string }): Promise<MemorySummary[]>;
  countByEvent(eventId: string): Promise<number>;
  listByAuthor(authorId: string, options: { limit: number }): Promise<MemorySummary[]>;
  countByAuthor(authorId: string): Promise<number>;
  /** Home: the ones the board features first, then the newest. */
  latest(limit: number): Promise<MemorySummary[]>;
  /** Addresses of every published Memory (sitemap, static params). */
  listSlugs(): Promise<string[]>;
  /** Counts a read of the post page (not for the author's own views). */
  countRead(slug: string): Promise<void>;

  // ── The author's own Memories ──
  /** Every Memory of this member, newest change first. */
  listMine(userId: string): Promise<MemoryListItem[]>;
  /** Published ones, for the "Also delete my Memories (n published)" line. */
  countPublishedBy(userId: string): Promise<number>;
  /** By address (any status) or id; null for someone else's. */
  findMine(userId: string, ref: { slug: string } | { id: string }): Promise<OwnMemory | null>;
  /** The author's view of the post page: their draft, waiting, rejected or live version. */
  findMinePost(userId: string, slugOrId: string): Promise<{ post: MemoryPost; own: OwnMemory } | null>;
  /**
   * Saves what is in the editor without checking it ("Save draft", autosave). New (no id) creates a
   * draft; a draft or not-approved Memory is overwritten; a published one keeps its live version and
   * the edit is kept only when submitted, so this refuses (`locked`) for pending and does nothing
   * for published (use `submit`).
   */
  saveDraft(userId: string, id: string | null, content: MemoryContent, now: Date): Promise<SaveMemoryResult>;
  /**
   * Sends it to the board. New / draft / not approved → pending (the address is made on the first
   * submit); published → a pending revision, the live version stays. The caller checked the rules.
   */
  submit(userId: string, id: string, content: MemoryContent, now: Date): Promise<SubmitMemoryResult>;
  /** A member's impression turned into a Memory: created waiting for the board. */
  createFromImpression(
    userId: string,
    content: MemoryContent,
    source: MemorySource,
    now: Date,
  ): Promise<MemoryRecord>;
  /** Deletes a draft or not-approved Memory of this member. */
  discard(userId: string, id: string): Promise<boolean>;
  /**
   * Deleting the account: Memories that are not published go; published ones go too when
   * `deletePublished`, otherwise they stay as "A former member" (no author id).
   */
  retire(userId: string, deletePublished: boolean): Promise<RetireResult>;

  // ── Admin ──
  adminList(query: AdminMemoriesQuery): Promise<Paged<AdminMemoryRow> & { counts: AdminMemoryCounts }>;
  /** The approval queue, oldest first. */
  queue(): Promise<MemoryQueueItem[]>;
  queueCount(): Promise<number>;
  /** One queue entry with what the reviewer needs; null when not waiting. */
  review(id: string): Promise<MemoryReview | null>;
  adminGet(id: string): Promise<MemoryRecord | null>;
  /**
   * The board's edit of a Memory (also "Edit before publishing"): replaces the live content of a
   * published one, the draft of others; a waiting revision is edited in place. Never changes status.
   */
  adminSave(
    id: string,
    content: MemoryContent,
    options: { featuredOnHome: boolean; revision: boolean },
    now: Date,
  ): Promise<MemoryRecord | null>;
  approve(
    id: string,
    input: { reviewerName: string; featuredOnHome?: boolean; now: Date },
  ): Promise<DecideMemoryResult>;
  reject(id: string, input: { reviewerName: string; reason: string; now: Date }): Promise<DecideMemoryResult>;
  /** Back to a draft (no new status); a waiting revision is dropped. */
  unpublish(id: string): Promise<MemoryRecord | null>;
  remove(id: string): Promise<boolean>;
  setFeatured(id: string, featured: boolean): Promise<MemoryRecord | null>;
}
