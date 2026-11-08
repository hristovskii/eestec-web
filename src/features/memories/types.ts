import type { EventCardModel } from '@/features/events';
import type { Paged } from '@/shared/data/paged';
import type { AnyMedia } from '@/shared/types/media';

// Memories (M17): stories with photos that members write about events and places. Draft →
// waiting for approval → published, or not approved (reason) → edit and resubmit. Editing a
// published Memory keeps the live version and queues one revision for the board (decided rule).

export const MEMORY_STATUSES = ['draft', 'pending', 'published', 'rejected'] as const;
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];

/** editor: written in the Memory editor; impression: a member ticked "Turn this into a Memories post". */
export type MemorySource = 'editor' | 'impression';

/**
 * One photo of the gallery. `fileId` points into the Memories photo store; sample Memories have no
 * file (`fileId: null`, `sample` = the canvas caption). Alt text is required to submit ('' = missing).
 */
export type MemoryPhoto = {
  id: string;
  fileId: string | null;
  sample: string | null;
  alt: string;
  caption: string;
};

export type MemoryCover = { fileId: string | null; sample: string | null; alt: string; credit: string };

/** Everything the author edits. A revision of a published Memory holds a full copy. */
export type MemoryContent = {
  title: string;
  /** A listed event, or null with `otherEventName`. */
  eventId: string | null;
  otherEventName: string;
  city: string;
  country: string;
  /** yyyy-mm-dd, optional. */
  happenedOn: string | null;
  /** Sanitized HTML. */
  body: string;
  cover: MemoryCover | null;
  photos: MemoryPhoto[];
};

export type MemoryRevision = {
  id: string;
  content: MemoryContent;
  status: 'pending' | 'rejected';
  /** Why the board said no ('' while pending). */
  reason: string;
  submittedAt: string;
  reviewedByName: string;
  reviewedAt: string | null;
};

export type MemoryRecord = {
  id: string;
  /** null until the first submit (drafts are reached by id). Kept for good afterwards. */
  slug: string | null;
  /** null after the author deleted the account: the Memory stays as "A former member". */
  authorId: string | null;
  authorDeleted: boolean;
  status: MemoryStatus;
  source: MemorySource;
  /** The live version when published, otherwise the draft being written. */
  content: MemoryContent;
  rejectionReason: string;
  reviewedByName: string;
  reviewedAt: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  featuredOnHome: boolean;
  readsCount: number;
  revision: MemoryRevision | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Read models ───

/** A card on /memories, Home, an event page, a profile. */
export type MemorySummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  eventId: string | null;
  otherEventName: string;
  city: string;
  country: string;
  cover: MemoryCover | null;
  authorId: string | null;
  authorDeleted: boolean;
  publishedAt: string;
};

export type MemoryPhotoFile = { mimeType: string; width: number; height: number; bytes: Uint8Array };

/** What the post page shows (the live content, or the author's draft in a preview). */
export type MemoryPost = MemorySummary & {
  status: MemoryStatus;
  body: string;
  happenedOn: string | null;
  photos: MemoryPhoto[];
  readMinutes: number;
  wordCount: number;
  featuredOnHome: boolean;
  readsCount: number;
};

/** The author's view of their own Memory: the record plus the version they are editing. */
export type OwnMemory = {
  record: MemoryRecord;
  /** The version shown in the editor: a pending/rejected revision if there is one, else the content. */
  editing: MemoryContent;
  /** 'live': editing a published Memory; 'draft': draft or not approved. */
  mode: 'draft' | 'live';
};

export type MemoryListItem = {
  id: string;
  slug: string | null;
  title: string;
  status: MemoryStatus;
  /** A published Memory with a revision waiting or not approved. */
  revision: 'pending' | 'rejected' | null;
  cover: MemoryCover | null;
  eventId: string | null;
  otherEventName: string;
  rejectionReason: string;
  publishedAt: string | null;
  submittedAt: string | null;
  updatedAt: string;
  readsCount: number;
};

export const MEMORY_SORTS = ['newest', 'oldest'] as const;
export type MemorySort = (typeof MEMORY_SORTS)[number];
export const MEMORIES_PAGE_SIZE = 12;

export type MemoriesQuery = {
  q: string;
  eventId: string | null;
  year: number | null;
  /** "City, Country" as in the place list, compared case-insensitively. */
  place: string | null;
  authorId: string | null;
  sort: MemorySort;
  page: number;
};

