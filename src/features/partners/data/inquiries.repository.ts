import type { InquiryStatus, PartnerInquiry, PartnerInquiryInput } from '../types';

/** Partnership inquiries from /partners. The board's list (Inbox › Partners) reads it in M12. */
export interface InquiriesRepository {
  /** Stores a new inquiry (status "new", consent recorded at `now`) with the next reference of the year. */
  submit(input: PartnerInquiryInput, now: Date): Promise<PartnerInquiry>;
  /** Newest first, optionally one status. */
  list(query?: { status?: InquiryStatus }): Promise<PartnerInquiry[]>;
  updateStatus(id: string, status: InquiryStatus): Promise<PartnerInquiry | null>;
}
