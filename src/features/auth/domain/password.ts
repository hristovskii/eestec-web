// The password rules shown under the field (AuthForm › Create account) and checked again on the server.

export const PASSWORD_MIN = 10;

/** A short list of the passwords everybody tries first; the backend phase checks a bigger list. */
const COMMON = [
  'password',
  'password1',
  'password123',
  'passw0rd',
  'qwerty',
  'qwertyuiop',
  'qwerty123',
  '1234567890',
  '12345678910',
  '123456789012',
  'iloveyou',
  'letmein123',
  'welcome123',
  'admin12345',
  'abc1234567',
  'eestec2026',
  'eestec123',
  'skopje123',
  'macedonia',
  'macedonia1',
  'football123',
  'monkey1234',
  'dragon1234',
  'sunshine123',
];

export type PasswordChecks = {
  /** At least PASSWORD_MIN characters. */
  length: boolean;
  /** Not the e-mail or the name. */
  personal: boolean;
  /** Not a common password. */
  common: boolean;
};

const normalise = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** True when the password is (or is made of) the person's e-mail or name. */
function isPersonal(password: string, { email, name }: { email: string; name: string }) {
  const word = normalise(password);
  if (word === '') return false;
  const local = normalise(email.split('@')[0] ?? '');
  const parts = [local, normalise(email), normalise(name), ...name.split(/\s+/).map(normalise)];
  // The password equals one of them, or is mostly one of them (a long part plus a digit or two).
  return parts.some(
    (part) =>
      part.length >= 4 && (word === part || (word.startsWith(part) && word.length <= part.length + 2)),
  );
}

export function checkPassword(password: string, person: { email: string; name: string }): PasswordChecks {
  const word = normalise(password);
  return {
    length: [...password].length >= PASSWORD_MIN,
    personal: !isPersonal(password, person),
    common: !COMMON.includes(password.toLowerCase()) && !COMMON.includes(word),
  };
}

export const passwordAccepted = (checks: PasswordChecks) => checks.length && checks.personal && checks.common;

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

/**
 * Four bars under the field: 0 nothing typed, 1 a rule is broken, then 2 fair, 3 good (12+ characters),
 * 4 strong (16+ characters mixing three kinds of characters).
 */
export function passwordStrength(
  password: string,
  person: { email: string; name: string },
): PasswordStrength {
  if (password === '') return 0;
  if (!passwordAccepted(checkPassword(password, person))) return 1;
  const length = [...password].length;
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\p{N}/u, /[^\p{L}\p{N}]/u].filter((kind) =>
    kind.test(password),
  ).length;
  return (2 + (length >= 12 ? 1 : 0) + (length >= 16 && kinds >= 3 ? 1 : 0)) as PasswordStrength;
}
