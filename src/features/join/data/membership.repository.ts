import type { MembershipApplication, MembershipInput, MembershipStatus } from '../types';

export type SubmitMembershipResult =
  { status: 'created'; application: MembershipApplication } | { status: 'duplicate' };

/** Membership applications from /join. The board's list (Inbox › Membership) reads it in M12. */
export interface MembershipRepository {
  /**
   * Stores a new application (status "new", consent recorded at `now`). The same e-mail twice is
   * refused while an earlier application of that person is still open (not rejected).
   */
  submit(input: MembershipInput, now: Date): Promise<SubmitMembershipResult>;
  /** Newest first, optionally one status. */
  list(query?: { status?: MembershipStatus }): Promise<MembershipApplication[]>;
  updateStatus(id: string, status: MembershipStatus): Promise<MembershipApplication | null>;
}
