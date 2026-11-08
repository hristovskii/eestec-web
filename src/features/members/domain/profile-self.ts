// What a member may write on their own profile. Limits and rules without zod, so client forms can
// use them without loading the schema (the schema in schemas/profile-self.schema.ts uses them too).

export const SELF_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  bioMax: 400,
  usernameMin: 3,
  usernameMax: 30,
  faculty: 100,
  url: 200,
  phone: 30,
} as const;

/** Numbers people actually write: digits, spaces, + - ( ) and a dot (the same rule as at sign-up). */
export const PHONE_PATTERN = /^[+\d][\d\s()./-]{4,}$/;

/** Addresses that would collide with a page or look official. */
export const RESERVED_USERNAMES: readonly string[] = [
  '__none__',
  'admin',
  'api',
  'board',
  'edit',
  'eestec',
  'me',
  'members',
  'new',
  'profile',
  'settings',
];

export const isReservedUsername = (username: string) => RESERVED_USERNAMES.includes(username);

/** Lower-case letters, digits and single hyphens inside; 3–30 characters. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,28}[a-z0-9]$/;

/** What the person typed as the address, made lower case (they see the result in the field). */
export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isValidUsername = (username: string) => USERNAME_PATTERN.test(username);

const HOSTS = { linkedin: ['linkedin.com'], github: ['github.com'] } as const;

/**
 * An optional https link on the named site (www and subdomains such as `mk.linkedin.com` are fine).
 * Returns a problem key, or null when the value is empty or fine.
 */
export function socialUrlProblem(value: string, site: keyof typeof HOSTS): 'urlInvalid' | 'urlHost' | null {
  const text = value.trim();
  if (text === '') return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return 'urlInvalid';
  }
  if (url.protocol !== 'https:') return 'urlInvalid';
  const host = url.hostname.toLowerCase();
  return HOSTS[site].some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? null : 'urlHost';
}
