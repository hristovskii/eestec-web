import type {
  AdminAccount,
  AdminRole,
  ConfirmResult,
  DecideRegistrationResult,
  InviteResult,
  MemberRegistration,
  PendingRegistrationSummary,
  RegisterMemberInput,
  RegisterResult,
  ResetPasswordResult,
  Session,
  SignInMemberResult,
  SignInResult,
  TokenKind,
  TokenPeek,
  TwoFactorResult,
} from '../types';

/**
 * One login system for members and admins (Supabase Auth in the backend phase).
 * Errors never say whether the e-mail or the password was wrong.
 */
export interface AuthRepository {
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
  /** Admin sign-in (/admin/login). Super admins always continue with the 2-step step. */
  signInAdmin(input: {
    email: string;
    password: string;
    remember: boolean;
    now: Date;
  }): Promise<SignInResult>;
  verifyTwoFactor(input: { code: string; kind: 'totp' | 'backup'; now: Date }): Promise<TwoFactorResult>;
  /**
   * Always resolves, whether or not the account exists (no account enumeration). A reset link is sent
   * only to an account that can use it (confirmed, not rejected); it works for 30 minutes.
   */
  requestPasswordReset(input: { email: string; locale?: 'mk' | 'en'; now: Date }): Promise<void>;

  // Member accounts: create account → confirm e-mail (24 h) → board approval.
  /** Creates the account, stores what was entered and sends the confirmation link. */
  registerMember(input: RegisterMemberInput): Promise<RegisterResult>;
  /** Uses a confirmation link: the account becomes "pending approval" and the person is signed in. */
  confirmEmail(input: { token: string; now: Date }): Promise<ConfirmResult>;
  /** Always resolves: a new confirmation link goes to an account that is still waiting for one. */
  resendConfirmation(input: { email: string; now: Date }): Promise<void>;
  /** Member sign-in (/login). Same lockout as the admin sign-in: 5 tries, 15 minutes. */
  signInMember(input: {
    email: string;
    password: string;
    remember: boolean;
    now: Date;
  }): Promise<SignInMemberResult>;
  /** Looks at a link without using it (the reset page shows whose password it is). */
  peekToken(input: { token: string; kind: TokenKind; now: Date }): Promise<TokenPeek>;
  /** Chooses a new password with a reset link; a member is signed in afterwards. */
  resetPassword(input: { token: string; password: string; now: Date }): Promise<ResetPasswordResult>;

  // Approvals › Member registrations (callers check the permission).
  /** Oldest first. Without `status`, every registration. */
  listRegistrations(input?: { status?: MemberRegistration['status'] }): Promise<MemberRegistration[]>;
  getRegistration(userId: string): Promise<MemberRegistration | null>;
  /** Approve (the profile goes live) or reject (an optional reason is e-mailed). */
  decideRegistration(input: {
    userId: string;
    decision: 'approve' | 'reject';
    reason: string;
    now: Date;
  }): Promise<DecideRegistrationResult>;
  /** Confirmed registrations waiting for a decision, and the oldest one's submit time. */
  pendingRegistrationSummary(): Promise<PendingRegistrationSummary>;

  // Admin users & roles (super admins; callers check the permission).
  /** Everyone with an admin role, including invited people, by role then name. */
  listAdmins(): Promise<AdminAccount[]>;
  /** Sends an invite; a member without a role gets the role on their existing account. */
  inviteAdmin(input: {
    name: string;
    email: string;
    role: AdminRole;
    managedEventIds: string[];
    now: Date;
  }): Promise<InviteResult>;
  /** Changes the role and/or managed events. Leaving event manager clears the events. */
  updateAdmin(
    userId: string,
    patch: { role?: AdminRole; managedEventIds?: string[] },
  ): Promise<AdminAccount | null>;
  /** Removes admin access (an invite is withdrawn; a member keeps their member account). */
  removeAdmin(userId: string): Promise<boolean>;
  resendInvite(userId: string, now: Date): Promise<AdminAccount | null>;
}
