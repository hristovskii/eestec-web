import type { AdminAccount, AdminRole, InviteResult, Session, SignInResult, TwoFactorResult } from '../types';

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
  /** Always resolves, whether or not the account exists (no account enumeration). */
  requestPasswordReset(input: { email: string }): Promise<void>;

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
