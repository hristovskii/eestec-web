import 'server-only';

import { pageWindow, paginate, type Paged } from '@/shared/data/paged';
import type { RepoScope } from '@/shared/data/select-implementation';
import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { DataError, isDataError, toDataError, unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import { isoOf, isoOrNull } from '@/shared/data/supabase/time';

import type { MemoryContent } from '@/features/memories';

import type {
  EventRating,
  Feedback,
  Idea,
  SubmissionCounts,
  SubmissionFile,
  SubmissionStatus,
} from '../types';
import type { SubmissionPatch, SubmissionsRepository } from './submissions.repository';

// ─── What the tables and the submit functions hand over ───

type FileRow = Pick<Tables<'submission_files'>, 'path' | 'file_name' | 'mime_type' | 'size_bytes'>;
type IdeaRow = Omit<Tables<'ideas'>, 'reference' | 'is_sample'>;
type FeedbackRow = Omit<Tables<'feedback'>, 'reference' | 'is_sample'>;
/** The restricted projection event managers read (D33): no sender, owner, photos or Memory. */
type ManagerRow = {
  id: string;
  event_id: string | null;
  event_title: string;
  rating: number | null;
  impression: string;
  status: SubmissionStatus;
  locale: string;
  created_at: string;
};

const BUCKET = 'submissions';

const fileOf = (file: FileRow): SubmissionFile => ({
  id: file.path,
  name: file.file_name,
  size: file.size_bytes,
  mime: file.mime_type,
});

const ratingOf = (value: number | null): Feedback['rating'] =>
  value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : null;

const localeOf = (value: string): 'mk' | 'en' => (value === 'en' ? 'en' : 'mk');

function toIdea(row: IdeaRow, files: FileRow[]): Idea {
  const [attachment] = files;
  return {
    id: row.id,
    typeId: row.type_id,
    title: row.title,
    description: row.description,
    attachment: attachment ? fileOf(attachment) : null,
    name: row.name,
    email: row.email,
    consentAt: isoOrNull(row.consent_at),
    userId: row.user_id,
    isAnonymous: row.is_anonymous,
    status: row.status,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    eventDraftId: row.event_draft_id,
    locale: localeOf(row.locale),
    createdAt: isoOf(row.created_at),
  };
}

function toFeedback(row: FeedbackRow, files: FileRow[]): Feedback {
  return {
    id: row.id,
    eventId: row.event_id,
    otherEventName: row.other_event_name,
    eventTitle: row.event_title,
    rating: ratingOf(row.rating),
    text: row.impression,
    photos: files.map(fileOf),
    memoryId: row.memory_id,
    name: row.name,
    email: row.email,
    consentAt: isoOrNull(row.consent_at),
    userId: row.user_id,
    isAnonymous: row.is_anonymous,
    status: row.status,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    locale: localeOf(row.locale),
    createdAt: isoOf(row.created_at),
  };
}

/** What a manager gets of feedback: the rating and the impression, nothing of who sent it (D33). */
const toManagerFeedback = (row: ManagerRow): Feedback => ({
  id: row.id,
  eventId: row.event_id,
  otherEventName: '',
  eventTitle: row.event_title,
  rating: ratingOf(row.rating),
  text: row.impression,
  photos: [],
  memoryId: null,
  name: null,
  email: null,
  consentAt: null,
  userId: null,
  isAnonymous: true,
  status: row.status,
  ownerId: null,
  ownerName: null,
  locale: localeOf(row.locale),
  createdAt: isoOf(row.created_at),
});

/** The result of a submit function: the stored row with its files. */
type Stored<Row> = Row & { files: FileRow[] };

const eventKey = (row: Feedback) => row.eventId ?? `other:${row.otherEventName.trim().toLowerCase()}`;

const newestFirst = <T extends { createdAt: string }>(rows: readonly T[]) =>
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const searchTerm = (q: string) => q.replace(/[,()%*\\]/g, ' ').trim();
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/** The Memory that comes with feedback, in the shape `submit_impression` reads. */
const memoryJson = (content: MemoryContent) =>
  toJson({
    title: content.title,
    eventId: content.eventId,
    otherEventName: content.otherEventName,
    city: content.city,
    country: content.country,
    happenedOn: content.happenedOn,
    body: content.body,
    cover: content.cover,
    photos: content.photos.map((photo) => ({
      fileId: photo.fileId,
      sample: photo.sample,
      alt: photo.alt,
      caption: photo.caption,
    })),
  });

/** One row, or null when there is none or this person may not read the table (a visitor has no grant at all). */
async function maybeRow<D>(query: PromiseLike<{ data: D; error: { code: string; message: string } | null }>) {
  try {
    return unwrapMaybe(await query);
  } catch (error) {
    if (isDataError(error, 'forbidden')) return null;
    throw error;
  }
}

/** A value the database accepts as null although the generated types ask for text. */
const nullable = (value: string | null | undefined) => (value ?? null) as string;

/**
 * Ideas and feedback on a database. Anyone sends (the server, with the service role: the submit functions are not
 * granted to anyone else); the board reads and handles them by row-level security (super admins and editors); event
 * managers get only the restricted projection of feedback on their own events (D33).
 */
export function createSupabaseSubmissionsRepository(
  client: DbClient,
  _scope: RepoScope,
): SubmissionsRepository {
  async function filesOf(column: 'idea_id' | 'feedback_id', ids: string[]): Promise<Map<string, FileRow[]>> {
    const byId = new Map<string, FileRow[]>();
    if (ids.length === 0) return byId;
    const rows = unwrap(
      await client
        .from('submission_files')
        .select('path, file_name, mime_type, size_bytes, idea_id, feedback_id, sort_order, created_at')
        .in(column, ids)
        .order('sort_order')
        .order('created_at'),
    );
    for (const row of rows) {
      const owner = row[column];
      if (owner) byId.set(owner, [...(byId.get(owner) ?? []), row]);
    }
    return byId;
  }

  const ideasOf = async (rows: IdeaRow[]): Promise<Idea[]> => {
    const files = await filesOf(
      'idea_id',
      rows.map((row) => row.id),
    );
    return rows.map((row) => toIdea(row, files.get(row.id) ?? []));
  };
  const feedbackOf = async (rows: FeedbackRow[]): Promise<Feedback[]> => {
    const files = await filesOf(
      'feedback_id',
      rows.map((row) => row.id),
    );
    return rows.map((row) => toFeedback(row, files.get(row.id) ?? []));
  };

  /** One page of rows: the page asked for, or the last one when it is past the end. */
  async function pagedIds(
    build: () => ReturnType<ReturnType<DbClient['from']>['select']>,
    page: number,
    pageSize: number,
  ): Promise<{ ids: string[]; total: number; page: number; pageCount: number }> {
    const run = async (from: number, to: number) => {
      const { data, error, count } = await build().range(from, to);
      if (error) throw toDataError(error);
      return { ids: (data as unknown as { id: string }[]).map((row) => row.id), total: count ?? 0 };
    };
    let window = pageWindow(0, page, pageSize);
    let found = await run((Math.max(1, page) - 1) * pageSize, Math.max(1, page) * pageSize - 1);
    window = pageWindow(found.total, page, pageSize);
    if (found.ids.length === 0 && found.total > 0) found = await run(window.from, window.to);
    return { ...found, page: window.page, pageCount: window.pageCount };
  }

  async function getIdea(id: string): Promise<Idea | null> {
    if (!isUuid(id)) return null;
    const row = unwrapMaybe(await client.from('ideas').select('*').eq('id', id).maybeSingle());
    return row ? ((await ideasOf([row]))[0] ?? null) : null;
  }

  async function getFeedback(id: string): Promise<Feedback | null> {
    if (!isUuid(id)) return null;
    const row = unwrapMaybe(await client.from('feedback').select('*').eq('id', id).maybeSingle());
    if (row) return (await feedbackOf([row]))[0] ?? null;
    // Not the board: an event manager may still read the rating and impression of feedback on their own event.
    const [restricted] = unwrap(await client.rpc('feedback_for_manager', { p_id: id })) as ManagerRow[];
    return restricted ? toManagerFeedback(restricted) : null;
  }

  /** Every piece of feedback on these events as a manager sees it, newest first. */
  async function managerFeedback(eventIds: readonly string[]): Promise<Feedback[]> {
    const lists = await Promise.all(
      eventIds.filter(isUuid).map(async (eventId) => {
        const rows = unwrap(
          await client.rpc('event_feedback_for_manager', { p_event: eventId }),
        ) as ManagerRow[];
        return rows.map(toManagerFeedback);
      }),
    );
    return newestFirst(lists.flat());
  }

  const matches = (text: string[], q: string | undefined) => {
    const needle = q?.trim().toLowerCase();
    return !needle || text.some((part) => part.toLowerCase().includes(needle));
  };

  function countStatuses(rows: readonly { status: SubmissionStatus }[]): SubmissionCounts {
    const result: SubmissionCounts = { all: rows.length, new: 0, under_review: 0, accepted: 0, archived: 0 };
    for (const row of rows) result[row.status] += 1;
    return result;
  }

  /** A change of status and/or owner: the function takes both, so what the patch leaves out is kept. */
  async function update(kind: 'idea' | 'feedback', id: string, patch: SubmissionPatch): Promise<boolean> {
    if (!isUuid(id)) return false;
    const current = unwrapMaybe(
      await client
        .from(kind === 'idea' ? 'ideas' : 'feedback')
        .select('status, owner_id, owner_name')
        .eq('id', id)
        .maybeSingle(),
    );
    if (!current) return false;
    const owner =
      patch.owner === undefined ? { id: current.owner_id, name: current.owner_name } : patch.owner;
    if (owner?.id && !isUuid(owner.id)) throw new DataError('invalid', 'The owner is not an account');
    return unwrap(
      await client.rpc('update_submission', {
        p_kind: kind,
        p_id: id,
        p_status: patch.status ?? current.status,
        p_owner: nullable(owner?.id),
        p_owner_name: nullable(owner?.name),
      }),
    );
  }

  return {
    // ─── Files ───
    /** The id is the object's name in the private bucket; the submit refers to it and the board's download reads it. */
    async storeFile(blob) {
      const id = crypto.randomUUID();
      const { error } = await client.storage
        .from(BUCKET)
        .upload(id, blob.bytes, { contentType: blob.mimeType, upsert: false });
      if (error) throw new DataError('invalid', error.message);
      return { id, name: blob.name, size: blob.bytes.byteLength, mime: blob.mimeType };
    },

    /** Read as the signed-in person: only the board's rows and objects are readable (D29, D33). */
    async readFile(fileId) {
      const row = await maybeRow(
        client.from('submission_files').select('file_name, mime_type').eq('path', fileId).maybeSingle(),
      );
      if (!row) return null;
      const downloaded = await client.storage.from(BUCKET).download(fileId);
      if (downloaded.error || !downloaded.data) return null;
      return {
        bytes: new Uint8Array(await downloaded.data.arrayBuffer()),
        mimeType: row.mime_type,
        name: row.file_name,
      };
    },

    // ─── Submitting ───
    async submitIdea(input, now) {
      if (!isUuid(input.typeId)) throw new DataError('invalid', 'That is not an idea type');
      const stored = unwrap(
        await client.rpc('submit_idea', {
          p_type: input.typeId,
          p_title: input.title,
          p_description: input.description,
          p_locale: input.locale,
          p_anonymous: input.sender.isAnonymous,
          p_name: nullable(input.sender.name),
          p_email: nullable(input.sender.email),
          p_profile: nullable(input.sender.userId),
          // The action refuses a form without the consent box (or a member who is already identified) before it gets here.
          p_consent: true,
          ...(input.attachment
            ? {
                p_attachment: toJson({
                  path: input.attachment.id,
                  name: input.attachment.name,
                  mime: input.attachment.mime,
                  size: input.attachment.size,
                }),
              }
            : {}),
          p_now: now.toISOString(),
        }),
      ) as unknown as Stored<IdeaRow>;
      return toIdea(stored, stored.files);
    },

    async submitFeedback(input, now) {
      if (input.eventId !== null && !isUuid(input.eventId))
        throw new DataError('invalid', 'That is not an event');
      const stored = unwrap(
        await client.rpc('submit_impression', {
          p_event: nullable(input.eventId),
          p_other_event: input.otherEventName,
          p_event_title: input.eventTitle,
          p_rating: input.rating as number,
          p_text: input.text,
          p_locale: input.locale,
          p_anonymous: input.sender.isAnonymous,
          p_name: nullable(input.sender.name),
          p_email: nullable(input.sender.email),
          p_profile: nullable(input.sender.userId),
          p_consent: true,
          p_files: toJson(
            input.photos.map((photo) => ({
              path: photo.id,
              name: photo.name,
              mime: photo.mime,
              size: photo.size,
            })),
          ),
          ...(input.memory ? { p_memory_content: memoryJson(input.memory) } : {}),
          p_now: now.toISOString(),
        }),
      ) as unknown as Stored<FeedbackRow>;
      return toFeedback(stored, stored.files);
    },

    // ─── Ideas ───
    async listIdeas(query): Promise<Paged<Idea>> {
      const empty: Paged<Idea> = { items: [], total: 0, page: 1, pageSize: query.pageSize, pageCount: 1 };
      if (query.typeId !== undefined && !isUuid(query.typeId)) return empty;
      const needle = query.q ? searchTerm(query.q) : '';
      const build = () => {
        let select = client.from('ideas').select('id', { count: 'exact' });
        if (query.status) select = select.eq('status', query.status);
        if (query.typeId) select = select.eq('type_id', query.typeId);
        if (needle)
          select = select.or(`title.ilike.%${needle}%,description.ilike.%${needle}%,name.ilike.%${needle}%`);
        return select.order('created_at', { ascending: false }).order('id', { ascending: false });
      };
      const found = await pagedIds(build as never, query.page, query.pageSize);
      if (found.ids.length === 0)
        return { ...empty, total: found.total, page: found.page, pageCount: found.pageCount };
      const rows = unwrap(await client.from('ideas').select('*').in('id', found.ids));
      const byId = new Map((await ideasOf(rows)).map((idea) => [idea.id, idea]));
      return {
        items: found.ids.flatMap((id) => byId.get(id) ?? []),
        total: found.total,
        page: found.page,
        pageSize: query.pageSize,
        pageCount: found.pageCount,
      };
    },
    async ideaCounts() {
      return unwrap(await client.rpc('submission_counts', { p_kind: 'idea' })) as unknown as SubmissionCounts;
    },
    getIdea,
    async updateIdea(id, patch) {
      return (await update('idea', id, patch)) ? getIdea(id) : null;
    },
    async linkEventDraft(id, eventDraftId) {
      if (!isUuid(id)) return null;
      if (!isUuid(eventDraftId)) throw new DataError('invalid', 'That is not an event');
      return unwrap(await client.rpc('link_idea_event_draft', { p_id: id, p_event: eventDraftId }))
        ? getIdea(id)
        : null;
    },
    async fileOwner(fileId) {
      const file = await maybeRow(
        client.from('submission_files').select('idea_id, feedback_id').eq('path', fileId).maybeSingle(),
      );
      if (!file) return null;
      if (file.idea_id) return { kind: 'idea' as const };
      const feedback = file.feedback_id
        ? unwrapMaybe(
            await client.from('feedback').select('event_id').eq('id', file.feedback_id).maybeSingle(),
          )
        : null;
      return feedback ? { kind: 'feedback' as const, eventId: feedback.event_id } : null;
    },
    async countIdeasOfType(typeId) {
      if (!isUuid(typeId)) return 0;
      const { count, error } = await client
        .from('ideas')
        .select('id', { count: 'exact', head: true })
        .eq('type_id', typeId);
      if (error) throw toDataError(error);
      return count ?? 0;
    },

    // ─── Feedback ───
    async listFeedback(query): Promise<Paged<Feedback>> {
      if (query.onlyEventIds) {
        const rows = (await managerFeedback(query.onlyEventIds)).filter(
          (row) =>
            (!query.status || row.status === query.status) &&
            (!query.eventKey || eventKey(row) === query.eventKey) &&
            matches([row.text, row.eventTitle], query.q),
        );
        return paginate(rows, query.page, query.pageSize);
      }
      const empty: Paged<Feedback> = { items: [], total: 0, page: 1, pageSize: query.pageSize, pageCount: 1 };
      const other = query.eventKey?.startsWith('other:') ? query.eventKey.slice('other:'.length) : null;
      if (query.eventKey && other === null && !isUuid(query.eventKey)) return empty;
      const needle = query.q ? searchTerm(query.q) : '';
      const build = () => {
        let select = client.from('feedback').select('id', { count: 'exact' });
        if (query.status) select = select.eq('status', query.status);
        if (other !== null) select = select.is('event_id', null).ilike('other_event_name', escapeLike(other));
        else if (query.eventKey) select = select.eq('event_id', query.eventKey);
        if (needle)
          select = select.or(
            `impression.ilike.%${needle}%,event_title.ilike.%${needle}%,name.ilike.%${needle}%`,
          );
        return select.order('created_at', { ascending: false }).order('id', { ascending: false });
      };
      const found = await pagedIds(build as never, query.page, query.pageSize);
      if (found.ids.length === 0)
        return { ...empty, total: found.total, page: found.page, pageCount: found.pageCount };
      const rows = unwrap(await client.from('feedback').select('*').in('id', found.ids));
      const byId = new Map((await feedbackOf(rows)).map((row) => [row.id, row]));
      return {
        items: found.ids.flatMap((id) => byId.get(id) ?? []),
        total: found.total,
        page: found.page,
        pageSize: query.pageSize,
        pageCount: found.pageCount,
      };
    },
    async feedbackCounts(onlyEventIds) {
      if (onlyEventIds) return countStatuses(await managerFeedback(onlyEventIds));
      return unwrap(
        await client.rpc('submission_counts', { p_kind: 'feedback' }),
      ) as unknown as SubmissionCounts;
    },
    getFeedback,
    async updateFeedback(id, patch) {
      return (await update('feedback', id, patch)) ? getFeedback(id) : null;
    },
    async feedbackEvents(onlyEventIds) {
      let rows: { key: string; title: string }[];
      if (onlyEventIds) {
        rows = (await managerFeedback(onlyEventIds)).map((row) => ({
          key: eventKey(row),
          title: row.eventTitle,
        }));
      } else {
        const all = unwrap(
          await client
            .from('feedback')
            .select('event_id, other_event_name, event_title')
            .order('created_at', { ascending: false }),
        );
        rows = all.map((row) => ({
          key: row.event_id ?? `other:${row.other_event_name.trim().toLowerCase()}`,
          title: row.event_title,
        }));
      }
      const seen = new Map<string, string>();
      for (const row of rows) if (!seen.has(row.key)) seen.set(row.key, row.title);
      return [...seen].map(([key, title]) => ({ key, title }));
    },

    async ratings(query) {
      const rows = unwrap(
        await client.rpc('event_ratings', {
          p_from: nullable(query.from),
          p_until: nullable(query.until),
          ...(query.onlyEventIds ? { p_event_ids: query.onlyEventIds.filter(isUuid) } : {}),
        }),
      );
      const result: EventRating[] = rows.map((row) => ({
        key: row.event_id ?? `other:${row.other_key}`,
        eventId: row.event_id,
        eventTitle: row.event_title,
        average: Number(row.average),
        count: Number(row.rating_count),
        distribution: [0, 1, 2, 3, 4].map((index) =>
          Number(row.distribution[index] ?? 0),
        ) as EventRating['distribution'],
        latestComment: row.latest_comment
          ? { text: row.latest_comment, createdAt: isoOf(row.latest_comment_at) }
          : null,
        latestAt: isoOf(row.latest_at),
      }));
      return result.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    },

    // ─── Export ───
    async allIdeas() {
      const rows = unwrap(await client.from('ideas').select('*').order('created_at', { ascending: false }));
      return ideasOf(rows);
    },
    async allFeedback(onlyEventIds) {
      if (onlyEventIds) return managerFeedback(onlyEventIds);
      const rows = unwrap(
        await client.from('feedback').select('*').order('created_at', { ascending: false }),
      );
      return feedbackOf(rows);
    },
  };
}
