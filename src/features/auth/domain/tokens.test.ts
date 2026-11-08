import { describe, expect, it } from 'vitest';

import { newToken, TOKEN_TTL_MS, tokenState } from './tokens';

const now = new Date('2026-10-04T16:18:00Z');
const who = { userId: 'u-1', email: 'a@example.com' };

describe('tokens', () => {
  it('confirmation links work for 24 hours, reset links for 30 minutes', () => {
    expect(TOKEN_TTL_MS.confirm).toBe(24 * 3_600_000);
    expect(TOKEN_TTL_MS.reset).toBe(30 * 60_000);
    // A new e-mail address is confirmed like the one at sign-up.
    expect(TOKEN_TTL_MS.email_change).toBe(24 * 3_600_000);
    const confirm = newToken('confirm', who, now);
    const reset = newToken('reset', who, now);
    const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
    expect(tokenState(reset, 'reset', at(29))).toBe('valid');
    expect(tokenState(reset, 'reset', at(31))).toBe('expired');
    expect(tokenState(confirm, 'confirm', at(23 * 60 + 59))).toBe('valid');
    expect(tokenState(confirm, 'confirm', at(24 * 60 + 1))).toBe('expired');
  });

  it('a used link is expired, an unknown one or one of the other kind is invalid', () => {
    const used = { ...newToken('reset', who, now), usedAt: now.toISOString() };
    expect(tokenState(used, 'reset', now)).toBe('expired');
    expect(tokenState(undefined, 'reset', now)).toBe('invalid');
    expect(tokenState(newToken('confirm', who, now), 'reset', now)).toBe('invalid');
  });

  it('makes a different long token every time', () => {
    const a = newToken('reset', who, now).token;
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(newToken('reset', who, now).token).not.toBe(a);
  });
});
