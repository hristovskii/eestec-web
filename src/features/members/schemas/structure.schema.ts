import { z } from 'zod';

import { BADGE_ICONS } from '../types';

// Teams, badges and boards (Admin › Members). Messages are keys of `admin.members.errors`.

export const STRUCTURE_LIMITS = { name: 40, description: 120, title: 60 } as const;

const text = (max: number) => z.string().trim().min(1, 'required').max(max, 'tooLong');
const optionalText = (max: number) => z.string().trim().max(max, 'tooLong').optional();
const id = z.string().regex(/^[\w-]{1,64}$/, 'unexpected');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'date');

export const teamSchema = z.object({
  name: z.object({ mk: text(STRUCTURE_LIMITS.name), en: optionalText(STRUCTURE_LIMITS.name) }),
});

export const badgeSchema = z.object({
  name: z.object({ mk: text(STRUCTURE_LIMITS.name), en: optionalText(STRUCTURE_LIMITS.name) }),
  description: z.object({
    mk: z.string().trim().max(STRUCTURE_LIMITS.description, 'tooLong'),
    en: optionalText(STRUCTURE_LIMITS.description),
  }),
  icon: z.enum(BADGE_ICONS, 'required'),
});

export const mandateSchema = z
  .object({
    label: z
      .string()
      .trim()
      .regex(/^\d{4}\/\d{4}$/, 'label'),
    startsOn: date,
    endsOn: date,
    isCurrent: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.endsOn < value.startsOn)
      context.addIssue({ code: 'custom', path: ['endsOn'], message: 'orderEnd' });
  });

export const seatSchema = z.object({
  boardRoleId: id,
  title: text(STRUCTURE_LIMITS.title),
  userId: id,
});

export const idSchema = id;
export const idsSchema = z.array(id).min(1).max(100);
