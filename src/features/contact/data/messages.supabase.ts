import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { inboxCommands } from '@/shared/data/supabase/inbox';
import { isoOf, isoOrNull } from '@/shared/data/supabase/time';

import type { ContactMessage } from '../types';
import type { MessagesRepository } from './messages.repository';

type Row = Tables<'contact_messages'>;

const toMessage = (row: Row): ContactMessage => ({
  id: row.id,
  reference: row.reference,
  name: row.name,
  email: row.email,
  subjectId: row.subject_id,
  subject: row.subject,
  routedTo: row.routed_to,
  message: row.message,
  locale: row.locale as ContactMessage['locale'],
  status: row.status,
  readAt: isoOrNull(row.read_at),
  consentAt: isoOf(row.consent_at),
  createdAt: isoOf(row.created_at),
});

/**
 * The board's Contact inbox. The form sends with the service scope (after the action's spam, validation and consent
 * checks, D32): `submit_contact_message` stores the row with the next reference of the year and takes the subject's
 * wording and the address it routes to from the subject itself, so `subject` and `routedTo` of the input are not
 * trusted. Everything else is the board's: row-level security lets only staff read, and the commands check the role.
 */
export function createSupabaseMessagesRepository(client: DbClient): MessagesRepository {
  const commands = inboxCommands(client, 'contact_message');

  async function get(id: string): Promise<ContactMessage | null> {
    if (!isUuid(id)) return null;
    const row = unwrapMaybe(await client.from('contact_messages').select('*').eq('id', id).maybeSingle());
    return row ? toMessage(row) : null;
  }

  return {
    async submit(input, now) {
      const row = unwrap(
        await client.rpc('submit_contact_message', {
          p_name: input.name,
          p_email: input.email,
          p_subject: input.subjectId,
          p_message: input.message,
          p_locale: input.locale,
          p_consent: true,
          p_now: now.toISOString(),
        }),
      );
      return toMessage(row as unknown as Row);
    },

    async list(query) {
      let request = client
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .order('reference', { ascending: false });
      if (query?.status) request = request.eq('status', query.status);
      return unwrap(await request).map(toMessage);
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
