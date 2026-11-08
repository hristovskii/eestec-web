import type { TokenKind } from '../types';

/** Decided: confirmation links work for 24 hours, reset links for 30 minutes (a new e-mail address is confirmed like one at sign-up). */
export const TOKEN_TTL_MS: Record<TokenKind, number> = {
  confirm: 24 * 60 * 60_000,
  reset: 30 * 60_000,
  email_change: 24 * 60 * 60_000,
};

export type TokenRecord = {
  token: string;
  kind: TokenKind;
  userId: string;
  email: string;
  /** ISO date-time. */
  expiresAt: string;
  usedAt: string | null;
};

export type TokenState = 'valid' | 'expired' | 'invalid';

/** A used link counts as expired: asking for a new one is the way forward. */
export function tokenState(record: TokenRecord | undefined, kind: TokenKind, now: Date): TokenState {
  if (!record || record.kind !== kind) return 'invalid';
  if (record.usedAt !== null) return 'expired';
  return new Date(record.expiresAt).getTime() > now.getTime() ? 'valid' : 'expired';
}

export function newToken(kind: TokenKind, who: { userId: string; email: string }, now: Date): TokenRecord {
  return {
    token: `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', ''),
    kind,
    userId: who.userId,
    email: who.email,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[kind]).toISOString(),
    usedAt: null,
  };
}
