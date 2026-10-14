import type { MembershipApplication, MembershipInput, MembershipStatus } from '../types';

export type SubmitMembershipResult =
  { status: 'created'; application: MembershipApplication } | { status: 'duplicate' };

/** Membership applications from /join, read by the board in Inbox › Membership. */
export interface MembershipRepository {
  /**
   * Stores a new application (status "new", consent recorded at `now`). The same e-mail twice is
   * refused while an earlier application of that person is still open (not rejected).
   */
  submit(input: MembershipInput, now: Date): Promise<SubmitMembershipResult>;
  /** Newest first, optionally one status. */
  list(query?: { status?: MembershipStatus }): Promise<MembershipApplication[]>;
  get(id: string): Promise<MembershipApplication | null>;
  updateStatus(id: string, status: MembershipStatus): Promise<MembershipApplication | null>;
  /** Marks one application read (at `readAt`) or unread (null). */
  setRead(id: string, readAt: Date | null): Promise<MembershipApplication | null>;
  /** "Mark all as read": every unread application gets `now`; returns how many changed. */
  markAllRead(now: Date): Promise<number>;
}
