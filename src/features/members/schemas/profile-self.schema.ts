import { z } from 'zod';

import {
  isReservedUsername,
  isValidUsername,
  normalizeUsername,
  PHONE_PATTERN,
  SELF_LIMITS,
  socialUrlProblem,
} from '../domain/profile-self';

// What a member edits on their own profile (/profile). The browser and the server both check it.
// Messages are keys of `members.me.errors`. The year comes from the sign-up lists of `auth`.

const YEARS = ['1', '2', '3', '4', 'master', 'phd'] as const;

const social = (site: 'linkedin' | 'github') =>
  z
    .string()
    .trim()
    .max(SELF_LIMITS.url, 'urlInvalid')
    .superRefine((value, context) => {
      const problem = socialUrlProblem(value, site);
      if (problem) context.addIssue({ code: 'custom', message: problem });
    });

export const profileSelfSchema = z.object({
  name: z.string().trim().min(SELF_LIMITS.nameMin, 'nameShort').max(SELF_LIMITS.nameMax, 'nameLong'),
  username: z
    .string()
    .transform(normalizeUsername)
    .superRefine((value, context) => {
      if (!isValidUsername(value)) context.addIssue({ code: 'custom', message: 'usernameInvalid' });
      else if (isReservedUsername(value)) context.addIssue({ code: 'custom', message: 'usernameReserved' });
    }),
  // Line breaks are kept; the counter counts what is stored.
  bio: z.string().trim().max(SELF_LIMITS.bioMax, 'bioLong'),
  linkedinUrl: social('linkedin'),
  githubUrl: social('github'),
  faculty: z.string().trim().min(1, 'facultyRequired').max(SELF_LIMITS.faculty, 'facultyRequired'),
  phone: z
    .string()
    .trim()
    .max(SELF_LIMITS.phone, 'phoneInvalid')
    .refine((value) => value === '' || PHONE_PATTERN.test(value), 'phoneInvalid'),
  year: z.enum(YEARS, 'yearRequired'),
});

export type ProfileSelfInput = z.infer<typeof profileSelfSchema>;
