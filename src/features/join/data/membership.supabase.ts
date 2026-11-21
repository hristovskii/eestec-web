import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { inboxCommands } from '@/shared/data/supabase/inbox';
import { isoOf, isoOrNull } from '@/shared/data/supabase/time';

import type { MembershipApplication } from '../types';
import type { MembershipRepository, SubmitMembershipResult } from './membership.repository';

type Row = Tables<'membership_applications'>;

const toApplication = (row: Row): MembershipApplication => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  faculty: row.faculty,
  studyProgram: row.study_program,
  yearOfStudy: row.year_of_study,
  interests: row.interests,
  heardFrom: row.heard_from,
  locale: row.locale as MembershipApplication['locale'],
  consentAt: isoOf(row.consent_at),
  status: row.status,
  readAt: isoOrNull(row.read_at),
  createdAt: isoOf(row.created_at),
});

/**
 * The board's Membership inbox. The form sends with the service scope (after the action's spam, validation and
 * consent checks, D32). `submit_membership` answers "duplicate" itself, also when two identical submissions race
 * (one open application per e-mail), and refuses while the Join page's applications are closed (a DataError `invalid`).
 */
export function createSupabaseMembershipRepository(client: DbClient): MembershipRepository {
  const commands = inboxCommands(client, 'membership_application');

  async function get(id: string): Promise<MembershipApplication | null> {
    if (!isUuid(id)) return null;
    const row = unwrapMaybe(
      await client.from('membership_applications').select('*').eq('id', id).maybeSingle(),
    );
    return row ? toApplication(row) : null;
  }

  return {
    async submit(input, now): Promise<SubmitMembershipResult> {
      const result = unwrap(
        await client.rpc('submit_membership', {
          p_name: input.name,
          p_email: input.email,
          p_phone: input.phone,
          p_faculty: input.faculty,
          p_study_program: input.studyProgram,
          p_year: input.yearOfStudy,
          p_interests: input.interests,
          p_heard_from: input.heardFrom,
          p_locale: input.locale,
          p_consent: true,
          p_now: now.toISOString(),
        }),
      ) as unknown as { status: 'duplicate' } | { status: 'created'; application: Row };
      return result.status === 'duplicate'
        ? { status: 'duplicate' }
        : { status: 'created', application: toApplication(result.application) };
    },

    async list(query) {
      let request = client
        .from('membership_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .order('reference', { ascending: false });
      if (query?.status) request = request.eq('status', query.status);
      return unwrap(await request).map(toApplication);
    },

    get,

    async updateStatus(id, status) {
      return (await commands.setStatus(id, status)) ? get(id) : null;
    },

    async setRead(id, readAt) {
      return (await commands.setRead(id, readAt)) ? get(id) : null;
    },

    markAllRead: (now) => commands.markAllRead(now),
  };
}
