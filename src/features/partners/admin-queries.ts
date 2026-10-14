import 'server-only';

import { listNotes } from '@/features/notes/server';
import { type Paged, paginate } from '@/shared/data/paged';
import { matchesQuery } from '@/shared/lib/inbox';
import type { InboxParams } from '@/shared/lib/inbox-params';

import { inquiriesRepository } from './data';
import { INQUIRY_STATUSES, type InquiryStatus, type PartnerInquiry } from './types';

const statusOf = (value: string | undefined): InquiryStatus | undefined =>
  (INQUIRY_STATUSES as readonly string[]).includes(value ?? '') ? (value as InquiryStatus) : undefined;

/** Does the inquiry match what the Inbox list is filtered by (status, search)? */
export function matchesInquiryFilter(inquiry: PartnerInquiry, params: InboxParams): boolean {
  const status = statusOf(params.status);
  return (
    (!status || inquiry.status === status) &&
    matchesQuery(
      params.q,
      inquiry.company,
      inquiry.contactPerson,
      inquiry.email,
      inquiry.message,
      inquiry.reference,
    )
  );
}

/** Admin › Inbox › Partner inquiries: one page of the list, the counts and the open inquiry with its notes. Callers check the permission. */
export async function getInquiriesInbox(params: InboxParams) {
  const repo = await inquiriesRepository('session');
  const all = await repo.list();
  const page: Paged<PartnerInquiry> = paginate(
    all.filter((inquiry) => matchesInquiryFilter(inquiry, params)),
    params.page,
    params.size,
  );
  const open = params.open ? await repo.get(params.open) : null;
  return {
    page,
    counts: {
      all: all.length,
      new: all.filter((inquiry) => inquiry.status === 'new').length,
      unread: all.filter((inquiry) => inquiry.readAt === null).length,
    },
    open,
    notes: open ? await listNotes('partner_inquiry', open.id) : [],
  };
}

/** The inquiries a CSV export covers, newest first. */
export async function listInquiries(): Promise<PartnerInquiry[]> {
  return (await inquiriesRepository('session')).list();
}