export type MemoryFacets = {
  /** Events that have a published Memory, with how many. */
  events: { eventId: string; count: number }[];
  years: number[];
  places: string[];
  authors: { authorId: string; count: number }[];
  /** Numbers under the intro: stories, events they are about, cities. */
  totals: { stories: number; events: number; cities: number };
};

// ─── Admin ───

export type AdminMemoryRow = MemoryListItem & {
  authorId: string | null;
  authorDeleted: boolean;
  featuredOnHome: boolean;
  source: MemorySource;
};

export type AdminMemoriesQuery = {
  q: string;
  status: MemoryStatus | 'all';
  page: number;
  pageSize: number;
};

export type AdminMemoryCounts = Record<MemoryStatus | 'all', number> & { revisions: number };

/** One line in the approval queue: a waiting Memory or a waiting revision of a published one. */
export type MemoryQueueItem = {
  /** The Memory id; the queue has at most one row per Memory. */
  id: string;
  kind: 'memory' | 'revision';
  title: string;
  authorId: string | null;
  eventId: string | null;
  otherEventName: string;
  photoCount: number;
  submittedAt: string;
};

export type MemoryReview = {
  record: MemoryRecord;
  /** The version to approve (the revision if there is one). */
  content: MemoryContent;
  kind: 'memory' | 'revision';
  submittedAt: string;
  /** Approved Memories of the same author before this one. */
  authorApproved: number;
  /** For a revision: what differs from the live version. */
  changes: MemoryChange[];
};

export type MemoryChange = 'title' | 'text' | 'cover' | 'photos' | 'event' | 'place' | 'date';

// ─── Results ───

export type SaveMemoryResult =
  | { status: 'saved'; record: MemoryRecord }
  | { status: 'not_found' }
  /** Waiting for the board: read-only for the author. */
  | { status: 'locked' };

export type SubmitMemoryResult =
  | { status: 'submitted'; record: MemoryRecord; revision: boolean }
  | { status: 'not_found' }
  | { status: 'locked' };

export type DecideMemoryResult =
  | { status: 'approved' | 'rejected'; record: MemoryRecord; kind: 'memory' | 'revision' }
  | { status: 'not_found' }
  | { status: 'not_pending' };

export type RetireResult = { deleted: number; kept: number };

export type MemoriesPage = Paged<MemorySummary>;

// ─── Public view models (resolved: images, event, language) ───

/** What a Memory shows about the event it is about (an event of the site, or free text). */
export type MemoryEventView = {
  /** Present when the event is a listed event of the site. */
  slug: string | null;
  title: string;
  /** Language of the title when it falls back (listed events only). */
  titleLang: string | null;
  href: string | null;
  typeName: string | null;
};

export type MemoryCardModel = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** City, country. */
  place: string;
  cover: AnyMedia | null;
  event: MemoryEventView;
  authorId: string | null;
  authorDeleted: boolean;
  publishedAt: string;
};

export type MemoryPhotoView = { image: AnyMedia; caption: string };

export type MemoryPostModel = {
  id: string;
  eventId: string | null;
  slug: string;
  title: string;
  /** Sanitized HTML. */
  body: string;
  status: MemoryStatus;
  place: string;
  publishedAt: string;
  happenedOn: string | null;
  readMinutes: number;
  wordCount: number;
  readsCount: number;
  cover: AnyMedia | null;
  photos: AnyMedia[];
  event: MemoryEventView;
  /** The linked event as a card (aside), when it is a listed event. */
  eventCard: EventCardModel | null;
  authorId: string | null;
  authorDeleted: boolean;
};

export type MemoriesFacetsView = {
  events: { id: string; slug: string; title: string; titleLang: string | null; count: number }[];
  years: number[];
  places: string[];
  authors: { authorId: string; count: number }[];
  totals: { stories: number; events: number; cities: number };
};

/**
 * A person shown as the author of a Memory: what the route got from `members` for the viewer. A
 * Memory by a deleted account has no author ("A former member").
 */
export type MemoryAuthor = {
  name: string;
  initials: string;
  /** null: the person has no page for this viewer. */
  username: string | null;
  photo: { src: string | null } | null;
  teams: string[];
  since: number;
  bio: string;
};
