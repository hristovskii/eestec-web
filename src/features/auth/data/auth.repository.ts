import type {
  AccountDetails,
  AccountDetailsPatch,
  AccountExport,
  AdminAccount,
  ConfirmEmailChangeResult,
  DeleteAccountResult,
  PasswordCheck,
  RequestEmailChangeResult,
  ApprovedMemberIdentity,
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

  // My profile (M16): the member's own account. The caller has checked who is signed in.
  getAccountDetails(userId: string): Promise<AccountDetails | null>;
  updateAccountDetails(userId: string, patch: AccountDetailsPatch): Promise<AccountDetails | null>;
  /** Is this profile address used by another account? (The Members feature checks its own profiles.) */
  usernameTaken(userId: string, username: string): Promise<boolean>;
  /** The name and profile address the person chose on /profile (they show in the header and in links). */
  updateIdentity(
    userId: string,
    patch: { name?: string; username?: string },
  ): Promise<'ok' | 'taken' | 'not_found'>;
  /** Wrong tries count like at sign-in (5 tries, then 15 minutes). */
  verifyPassword(input: { userId: string; password: string; now: Date }): Promise<PasswordCheck>;
  /** `ok`: the password is changed. The new one's strength is checked by the caller. */
  changePassword(input: { userId: string; current: string; next: string; now: Date }): Promise<PasswordCheck>;
  /**
   * Sends a link to the NEW address; the address changes when the link is used (24 h). Until then the
   * old address keeps working. Needs the current password.
   */
  requestEmailChange(input: {
    userId: string;
    newEmail: string;
    password: string;
    locale: 'mk' | 'en';
    now: Date;
  }): Promise<RequestEmailChangeResult>;
  confirmEmailChange(input: { token: string; now: Date }): Promise<ConfirmEmailChangeResult>;
  /**
   * Removes the account, the sign-up record, links, password and sign-up photo, and sends a
   * confirmation to the old address. Board accounts are removed in Admin › Users & roles. The caller
   * has checked the password and clears the session.
   */
  deleteAccount(input: { userId: string; now: Date }): Promise<DeleteAccountResult>;
  /** What the account itself stores about a person ("Download my data"). */
  exportAccount(userId: string): Promise<AccountExport | null>;

  // Approvals › Member registrations (callers check the permission).
  /** Oldest first. Without `status`, every registration. */
  listRegistrations(input?: { status?: MemberRegistration['status'] }): Promise<MemberRegistration[]>;
  getRegistration(userId: string): Promise<MemberRegistration | null>;
  /** Approve (the profile goes live) or reject (an optional reason is e-mailed). */
  decideRegistration(input: {
    userId: string;
    decision: 'approve' | 'reject';
    reason: string;
    /** E-mail the person about the decision ("E-mail the reason" is on by default). */
    notify?: boolean;
    now: Date;
  }): Promise<DecideRegistrationResult>;
  /** Registrations the board approved, with the public facts only (feeds the Members profiles). */
  approvedMemberIdentities(): Promise<ApprovedMemberIdentity[]>;
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
