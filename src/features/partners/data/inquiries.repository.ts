import type { InquiryStatus, PartnerInquiry, PartnerInquiryInput } from '../types';

/** Partnership inquiries from /partners. The board reads them in Inbox › Partner inquiries. */
export interface InquiriesRepository {
  /** Stores a new inquiry (status "new", consent recorded at `now`) with the next reference of the year. */
  submit(input: PartnerInquiryInput, now: Date): Promise<PartnerInquiry>;
  /** Newest first, optionally one status. */
  list(query?: { status?: InquiryStatus }): Promise<PartnerInquiry[]>;
  get(id: string): Promise<PartnerInquiry | null>;
  updateStatus(id: string, status: InquiryStatus): Promise<PartnerInquiry | null>;
  /** Marks one inquiry read (at `readAt`) or unread (null). */
  setRead(id: string, readAt: Date | null): Promise<PartnerInquiry | null>;
  /** "Mark all as read": every unread inquiry gets `now`; returns how many changed. */
  markAllRead(now: Date): Promise<number>;
}
