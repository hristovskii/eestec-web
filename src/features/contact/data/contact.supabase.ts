import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { unwrap } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import { readPageContent } from '@/shared/data/supabase/page-content';
import type { RepoScope } from '@/shared/data/select-implementation';
import type { Localized } from '@/shared/types/localized';

import type { ContactPageRecord, ContactSubject } from '../types';
import type { ContactRepository } from './contact.repository';

type PageContent = Omit<ContactPageRecord, 'subjects'>;

/**
 * The Contact page: its texts are the `contact` page row, its subjects are `contact_subjects`, and
 * where each subject's messages go is `contact_subject_routes`, which only staff and the service role can
 * read (M19b). On the public scope `routeEmail` is therefore '' (the public page never shows it);
 * the admin editor and the submit action read it with a session or service client. `save` is one
 * call (`save_contact_page`), so the texts, subjects and routes cannot diverge.
 */
export function createSupabaseContactRepository(
  client: DbClient,
  scope: RepoScope = 'public',
): ContactRepository {
  async function get(): Promise<ContactPageRecord> {
    const content = await readPageContent<PageContent>(client, 'contact');
    const subjects = unwrap(await client.from('contact_subjects').select('*').order('sort_order'));
    const routes =
      scope === 'public'
        ? []
        : unwrap(await client.from('contact_subject_routes').select('subject_id, route_email'));
    const routeOf = new Map(routes.map((route) => [route.subject_id, route.route_email]));
    return {
      ...content,
      subjects: subjects.map((subject): ContactSubject => ({
        id: subject.id,
        name: subject.name as Localized,
        routeEmail: routeOf.get(subject.id) ?? '',
        teamLabel: subject.team_label as Localized,
        routeNote: subject.route_note as Localized,
        shortcutLabel: subject.shortcut_label as Localized,
        shortcutUrl: subject.shortcut_url,
      })),
    };
  }

  return {
    get,
    async save(input) {
      const { subjects, ...content } = input;
      const items = subjects.map((subject) => ({
        // A subject the editor just added has no database id yet; the database makes one.
        ...(isUuid(subject.id) ? { id: subject.id } : {}),
        name: subject.name,
        team_label: subject.teamLabel,
        route_note: subject.routeNote,
        shortcut_label: subject.shortcutLabel,
        shortcut_url: subject.shortcutUrl,
        route_email: subject.routeEmail,
      }));
      unwrap(
        await client.rpc('save_contact_page', {
          p_content: toJson(content),
          p_subjects: toJson(items),
        }),
      );
      return get();
    },
  };
}
