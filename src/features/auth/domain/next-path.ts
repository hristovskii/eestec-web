/**
 * Where to go after logging in: the page the person came from (`?next=/events`), only if it is a
 * path on this site. Anything else (another site, "//evil.example", a backslash) becomes the home page.
 */
export function safeNextPath(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (
    !next ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\') ||
    /[\u0000-\u001f]/.test(next)
  )
    return '/';
  // The auth pages themselves are not a destination (that would loop).
  if (/^\/(en\/)?(login|register|forgot-password|reset-password|auth)(\/|\?|$)/.test(next)) return '/';
  return next;
}
