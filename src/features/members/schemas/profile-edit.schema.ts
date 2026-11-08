import { z } from 'zod';

import { EVENT_ROLES, PROFILE_STATUSES, TEAM_ROLES } from '../types';

// What the board edits on a profile (Admin › Members). Messages are keys of `admin.members.errors`.

export const PROFILE_EDIT_LIMITS = { note: 120, line: 120, teams: 6, badges: 12, events: 200 } as const;

const id = z.string().regex(/^[\w-]{1,64}$/, 'unexpected');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'date');
const line = z.object({
  mk: z.string().trim().min(1, 'required').max(PROFILE_EDIT_LIMITS.line, 'tooLong'),
  en: z.string().trim().max(PROFILE_EDIT_LIMITS.line, 'tooLong').optional(),
});

const unique = <T>(items: readonly T[], key: (item: T) => string) =>
  new Set(items.map(key)).size === items.length;

export const profileEditSchema = z
  .object({
    status: z.enum(PROFILE_STATUSES, 'required'),
    memberSince: date,
    activeTo: date.nullable(),
    teams: z
      .array(z.object({ teamId: id, role: z.enum(TEAM_ROLES, 'required') }))
      .max(PROFILE_EDIT_LIMITS.teams, 'tooMany')
      .refine((items) => unique(items, (item) => item.teamId), 'duplicate'),
    badges: z
      .array(z.object({ badgeId: id, note: z.string().trim().max(PROFILE_EDIT_LIMITS.note, 'tooLong') }))
      .max(PROFILE_EDIT_LIMITS.badges, 'tooMany')
      .refine((items) => unique(items, (item) => item.badgeId), 'duplicate'),
    events: z
      .array(z.object({ eventId: id, role: z.enum(EVENT_ROLES, 'required') }))
      .max(PROFILE_EDIT_LIMITS.events, 'tooMany')
      .refine((items) => unique(items, (item) => item.eventId), 'duplicate'),
    alumniNow: line.nullable(),
    alumniHighlight: line.nullable(),
    hidePhoto: z.boolean(),
    hideBio: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.status === 'alumni' && value.activeTo && value.activeTo < value.memberSince)
      context.addIssue({ code: 'custom', path: ['activeTo'], message: 'order' });
  });

export type ProfileEditDraft = z.input<typeof profileEditSchema>;
