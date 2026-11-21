import type { DbClient } from './clients';
import { DataError, unwrap, unwrapMaybe } from './errors';
import { toJson } from './json';

/** The pages whose content is one jsonb row (`page_content`). */
export type PageKey = 'home' | 'journey' | 'join' | 'partners' | 'contact' | 'submit';

/** The stored content of a page; the repositories' zod-validated writers keep its shape. */
export async function readPageContent<T>(client: DbClient, page: PageKey): Promise<T> {
  const row = unwrapMaybe(await client.from('page_content').select('content').eq('page', page).maybeSingle());
  if (!row) throw new DataError('not_found', `The ${page} page has no content yet`);
  return row.content as T;
}

/** Replaces the content of a page (staff only by RLS) and returns what is stored. */
export async function writePageContent<T>(client: DbClient, page: PageKey, content: T): Promise<T> {
  const row = unwrap(
    await client
      .from('page_content')
      .upsert({ page, content: toJson(content) }, { onConflict: 'page' })
      .select('content')
      .single(),
  );
  return row.content as T;
}
