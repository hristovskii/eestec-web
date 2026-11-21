import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { inboxCommands } from '@/shared/data/supabase/inbox';
import { isoOf, isoOrNull } from '@/shared/data/supabase/time';

import type { InquiryInterest, PartnerInquiry } from '../types';
import type { InquiriesRepository } from './inquiries.repository';

type Row = Tables<'partner_inquiries'>;

const toInquiry = (row: Row): PartnerInquiry => ({
  id: row.id,
  reference: row.reference,
  company: row.company,
  contactPerson: row.contact_person,
  email: row.email,
  phone: row.phone,
  interests: row.interests as InquiryInterest[],
  message: row.message,
  locale: row.locale as PartnerInquiry['locale'],
  consentAt: isoOf(row.consent_at),
  status: row.status,
  readAt: isoOrNull(row.read_at),
  createdAt: isoOf(row.created_at),
});

/**
 * The board's Partner inquiries inbox. The form sends with the service scope (after the action's spam, validation
 * and consent checks, D32); `submit_partner_inquiry` stores the row with the next reference of the year.
 */
export function createSupabaseInquiriesRepository(client: DbClient): InquiriesRepository {
  const commands = inboxCommands(client, 'partner_inquiry');

  async function get(id: string): Promise<PartnerInquiry | null> {
    if (!isUuid(id)) return null;
    const row = unwrapMaybe(await client.from('partner_inquiries').select('*').eq('id', id).maybeSingle());
    return row ? toInquiry(row) : null;
  }

  return {
    async submit(input, now) {
      const row = unwrap(
        await client.rpc('submit_partner_inquiry', {
          p_name: input.contactPerson,
          p_email: input.email,
          p_company: input.company,
          p_phone: input.phone,
          p_interests: input.interests,
          p_message: input.message,
          p_locale: input.locale,
          p_consent: true,
          p_now: now.toISOString(),
        }),
      );
      return toInquiry(row as unknown as Row);
    },

    async list(query) {
      let request = client
        .from('partner_inquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .order('reference', { ascending: false });
      if (query?.status) request = request.eq('status', query.status);
      return unwrap(await request).map(toInquiry);
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
