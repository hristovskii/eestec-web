import 'server-only';

import type { Paged } from '@/shared/data/paged';
import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { DataError, unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';

import { kindOf } from '../domain/upload-rules';
import type { MediaCounts, MediaItem, MediaListQuery } from '../types';
import type { MediaRepository } from './media.repository';

type Row = Tables<'media'>;

/** Files of the library: shipped or sample ones (no bucket) and the two public buckets. */
const LIBRARY = 'bucket.is.null,bucket.in.(public-media,documents)';

/** `,` `(` `)` and `%` have a meaning inside a PostgREST filter; a search for them is a search for text. */
const searchTerm = (q: string) => q.replace(/[,()%*\\]/g, ' ').trim();

const bucketFor = (mimeType: string) => (kindOf(mimeType) === 'image' ? 'public-media' : 'documents');
const safeName = (fileName: string) => fileName.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80) || 'file';

/**
 * The Media library (`media`, M19a): one row per file, `status` pending until the file has arrived. Uploads
 * take two steps so files never pass through a Server Action: `createUpload` reserves a row and returns a
 * signed Storage URL the browser PUTs to; `confirmUpload` marks it ready with its alt text.
 */
export function createSupabaseMediaRepository(client: DbClient): MediaRepository {
  const srcOf = (row: Row): string | null => {
    if (row.public_path) return row.public_path;
    if (!row.bucket || !row.path) return null;
    return client.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl;
  };

  async function toItems(rows: Row[]): Promise<MediaItem[]> {
    const ids = [...new Set(rows.map((row) => row.uploaded_by).filter((id): id is string => !!id))];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      for (const person of unwrap(await client.rpc('media_uploaders', { p_ids: ids }))) {
        if (person.name) names.set(person.id, person.name);
      }
    }
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      fileName: row.file_name,
      mimeType: row.mime_type ?? '',
      size: row.size_bytes ?? 0,
      ...(row.width ? { width: row.width } : {}),
      ...(row.height ? { height: row.height } : {}),
      alt: row.alt_text,
      ...(row.credit ? { credit: row.credit } : {}),
      src: srcOf(row),
      ...(row.sample_caption ? { sampleCaption: row.sample_caption } : {}),
      uploadedBy: {
        userId: row.uploaded_by ?? '',
        name: (row.uploaded_by && names.get(row.uploaded_by)) || '',
      },
      uploadedAt: row.created_at,
    }));
  }

  const base = () => client.from('media').select('*', { count: 'exact' }).eq('status', 'ready').or(LIBRARY);

  const countBase = (query: MediaListQuery) => {
    let q = client
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ready')
      .or(LIBRARY);
    if (query.uploadedBy) q = q.eq('uploaded_by', query.uploadedBy);
    return q;
  };
  type CountQuery = ReturnType<typeof countBase>;

  async function count(query: MediaListQuery, narrow: (q: CountQuery) => CountQuery = (q) => q) {
    const { count: total, error } = await narrow(countBase(query));
    if (error) throw new DataError('unknown', error.message, error.code);
    return total ?? 0;
  }

  return {
    async list(query): Promise<Paged<MediaItem> & { counts: MediaCounts }> {
      const scope = { ...query, uploadedBy: isUuid(query.uploadedBy) ? query.uploadedBy : undefined };
      const unknownUploader = query.uploadedBy !== undefined && !isUuid(query.uploadedBy);
      let q = base();
      if (scope.uploadedBy) q = q.eq('uploaded_by', scope.uploadedBy);
      if (query.kind) q = q.eq('kind', query.kind);
      if (query.missingAlt) q = q.eq('kind', 'image').is('alt_text', null);
      const needle = query.q ? searchTerm(query.q) : '';
      if (needle) q = q.or(`file_name.ilike.%${needle}%,alt_text.ilike.%${needle}%`);
      q =
        query.sort === 'name'
          ? q.order('file_name')
          : q.order('created_at', { ascending: query.sort === 'oldest' });
      q = q.order('id');
      const from = (Math.max(1, query.page) - 1) * query.pageSize;
      const result = unknownUploader
        ? { data: [] as Row[], count: 0, error: null }
        : await q.range(from, from + query.pageSize - 1);
      const rows = unwrap(result);
      const total = result.count ?? 0;
      const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
      const counts: MediaCounts = unknownUploader
        ? { all: 0, image: 0, document: 0, missingAlt: 0 }
        : {
            all: await count(scope),
            image: await count(scope, (c) => c.eq('kind', 'image')),
            document: await count(scope, (c) => c.eq('kind', 'document')),
            missingAlt: await count(scope, (c) => c.eq('kind', 'image').is('alt_text', null)),
          };
      return {
        items: await toItems(rows),
        total,
        page: Math.min(Math.max(1, query.page), pageCount),
        pageSize: query.pageSize,
        pageCount,
        counts,
      };
    },

    async get(id) {
      if (!isUuid(id)) return null;
      const row = unwrapMaybe(
        await client.from('media').select('*').eq('id', id).eq('status', 'ready').maybeSingle(),
      );
      return row ? ((await toItems([row]))[0] ?? null) : null;
    },

    async createUpload({ fileName, mimeType, size, uploadedBy }) {
      const kind = kindOf(mimeType);
      if (!kind || !isUuid(uploadedBy.userId)) throw new DataError('invalid', 'This file cannot be uploaded');
      const bucket = bucketFor(mimeType);
      // The first folder is the uploader's id: the Storage policy lets staff and managers write there only.
      const path = `${uploadedBy.userId}/${crypto.randomUUID()}-${safeName(fileName)}`;
      const row = unwrap(
        await client
          .from('media')
          .insert({
            bucket,
            path,
            kind,
            file_name: fileName,
            mime_type: mimeType,
            size_bytes: size,
            status: 'pending',
            uploaded_by: uploadedBy.userId,
          })
          .select('id')
          .single(),
      );
      const signed = await client.storage.from(bucket).createSignedUploadUrl(path);
      if (signed.error) {
        await client.from('media').delete().eq('id', row.id);
        throw new DataError('unknown', signed.error.message);
      }
      return { uploadId: row.id, uploadUrl: signed.data.signedUrl };
    },

    async getUpload(uploadId, userId) {
      if (!isUuid(uploadId) || !isUuid(userId)) return null;
      const row = unwrapMaybe(
        await client
          .from('media')
          .select('*')
          .eq('id', uploadId)
          .eq('uploaded_by', userId)
          .eq('status', 'pending')
          .maybeSingle(),
      );
      if (!row?.bucket || !row.path) return null;
      const received = await client.storage.from(row.bucket).exists(row.path);
      return { mimeType: row.mime_type ?? '', received: received.data === true };
    },

    async confirmUpload({ uploadId, userId, alt, credit, width, height, now }) {
      const pending = await this.getUpload(uploadId, userId);
      if (!pending?.received) return null;
      const kind = kindOf(pending.mimeType) ?? 'document';
      const row = unwrapMaybe(
        await client
          .from('media')
          .update({
            status: 'ready',
            alt_text: kind === 'image' ? alt : null,
            credit: credit ?? null,
            width: kind === 'image' && width ? width : null,
            height: kind === 'image' && height ? height : null,
            created_at: now.toISOString(),
          })
          .eq('id', uploadId)
          .eq('uploaded_by', userId)
          .eq('status', 'pending')
          .select('*')
          .maybeSingle(),
      );
      return row ? ((await toItems([row]))[0] ?? null) : null;
    },

    async update(id, patch) {
      if (!isUuid(id)) return null;
      const existing = unwrapMaybe(await client.from('media').select('kind').eq('id', id).maybeSingle());
      if (!existing) return null;
      const change: { alt_text?: string | null; credit?: string | null } = {};
      if (patch.alt !== undefined && existing.kind === 'image') change.alt_text = patch.alt;
      if (patch.credit !== undefined) change.credit = patch.credit || null;
      const row = unwrapMaybe(
        Object.keys(change).length === 0
          ? await client.from('media').select('*').eq('id', id).maybeSingle()
          : await client.from('media').update(change).eq('id', id).select('*').maybeSingle(),
      );
      return row ? ((await toItems([row]))[0] ?? null) : null;
    },

    async remove(id) {
      if (!isUuid(id)) return false;
      const row = unwrapMaybe(
        await client.from('media').select('id, bucket, path').eq('id', id).maybeSingle(),
      );
      if (!row) return false;
      const usage = unwrap(await client.rpc('media_usage', { p_id: id })) as { total: number };
      if (usage.total > 0) throw new DataError('in_use', 'This file is still used on the site');
      unwrap(await client.from('media').delete().eq('id', id));
      if (row.bucket && row.path) await client.storage.from(row.bucket).remove([row.path]);
      return true;
    },
  };
}
