/**
 * How long the Auth cookies live (decided: "Keep me signed in on this device for 14 days"; otherwise the cookie
 * ends with the browser session). Auth hands out cookies with a long lifetime; the app rewrites it to the person's
 * choice, which it remembers in a small marker cookie so a refresh keeps the same rule.
 */
export const REMEMBER_COOKIE = 'eestec_remember';
export const REMEMBER_MAX_AGE = 14 * 24 * 60 * 60;

type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  [key: string]: unknown;
};

const isRemoval = (options: CookieOptions) =>
  options.maxAge === 0 ||
  (options.maxAge !== undefined && options.maxAge < 0) ||
  (options.expires !== undefined && options.expires.getTime() <= Date.now());

/** The options an Auth cookie is written with: removals stay removals, everything else follows `remember`. */
export function authCookieOptions<T extends CookieOptions>(options: T, remember: boolean): T {
  if (isRemoval(options)) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return (remember ? { ...rest, maxAge: REMEMBER_MAX_AGE } : rest) as T;
}
