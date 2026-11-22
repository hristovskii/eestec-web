import 'server-only';

import type { RepoScope } from '@/shared/data/select-implementation';
import type { DbClient } from '@/shared/data/supabase/clients';
import { unwrap } from '@/shared/data/supabase/errors';
import { toJson } from '@/shared/data/supabase/json';
import { readPageContent } from '@/shared/data/supabase/page-content';
import type { Localized } from '@/shared/types/localized';

import type { IdeaFormSettings } from '../types';
import type { IdeaFormRepository } from './form.repository';

type StoredIntro = { intro: IdeaFormSettings['intro'] };

/**
 * The texts and idea types of /submit: the intro is the `submit` page's content, the types are `idea_types` in the
 * order the board arranged them. Reads are public (the page shows them); `save_idea_form` writes both or neither.
 */
export function createSupabaseIdeaFormRepository(client: DbClient, _scope: RepoScope): IdeaFormRepository {
  async function read(): Promise<IdeaFormSettings> {
    const [content, types] = await Promise.all([
      readPageContent<StoredIntro>(client, 'submit'),
      client.from('idea_types').select('id, name').order('sort_order').order('created_at'),
    ]);
    return {
      intro: content.intro,
      types: unwrap(types).map((type) => ({ id: type.id, name: type.name as Localized })),
    };
  }

  return {
    get: read,
    async save(input) {
      unwrap(
        await client.rpc('save_idea_form', {
          p_intro: toJson(input.intro),
          // A type without an id, or with one that is not a type's, is new: the database gives it one.
          p_types: toJson(input.types.map((type) => ({ id: type.id, name: type.name }))),
        }),
      );
      return read();
    },
  };
}
