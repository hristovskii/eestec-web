import type { DbClient } from './clients';

/**
 * Where a media row is served: a file shipped with the site (`public_path`), a public bucket's URL, or
 * nothing (a sample placeholder without a file, or a private bucket that has its own delivery route).
 */
export function mediaSource(
  client: DbClient,
  row: { public_path: string | null; bucket: string | null; path: string | null },
): string | null {
  if (row.public_path) return row.public_path;
  if (row.bucket !== 'public-media' && row.bucket !== 'documents') return null;
  if (!row.path) return null;
  return client.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl;
}
