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

export type MembershipFailure = 'closed' | 'duplicate' | 'spam' | 'tooFast' | 'unexpected';

export const failureFor = (verdict: Exclude<SpamVerdict, 'ok'>): 'spam' | 'tooFast' =>
  verdict === 'bot' ? 'spam' : 'tooFast';
