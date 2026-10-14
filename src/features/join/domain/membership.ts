import { z } from 'zod';

import type { SpamVerdict } from '@/shared/forms/spam-guard';

// The membership form (JoinForm): what is asked, how it is read from the browser's FormData, and
// the one schema the browser and the server both check. Messages are keys of `join.form.errors`.

export const YEARS_OF_STUDY = ['1', '2', '3', '4', 'master', 'phd'] as const;
export type YearOfStudy = (typeof YEARS_OF_STUDY)[number];

export const MEMBERSHIP_LIMITS = { name: 80, email: 254, phone: 30, program: 100 } as const;

/** Names of the form's fields (ids in the page are prefixed with `join-`). */
export const MEMBERSHIP_FIELDS = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  faculty: 'faculty',
  program: 'program',
  year: 'year',
  interests: 'interests',
  heardFrom: 'heardFrom',
  consent: 'consent',
} as const;

export type MembershipValues = {
  name: string;
  email: string;
  phone: string;
  faculty: string;
  program: string;
  year: string;
  interests: string[];
  heardFrom: string;
  consent: boolean;
};

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

export function readMembershipForm(data: FormData): MembershipValues {
  return {
    name: text(data, MEMBERSHIP_FIELDS.name),
    email: text(data, MEMBERSHIP_FIELDS.email),
    phone: text(data, MEMBERSHIP_FIELDS.phone),
    faculty: text(data, MEMBERSHIP_FIELDS.faculty),
    program: text(data, MEMBERSHIP_FIELDS.program),
    year: text(data, MEMBERSHIP_FIELDS.year),
    interests: data
      .getAll(MEMBERSHIP_FIELDS.interests)
      .filter((value): value is string => typeof value === 'string'),
    heardFrom: text(data, MEMBERSHIP_FIELDS.heardFrom),
    consent: data.get(MEMBERSHIP_FIELDS.consent) !== null,
  };
}

/** Faculty, interests and "how did you hear" are lists the board keeps: only their ids are accepted. */
export function buildMembershipSchema(options: {
  faculties: string[];
  interests: string[];
  heardFrom: string[];
}) {
  const trimmed = (max: number) => z.string().trim().max(max, 'tooLong');
  return z.object({
    name: trimmed(MEMBERSHIP_LIMITS.name).min(1, 'required'),
    email: trimmed(MEMBERSHIP_LIMITS.email).min(1, 'required').pipe(z.email('email')),
    // Numbers people actually write: digits, spaces, + - ( ) and a dot.
    phone: trimmed(MEMBERSHIP_LIMITS.phone).refine(
      (value) => value === '' || /^[+\d][\d\s()./-]{4,}$/.test(value),
      'phone',
    ),
    faculty: z.string().refine((value) => options.faculties.includes(value), 'required'),
    program: trimmed(MEMBERSHIP_LIMITS.program).min(1, 'required'),
    year: z.enum(YEARS_OF_STUDY, 'year'),
    interests: z
      .array(z.string())
      .refine((values) => values.every((value) => options.interests.includes(value)), 'invalid'),
    heardFrom: z.string().refine((value) => value === '' || options.heardFrom.includes(value), 'invalid'),
    consent: z.literal(true, 'consent'),
  });
}

export type MembershipFailure = 'closed' | 'duplicate' | 'spam' | 'tooFast' | 'unexpected';

export const failureFor = (verdict: Exclude<SpamVerdict, 'ok'>): 'spam' | 'tooFast' =>
  verdict === 'bot' ? 'spam' : 'tooFast';
