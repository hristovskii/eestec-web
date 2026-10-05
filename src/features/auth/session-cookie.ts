// Cookie-level hint used by the proxy to send visitors to /admin/login before anything renders
// (a redirect inside a streamed layout would be client-side only). The real check is requireStaff().
export const MOCK_PERSONA_COOKIE = 'eestec_mock_persona';

/** True when the request carries a session cookie (mock persona now; Supabase auth cookies later). */
export function hasSessionCookie(names: readonly string[]): boolean {
  return names.some((name) => name === MOCK_PERSONA_COOKIE || /^sb-.+-auth-token/.test(name));
}
