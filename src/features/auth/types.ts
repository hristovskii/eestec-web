/** Decided roles (spec 11 + rules): no admin role = member only. */
export type AdminRole = 'super_admin' | 'editor' | 'event_manager';
export type MemberStatus = 'pending' | 'active' | 'alumni';

export type Session = {
  userId: string;
  name: string;
  initials: string;
  username: string;
  email: string;
  /** Short line under the name, e.g. "Events team · member since 2023". */
  headline: string;
  /** null: an admin account without a member profile. */
  memberStatus: MemberStatus | null;
  adminRole: AdminRole | null;
};
