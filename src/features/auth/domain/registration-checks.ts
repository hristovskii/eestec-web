import type { MemberRegistration } from '../types';

/** The faculties of UKIM write to students from `students.<faculty>.ukim.edu.mk`; any address of a `ukim` domain counts. */
export function isFacultyEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return domain.endsWith('.mk') && domain.split('.').includes('ukim');
}

/** What the board looks at before approving: the facts the sign-up form can show. */
export type RegistrationChecks = { hasPhoto: boolean; facultyEmail: boolean; confirmedEmail: boolean };

export function checksOf(registration: MemberRegistration): RegistrationChecks {
  return {
    hasPhoto: registration.photoId !== null,
    facultyEmail: isFacultyEmail(registration.email),
    confirmedEmail: registration.confirmedAt !== null,
  };
}
