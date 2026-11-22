import 'server-only';

import { pageWindow, type Paged } from '@/shared/data/paged';
import { NotImplementedError, type RepoScope } from '@/shared/data/select-implementation';
import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { DataError, toDataError, unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import { isoOf, isoOrNull } from '@/shared/data/supabase/time';

import { changesBetween } from '../domain/memory-changes';
import { listItemOf, postOf, summaryOf } from '../domain/memory-views';
import type {
  AdminMemoryCounts,
  AdminMemoryRow,
  MemoryContent,
  MemoryCover,
  MemoryFacets,
  MemoryListItem,
  MemoryPhoto,
  MemoryQueueItem,
  MemoryRecord,
  MemoryRevision,
  MemoryStatus,
  MemorySummary,
} from '../types';
import { MEMORIES_PAGE_SIZE } from '../types';
import type { MemoriesRepository } from './memories.repository';

// ─── What the tables hand over ───

/** What anyone may read of a published Memory (the grant of `anon`). */
const PUBLIC_COLUMNS =
  'id, author_id, author_deleted, slug, status, source, title, body, event_id, other_event_name, city, country, happened_on, cover_media_id, cover_sample, cover_alt, cover_credit, featured_on_home, published_at, reads_count, created_at, updated_at' as const;
/** The same plus what only the author and the board may read (the grant of `authenticated`). */
const MEMBER_COLUMNS =
  'id, author_id, author_deleted, slug, status, source, title, body, event_id, other_event_name, city, country, happened_on, cover_media_id, cover_sample, cover_alt, cover_credit, featured_on_home, published_at, reads_count, created_at, updated_at, rejection_reason, reviewed_by_name, reviewed_at, submitted_at' as const;

type PublicRow = Pick<
  Tables<'memories'>,
  | 'id'
  | 'author_id'
  | 'author_deleted'
  | 'slug'
  | 'status'
  | 'source'
  | 'title'
  | 'body'
  | 'event_id'
  | 'other_event_name'
  | 'city'
  | 'country'
  | 'happened_on'
  | 'cover_media_id'
  | 'cover_sample'
  | 'cover_alt'
  | 'cover_credit'
  | 'featured_on_home'
  | 'published_at'
  | 'reads_count'
  | 'created_at'
  | 'updated_at'
>;
type MemberRow = PublicRow &
  Pick<Tables<'memories'>, 'rejection_reason' | 'reviewed_by_name' | 'reviewed_at' | 'submitted_at'>;
type RowAny = PublicRow & Partial<MemberRow>;

type PhotoRow = Pick<Tables<'memory_photos'>, 'id' | 'media_id' | 'sample_caption' | 'alt' | 'caption'> & {
  memory_id?: string;
  revision_id?: string;
  sort_order: number;
};

/** The content a revision keeps in its `content` column (everything but the photos). */
type RevisionJson = {
  title?: string;
  eventId?: string | null;
  otherEventName?: string;
  city?: string;
  country?: string;
  happenedOn?: string | null;
  body?: string;
  cover?: { fileId?: string | null; sample?: string | null; alt?: string; credit?: string } | null;
};

type Sizes = Record<string, { width: number; height: number }>;

const MEDIA_KINDS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** The row count of a `count: 'exact'` query; a failed one throws. */
function countOf(result: { count: number | null; error: { code: string; message: string } | null }): number {
  if (result.error) throw toDataError(result.error);
  return result.count ?? 0;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

// ─── Mapping ───

const sizeOf = (sizes: Sizes, fileId: string | null | undefined) => {
  const found = fileId ? sizes[fileId] : undefined;
  return found ? { width: found.width, height: found.height } : {};
};

function coverOf(
  fileId: string | null | undefined,
  sample: string | null | undefined,
  alt: string | null | undefined,
  credit: string | null | undefined,
  sizes: Sizes,
): MemoryCover | null {
  if (!fileId && !sample) return null;
  return {
    fileId: fileId ?? null,
    sample: sample ?? null,
    alt: alt ?? '',
    credit: credit ?? '',
    ...sizeOf(sizes, fileId),
  };
}

const photoOf = (row: PhotoRow, sizes: Sizes): MemoryPhoto => ({
  id: row.id,
  fileId: row.media_id,
  sample: row.sample_caption,
  alt: row.alt,
  caption: row.caption,
  ...sizeOf(sizes, row.media_id),
});

function liveContent(row: PublicRow, photos: PhotoRow[], sizes: Sizes): MemoryContent {
  return {
    title: row.title,
    eventId: row.event_id,
    otherEventName: row.other_event_name,
    city: row.city,
    country: row.country,
    happenedOn: row.happened_on,
    body: row.body,
    cover: coverOf(row.cover_media_id, row.cover_sample, row.cover_alt, row.cover_credit, sizes),
    photos: photos.map((photo) => photoOf(photo, sizes)),
  };
}

function revisionContent(json: RevisionJson, photos: PhotoRow[], sizes: Sizes): MemoryContent {
  return {
    title: json.title ?? '',
    eventId: json.eventId || null,
    otherEventName: json.otherEventName ?? '',
    city: json.city ?? '',
    country: json.country ?? '',
    happenedOn: json.happenedOn || null,
    body: json.body ?? '',
    cover: json.cover
      ? coverOf(json.cover.fileId, json.cover.sample, json.cover.alt, json.cover.credit, sizes)
      : null,
    photos: photos.map((photo) => photoOf(photo, sizes)),
  };
}

function recordOf(
  row: RowAny,
  photos: PhotoRow[],
  revision: MemoryRevision | null,
  sizes: Sizes,
): MemoryRecord {
  return {
    id: row.id,
    slug: row.slug,
    authorId: row.author_id,
    authorDeleted: row.author_deleted,
    status: row.status,
    source: row.source,
    content: liveContent(row, photos, sizes),
    rejectionReason: row.rejection_reason ?? '',
    reviewedByName: row.reviewed_by_name ?? '',
    reviewedAt: isoOrNull(row.reviewed_at ?? null),
    submittedAt: isoOrNull(row.submitted_at ?? null),
    publishedAt: isoOrNull(row.published_at),
    featuredOnHome: row.featured_on_home,
    readsCount: row.reads_count,
    revision,
    createdAt: isoOf(row.created_at),
    updatedAt: isoOf(row.updated_at),
  };
}

const byOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

/** What the editor sends, in the shape the RPCs read. */
const contentJson = (content: MemoryContent) =>
  toJson({
    title: content.title,
    eventId: content.eventId,
    otherEventName: content.otherEventName,
    city: content.city,
    country: content.country,
    happenedOn: content.happenedOn,
    body: content.body,
    cover: content.cover
      ? {
          fileId: content.cover.fileId,
          sample: content.cover.sample,
          alt: content.cover.alt,
          credit: content.cover.credit,
        }
      : null,
    photos: content.photos.map((photo) => ({
      fileId: photo.fileId,
      sample: photo.sample,
      alt: photo.alt,
      caption: photo.caption,
    })),
  });

/**
 * Memories on a database. Readers see what row-level security lets them: published Memories to everyone, an author's own
 * to them, everything to the board. Records are put together here from the rows; the rules that must hold together (what
 * a submit, a decision or a photo change touches) are the SQL functions of 0008 and 0023.
 */
export function createSupabaseMemoriesRepository(client: DbClient, _scope: RepoScope): MemoriesRepository {
  async function sizesOf(ids: (string | null | undefined)[]): Promise<Sizes> {
    const wanted = [...new Set(ids.filter((id): id is string => !!id))];
    if (wanted.length === 0) return {};
    return unwrap(await client.rpc('memory_media_sizes', { p_ids: wanted })) as unknown as Sizes;
  }

  const fileIdsOf = (rows: RowAny[], photos: PhotoRow[]) => [
    ...rows.map((row) => row.cover_media_id),
    ...photos.map((photo) => photo.media_id),
  ];

  /** Published Memories by id, in the order of `ids` (cards and posts for anyone). */
  async function publicRecords(ids: string[]): Promise<MemoryRecord[]> {
    if (ids.length === 0) return [];
    const rows = unwrap(
      await client.from('memories').select(PUBLIC_COLUMNS).in('id', ids).eq('status', 'published'),
    ) as PublicRow[];
    const sizes = await sizesOf(rows.map((row) => row.cover_media_id));
    const byId = new Map(rows.map((row) => [row.id, recordOf(row, [], null, sizes)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  const summariesOf = async (ids: string[]): Promise<MemorySummary[]> =>
    (await publicRecords(ids)).map(summaryOf);

  type Page = { total: number; ids: string[] };
  async function page(args: {
    q?: string;
    eventId?: string | null;
    year?: number | null;
    place?: string | null;
    authorId?: string | null;
    sort?: 'newest' | 'oldest';
    featuredFirst?: boolean;
    excludeId?: string;
    limit: number;
    offset: number;
  }): Promise<Page> {
    const result = unwrap(
      await client.rpc('memory_page', {
        p_q: args.q ?? '',
        p_event: args.eventId ?? undefined,
        p_year: args.year ?? undefined,
        p_place: args.place ?? undefined,
        p_author: args.authorId ?? undefined,
        p_sort: args.sort ?? 'newest',
        p_featured_first: args.featuredFirst ?? false,
        p_exclude: args.excludeId ?? undefined,
        p_limit: args.limit,
        p_offset: args.offset,
      }),
    ) as unknown as { total: number; ids: string[] };
    return { total: Number(result.total), ids: result.ids };
  }

  /** Full records (live content, photos and the waiting or refused revision) for the author and the board. */
  async function records(ids: string[]): Promise<MemoryRecord[]> {
    if (ids.length === 0) return [];
    const [rows, photos, revisions] = await Promise.all([
      client.from('memories').select(MEMBER_COLUMNS).in('id', ids),
      client
        .from('memory_photos')
        .select('id, memory_id, media_id, sample_caption, alt, caption, sort_order')
        .in('memory_id', ids),
      client
        .from('memory_revisions')
        .select('id, memory_id, status, content, reason, submitted_at, reviewed_by_name, reviewed_at')
        .in('memory_id', ids),
    ]);
    const memoryRows = unwrap(rows) as MemberRow[];
    const photoRows = unwrap(photos) as PhotoRow[];
    const revisionRows = unwrap(revisions);
    const revisionPhotoRows =
      revisionRows.length === 0
        ? []
        : (unwrap(
            await client
              .from('memory_revision_photos')
              .select('id, revision_id, media_id, sample_caption, alt, caption, sort_order')
              .in(
                'revision_id',
                revisionRows.map((revision) => revision.id),
              ),
          ) as PhotoRow[]);
    const revisionCovers = revisionRows.map((revision) => (revision.content as RevisionJson).cover?.fileId);
    const sizes = await sizesOf([
      ...fileIdsOf(memoryRows, [...photoRows, ...revisionPhotoRows]),
      ...revisionCovers,
    ]);

    const byId = new Map(
      memoryRows.map((row) => {
        const own = photoRows.filter((photo) => photo.memory_id === row.id).sort(byOrder);
        const found = revisionRows.find((revision) => revision.memory_id === row.id);
        const revision: MemoryRevision | null = found
          ? {
              id: found.id,
              content: revisionContent(
                found.content as RevisionJson,
                revisionPhotoRows.filter((photo) => photo.revision_id === found.id).sort(byOrder),
                sizes,
              ),
              status: found.status,
              reason: found.reason,
              submittedAt: isoOf(found.submitted_at),
              reviewedByName: found.reviewed_by_name,
              reviewedAt: isoOrNull(found.reviewed_at),
            }
          : null;
        return [row.id, recordOf(row, own, revision, sizes)] as const;
      }),
    );
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async function record(id: string): Promise<MemoryRecord | null> {
    return isUuid(id) ? ((await records([id]))[0] ?? null) : null;
  }

  async function ownRecord(
    userId: string,
    ref: { slug: string } | { id: string },
  ): Promise<MemoryRecord | null> {
    if (!isUuid(userId)) return null;
    let query = client.from('memories').select('id').eq('author_id', userId);
    if ('id' in ref) {
      if (!isUuid(ref.id)) return null;
      query = query.eq('id', ref.id);
    } else query = query.eq('slug', ref.slug);
    const found = unwrapMaybe(await query.maybeSingle());
    return found ? record(found.id) : null;
  }

  const ownView = (found: MemoryRecord) => ({
    record: found,
    editing: found.revision ? found.revision.content : found.content,
    mode: found.status === 'published' ? ('live' as const) : ('draft' as const),
  });

  const isWaiting = (found: MemoryRecord) =>
    found.status === 'pending' || (found.status === 'published' && found.revision?.status === 'pending');

  const queueItem = (
    row:
      | Tables<'memory_queue'>
      | {
          id: string | null;
          kind: string | null;
          author_id: string | null;
          submitted_at: string | null;
          title: string | null;
          event_id: string | null;
          other_event_name: string | null;
          photo_count: number | null;
        },
  ): MemoryQueueItem => ({
    id: row.id!,
    kind: row.kind === 'revision' ? 'revision' : 'memory',
    title: row.title ?? '',
    authorId: row.author_id,
    eventId: row.event_id,
    otherEventName: row.other_event_name ?? '',
    photoCount: Number(row.photo_count ?? 0),
    submittedAt: isoOf(row.submitted_at!),
  });

  async function decide(
    id: string,
    approve: boolean,
    reason: string,
    featured: boolean | null,
  ): Promise<
    | { status: 'approved' | 'rejected'; record: MemoryRecord; kind: 'memory' | 'revision' }
    | { status: 'not_found' | 'not_pending' }
  > {
    if (!isUuid(id)) return { status: 'not_found' };
    const result = unwrap(
      await client.rpc('memory_decide', {
        p_id: id,
        p_approve: approve,
        p_reason: reason,
        p_featured: featured as boolean,
      }),
    ) as unknown as {
      status: 'approved' | 'rejected' | 'not_found' | 'not_pending';
      kind?: 'memory' | 'revision';
    };
    if (result.status === 'not_found' || result.status === 'not_pending') return { status: result.status };
    const found = await record(id);
    if (!found) return { status: 'not_found' };
    return { status: result.status, record: found, kind: result.kind ?? 'memory' };
  }

  return {
    // ─── Public reads ───
    async list(query) {
      const base = {
        q: query.q,
        eventId: query.eventId,
        year: query.year,
        place: query.place,
        authorId: query.authorId,
        sort: query.sort,
      };
      if (
        (query.eventId !== null && !isUuid(query.eventId)) ||
        (query.authorId !== null && !isUuid(query.authorId))
      ) {
        const empty: Paged<MemorySummary> = {
          items: [],
          total: 0,
          page: 1,
          pageSize: MEMORIES_PAGE_SIZE,
          pageCount: 1,
        };
        return empty;
      }
      let window = pageWindow(0, query.page, MEMORIES_PAGE_SIZE);
      let found = await page({
        ...base,
        limit: MEMORIES_PAGE_SIZE,
        offset: (Math.max(1, query.page) - 1) * MEMORIES_PAGE_SIZE,
      });
      // A page past the end shows the last one, as the mock does.
      window = pageWindow(found.total, query.page, MEMORIES_PAGE_SIZE);
      if (found.ids.length === 0 && found.total > 0)
        found = await page({ ...base, limit: MEMORIES_PAGE_SIZE, offset: window.from });
      return {
        items: await summariesOf(found.ids),
        total: found.total,
        page: window.page,
        pageSize: MEMORIES_PAGE_SIZE,
        pageCount: window.pageCount,
      };
    },

    async facets() {
      return unwrap(await client.rpc('memory_facets')) as unknown as MemoryFacets;
    },

    async findPost(slug) {
      const row = unwrapMaybe(
        await client
          .from('memories')
          .select(PUBLIC_COLUMNS)
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle(),
      );
      if (!row) return null;
      const photos = unwrap(
        await client
          .from('memory_photos')
          .select('id, media_id, sample_caption, alt, caption, sort_order')
          .eq('memory_id', row.id),
      ) as PhotoRow[];
      const sizes = await sizesOf(fileIdsOf([row], photos));
      return postOf(recordOf(row, photos.sort(byOrder), null, sizes));
    },

    async listByEvent(eventId, { limit, excludeId }) {
      if (!isUuid(eventId)) return [];
      const found = await page({
        eventId,
        excludeId: excludeId && isUuid(excludeId) ? excludeId : undefined,
        limit,
        offset: 0,
      });
      return summariesOf(found.ids);
    },
    async countByEvent(eventId) {
      return isUuid(eventId) ? (await page({ eventId, limit: 0, offset: 0 })).total : 0;
    },
    async listByAuthor(authorId, { limit }) {
      if (!isUuid(authorId)) return [];
      return summariesOf((await page({ authorId, limit, offset: 0 })).ids);
    },
    async countByAuthor(authorId) {
      return isUuid(authorId) ? (await page({ authorId, limit: 0, offset: 0 })).total : 0;
    },
    async latest(limit) {
      return summariesOf((await page({ featuredFirst: true, limit, offset: 0 })).ids);
    },
    async listSlugs() {
      const rows = unwrap(
        await client
          .from('memories')
          .select('slug')
          .eq('status', 'published')
          .not('slug', 'is', null)
          .order('published_at', { ascending: false }),
      );
      return rows.flatMap((row) => (row.slug ? [row.slug] : []));
    },
    async countRead(slug) {
      unwrap(await client.rpc('memory_count_read', { p_slug: slug }));
    },

    // ─── Photo files ───
    /** Uploads into the member's own folder, then the database registers it (with the size the browser measured). */
    async storePhoto(userId, photo) {
      if (!isUuid(userId)) throw new DataError('forbidden', 'There is no member to store a photo for');
      const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[photo.mimeType] ?? 'jpg'}`;
      const { error } = await client.storage
        .from('memory-photos')
        .upload(path, photo.bytes, { contentType: photo.mimeType, upsert: false });
      if (error)
        throw new DataError(
          /row-level security|unauthorized|forbidden/i.test(error.message) ? 'forbidden' : 'invalid',
          error.message,
        );
      const registered = await client.rpc('register_memory_photo', {
        p_path: path,
        p_mime: photo.mimeType,
        p_size: photo.bytes.byteLength,
        p_width: photo.width,
        p_height: photo.height,
      });
      if (registered.error) {
        await client.storage
          .from('memory-photos')
          .remove([path])
          .catch(() => undefined);
        unwrap(registered);
      }
      return registered.data as string;
    },

    /** Read as the viewer: the database names the file only where the viewer may see it, and Storage checks the same rule. */
    async photoFile(fileId) {
      if (!isUuid(fileId)) return null;
      const path = unwrap(await client.rpc('memory_photo_path', { p_media: fileId })) as string | null;
      if (!path) return null;
      const downloaded = await client.storage.from('memory-photos').download(path);
      if (downloaded.error || !downloaded.data) return null;
      const extension = path.slice(path.lastIndexOf('.') + 1) as keyof typeof MEDIA_KINDS;
      return {
        mimeType: MEDIA_KINDS[extension] ?? 'image/jpeg',
        bytes: new Uint8Array(await downloaded.data.arrayBuffer()),
      };
    },

    // ─── The author's own Memories ───
    async listMine(userId) {
      if (!isUuid(userId)) return [];
      const rows = unwrap(
        await client
          .from('memories')
          .select('id')
          .eq('author_id', userId)
          .order('updated_at', { ascending: false }),
      );
      const items = await records(rows.map((row) => row.id));
      return items.map((found): MemoryListItem => listItemOf(found));
    },
    async countPublishedBy(userId) {
      if (!isUuid(userId)) return 0;
      return countOf(
        await client
          .from('memories')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', userId)
          .eq('status', 'published'),
      );
    },
    async findMine(userId, ref) {
      const found = await ownRecord(userId, ref);
      return found ? ownView(found) : null;
    },
    async findMinePost(userId, slugOrId) {
      const found =
        (await ownRecord(userId, { slug: slugOrId })) ?? (await ownRecord(userId, { id: slugOrId }));
      return found ? { post: postOf(found), own: ownView(found) } : null;
    },

    async saveDraft(userId, id, content) {
      if (id !== null && !isUuid(id)) return { status: 'not_found' };
      const result = unwrap(
        await client.rpc('memory_save_draft', { p_id: id as string, p_content: contentJson(content) }),
      ) as unknown as { status: 'saved' | 'not_found' | 'locked'; id?: string };
      if (result.status !== 'saved' || !result.id)
        return { status: result.status === 'locked' ? 'locked' : 'not_found' };
      const saved = await record(result.id);
      return saved ? { status: 'saved', record: saved } : { status: 'not_found' };
    },

    async submit(userId, id, content) {
      if (!isUuid(id)) return { status: 'not_found' };
      const result = unwrap(
        await client.rpc('memory_submit', { p_id: id, p_content: contentJson(content) }),
      ) as unknown as { status: 'submitted' | 'not_found' | 'locked'; revision?: boolean };
      if (result.status !== 'submitted')
        return { status: result.status === 'locked' ? 'locked' : 'not_found' };
      const submitted = await record(id);
      return submitted
        ? { status: 'submitted', record: submitted, revision: result.revision === true }
        : { status: 'not_found' };
    },

    createFromImpression() {
      return Promise.reject(
        new NotImplementedError(
          'memories.createFromImpression: on a database the Memory is made inside submissions.submitFeedback (submit_impression)',
        ),
      );
    },

    async discard(userId, id) {
      if (!isUuid(id)) return false;
      return unwrap(await client.rpc('memory_discard', { p_id: id }));
    },

    retire() {
      return Promise.reject(
        new NotImplementedError(
          'memories.retire is part of the account-deletion port (members/data/account-deletion.ts)',
        ),
      );
    },

    // ─── Admin ───
    async adminList(query) {
      const counts = unwrap(await client.rpc('memory_admin_counts')) as unknown as AdminMemoryCounts;
      let select = client.from('memories').select('id', { count: 'exact' });
      if (query.status !== 'all') select = select.eq('status', query.status satisfies MemoryStatus);
      const needle = query.q.trim();
      if (needle) select = select.ilike('title', `%${escapeLike(needle)}%`);
      const total = countOf(await select.range(0, 0));
      const window = pageWindow(total, query.page, query.pageSize);
      let rows = client.from('memories').select('id');
      if (query.status !== 'all') rows = rows.eq('status', query.status);
      if (needle) rows = rows.ilike('title', `%${escapeLike(needle)}%`);
      const ids = unwrap(
        await rows.order('updated_at', { ascending: false }).order('id').range(window.from, window.to),
      ).map((row) => row.id);
      const items = (await records(ids)).map((found): AdminMemoryRow => ({
        ...listItemOf(found),
        authorId: found.authorId,
        authorDeleted: found.authorDeleted,
        featuredOnHome: found.featuredOnHome,
        source: found.source,
      }));
      return {
        items,
        total,
        page: window.page,
        pageSize: query.pageSize,
        pageCount: window.pageCount,
        counts,
      };
    },

    async queue() {
      const rows = unwrap(
        await client.from('memory_queue').select('*').order('submitted_at', { ascending: true }),
      );
      return rows.map(queueItem);
    },
    async queueCount() {
      return countOf(await client.from('memory_queue').select('id', { count: 'exact', head: true }));
    },
    async review(id) {
      const found = await record(id);
      if (!found || !isWaiting(found)) return null;
      const revision = found.status === 'published' ? found.revision : null;
      let approved = 0;
      if (found.authorId) {
        approved = countOf(
          await client
            .from('memories')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', found.authorId)
            .eq('status', 'published')
            .neq('id', found.id),
        );
      }
      return {
        record: found,
        content: revision ? revision.content : found.content,
        kind: revision ? 'revision' : 'memory',
        submittedAt: revision ? revision.submittedAt : (found.submittedAt ?? found.updatedAt),
        authorApproved: approved,
        changes: revision ? changesBetween(found.content, revision.content) : [],
      };
    },

    adminGet: record,
    async adminSave(id, content, options) {
      if (!isUuid(id)) return null;
      const saved = unwrap(
        await client.rpc('memory_admin_save', {
          p_id: id,
          p_content: contentJson(content),
          p_revision: options.revision,
          p_featured: options.featuredOnHome,
        }),
      );
      return saved ? record(id) : null;
    },
    approve(id, input) {
      return decide(id, true, '', input.featuredOnHome ?? null);
    },
    reject(id, input) {
      return decide(id, false, input.reason, null);
    },
    async unpublish(id) {
      if (!isUuid(id)) return null;
      return unwrap(await client.rpc('memory_unpublish', { p_id: id })) ? record(id) : null;
    },
    async remove(id) {
      if (!isUuid(id)) return false;
      return unwrap(await client.rpc('memory_admin_remove', { p_id: id }));
    },
    async setFeatured(id, featured) {
      if (!isUuid(id)) return null;
      unwrap(await client.rpc('memory_set_featured', { p_id: id, p_featured: featured }));
      return record(id);
    },
  };
}
