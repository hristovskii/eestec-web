import { describe, expect, it } from 'vitest';

import { authCookieOptions, REMEMBER_MAX_AGE } from './cookie-options';

describe('authCookieOptions', () => {
  const given = { path: '/', sameSite: 'lax' as const, maxAge: 34_560_000, expires: new Date('2099-01-01') };

  it('ends the cookie with the browser session when the person did not ask to be remembered', () => {
    expect(authCookieOptions(given, false)).toEqual({ path: '/', sameSite: 'lax' });
  });

  it('keeps the cookie for 14 days when they did', () => {
    expect(authCookieOptions(given, true)).toEqual({
      path: '/',
      sameSite: 'lax',
      maxAge: REMEMBER_MAX_AGE,
    });
    expect(REMEMBER_MAX_AGE).toBe(14 * 24 * 60 * 60);
  });

  it('leaves a removal alone', () => {
    expect(authCookieOptions({ path: '/', maxAge: 0 }, true)).toEqual({ path: '/', maxAge: 0 });
    const past = new Date(0);
    expect(authCookieOptions({ path: '/', expires: past }, false)).toEqual({ path: '/', expires: past });
  });
});
