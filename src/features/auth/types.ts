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
  /** Events an event manager may edit (D18). Empty for other roles. */
  managedEventIds: string[];
};

export type SignInResult =
  | { status: 'signed_in' }
  | { status: 'two_factor_required' }
  | { status: 'invalid'; attemptsLeft: number }
  | { status: 'locked'; until: string }
  /** Correct password, but the account has no admin role (members sign in on the main site). */
  | { status: 'not_staff' };

export type TwoFactorResult = { status: 'signed_in' } | { status: 'invalid' } | { status: 'expired' };
