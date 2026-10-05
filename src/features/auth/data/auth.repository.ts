import type { Session, SignInResult, TwoFactorResult } from '../types';

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
  verifyTwoFactor(input: { code: string; kind: 'totp' | 'backup' }): Promise<TwoFactorResult>;
  /** Always resolves, whether or not the account exists (no account enumeration). */
  requestPasswordReset(input: { email: string }): Promise<void>;
}
