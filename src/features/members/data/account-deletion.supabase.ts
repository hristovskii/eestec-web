import 'server-only';

import type { RepoScope } from '@/shared/data/select-implementation';
import type { DbClient } from '@/shared/data/supabase/clients';
import { isDataError, unwrap } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';

import type { AccountDeletion } from './account-deletion';

/**
 * Account deletion as the durable job of 0010. Needs the service role (the functions are granted to nobody else).
 *
 *  1. `begin_member_deletion`: one transaction deletes the profile, applications (and closes the waitlist gaps),
 *     unpublished Memories (and the published ones when asked; otherwise they stay as "A former member") and clears the
 *     identity from ideas and feedback; the files to remove are queued. Asking again continues the same job.
 *  2. Each queued file is removed through Storage's API, then marked done (SQL cannot delete objects).
 *  3. The Auth user is deleted (the admin API).
 *  4. `finish_member_deletion` completes the job once nothing is left; if a file could not go, the job stays open and
 *     asking again (or the clean-up job, M22) finishes it.
 */
export function createSupabaseAccountDeletion(client: DbClient, _scope: RepoScope): AccountDeletion {
  return {
    async deleteAccount({ userId, name, email, locale, alsoDeleteMemories }) {
      if (!isUuid(userId)) return { status: 'not_found' };
      let begun: { status: 'pending' | 'complete' | 'not_found' };
      try {
        begun = unwrap(
          await client.rpc('begin_member_deletion', {
            p_user: userId,
            p_delete_published: alsoDeleteMemories,
          }),
        ) as unknown as typeof begun;
      } catch (error) {
        // A board account is removed in Admin › Users & roles, never here.
        // Told apart from "this role may not call the function at all", which is a failure.
        if (isDataError(error, 'forbidden') && /admin role/i.test(error.message)) return { status: 'staff' };
        throw error;
      }
      if (begun.status === 'not_found') return { status: 'not_found' };

      if (begun.status === 'pending') {
        const files = unwrap(await client.rpc('pending_deletion_files', { p_user: userId })) as unknown as {
          bucket: string;
          path: string;
        }[];
        for (const file of files) {
          const removed = await client.storage.from(file.bucket).remove([file.path]);
          if (!removed.error)
            unwrap(
              await client.rpc('mark_deletion_file_done', {
                p_user: userId,
                p_bucket: file.bucket,
                p_path: file.path,
              }),
            );
        }
        const { error } = await client.auth.admin.deleteUser(userId);
        // An account that is already gone is the goal, not a failure (the job may have been asked twice).
        if (error && !/not.?found/i.test(error.message)) throw error;
        unwrap(await client.rpc('finish_member_deletion', { p_user: userId }));
      }
      return { status: 'deleted', name, email, locale };
    },
  };
}
