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
  | { status: 'not_staff' }
  /** Mock sign-in on a production deployment (see availability.ts): nobody can sign in. */
  | { status: 'unavailable' };

export type TwoFactorResult =
  { status: 'signed_in' } | { status: 'invalid' } | { status: 'expired' } | { status: 'unavailable' };

export type TwoFactorStatus = 'on' | 'off' | 'not_set_up';

/** An account that can open the admin (Admin users & roles). */
export type AdminAccount = {
  userId: string;
  name: string;
  email: string;
  initials: string;
  role: AdminRole;
  /** Event managers only (D18). */
  managedEventIds: string[];
  twoFactor: TwoFactorStatus;
  /** invited: the e-mail was sent; the person hasn't set a password yet. */
  status: 'active' | 'invited';
  lastActiveAt: string | null;
  invitedAt: string | null;
};

export type InviteResult = { status: 'invited'; account: AdminAccount } | { status: 'already_admin' };

// ─── Member accounts (M14): sign-up → confirm e-mail → board approval ───

export const MEMBER_YEARS = ['1', '2', '3', '4', 'master', 'phd'] as const;
export type MemberYear = (typeof MEMBER_YEARS)[number];

/** Who can see a member's profile ("Public" or "Members only"; default Members only). */
export const MEMBER_VISIBILITIES = ['public', 'members'] as const;
export type MemberVisibility = (typeof MEMBER_VISIBILITIES)[number];

/**
 * awaiting_confirmation: the e-mail link hasn't been used (24 h). pending: confirmed, waiting for the
 * board (the account can sign in, the profile is hidden). active: approved. rejected: not approved.
 */
export type RegistrationStatus = 'awaiting_confirmation' | 'pending' | 'active' | 'rejected';

/** What a person entered when they created their member account. */
export type MemberRegistration = {
  userId: string;
  name: string;
  email: string;
  /** The faculty as the person chose it (the board's Join Us list), in the words of their page. */
  faculty: string;
  year: MemberYear;
  /** '' when not given. */
  phone: string;
  visibility: MemberVisibility;
  /** A file in the (mock) photo store; null: no photo. */
  photoId: string | null;
  status: RegistrationStatus;
  /** Language of the page they used: links in e-mails keep it. */
  locale: 'mk' | 'en';
  submittedAt: string;
  confirmedAt: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
};

export type RegisterMemberInput = {
  name: string;
  email: string;
  password: string;
  faculty: string;
  year: MemberYear;
  phone: string;
  visibility: MemberVisibility;
  photo: { mimeType: string; bytes: Uint8Array } | null;
  locale: 'mk' | 'en';
  now: Date;
};

export type RegisterResult =
  { status: 'registered'; userId: string } | { status: 'email_taken' } | { status: 'unavailable' };

export type ConfirmResult = { status: 'confirmed' } | { status: 'expired' };

export type SignInMemberResult =
  | { status: 'signed_in'; memberStatus: MemberStatus | null }
  | { status: 'invalid' }
  /** `minutes`: how long is left, counted on the server's clock (the browser's may differ). */
  | { status: 'locked'; until: string; minutes: number }
  /** Correct password, but the e-mail link hasn't been used yet. */
  | { status: 'unconfirmed' }
  | { status: 'rejected'; reason: string | null }
  /** Board accounts sign in at /admin/login (2-step for super admins can't be skipped). */
  | { status: 'use_admin_login' }
  | { status: 'unavailable' };

export type TokenKind = 'confirm' | 'reset';

/** What a link in an e-mail points at, before it is used. */
export type TokenPeek =
  | { state: 'valid'; email: string; name: string; locale: 'mk' | 'en' }
  | { state: 'expired' }
  | { state: 'invalid' };

export type ResetPasswordResult =
  /** signedIn: members are signed in after choosing a password; board accounts still use /admin/login. */
  { status: 'ok'; signedIn: boolean } | { status: 'expired' };

export type DecideRegistrationResult =
  | { status: 'decided'; registration: MemberRegistration }
  | { status: 'not_found' }
  | { status: 'already_decided' };

export type PendingRegistrationSummary = { count: number; oldestAt: string | null };

/**
 * What the Members feature may know about an approved member (never e-mail or phone). The profile
 * page is created from this when the board approves a registration.
 */
export type ApprovedMemberIdentity = {
  userId: string;
  name: string;
  username: string;
  faculty: string;
  year: MemberYear;
  visibility: MemberVisibility;
  /** Where the sign-up photo is served from; null: none. */
  photoUrl: string | null;
  approvedAt: string;
};
