import { z } from 'zod';

import { ACTIVITY_ICONS, HOME_SECTION_KEYS } from '../types';

// Admin › Pages › Home. Messages are keys of `admin.home.errors` (the client translates them).

export const HOME_LIMITS = {
  eyebrow: 120,
  headline: 90,
  subtitle: 220,
  button: 40,
  href: 300,
  alt: 200,
  about: 1200,
  activityTitle: 60,
  activityText: 240,
  milestoneTitle: 80,
  milestoneText: 280,
  statLabel: 60,
  suffix: 3,
  activities: 8,
  milestones: 12,
  stats: 6,
  year: [1900, 2100],
  value: [0, 99_999_999],
} as const;

const text = (max: number) => z.string().trim().max(max, 'tooLong');
const required = (max: number) => text(max).min(1, 'required');

/** { mk, en? }: Macedonian required when `mkRequired`, English always optional (D8). */
const localized = (max: number, mkRequired = false) =>
  z.object({ mk: mkRequired ? required(max) : text(max), en: text(max).optional() });

/** "/join" (this site) or an https link. */
const href = z
  .string()
  .trim()
  .min(1, 'required')
  .max(HOME_LIMITS.href, 'tooLong')
  .refine(
    (value) => /^\/(?!\/)\S*$/.test(value) || z.url({ protocol: /^https$/ }).safeParse(value).success,
    'url',
  );

const button = z.object({ label: localized(HOME_LIMITS.button, true), href });

const image = z.object({
  mediaId: z.string().min(1, 'required'),
  alt: localized(HOME_LIMITS.alt, true),
});

const id = z.string().regex(/^[\w-]{1,64}$/, 'unexpected');

const whole = ([min, max]: readonly [number, number]) =>
  z.number('number').int('number').min(min, 'range').max(max, 'range');

export const homeInputSchema = z.object({
  hero: z.object({
    eyebrow: localized(HOME_LIMITS.eyebrow),
    headline: localized(HOME_LIMITS.headline, true),
    subtitle: localized(HOME_LIMITS.subtitle, true),
    primary: button,
    secondary: button,
    image: image.nullable(),
  }),
  about: z.object({ body: localized(HOME_LIMITS.about, true) }),
  activities: z
    .array(
      z.object({
        id,
        icon: z.enum(ACTIVITY_ICONS, 'required'),
        title: localized(HOME_LIMITS.activityTitle, true),
        text: localized(HOME_LIMITS.activityText, true),
      }),
    )
    .max(HOME_LIMITS.activities, 'tooMany'),
  milestones: z
    .array(
      z.object({
        id,
        year: whole(HOME_LIMITS.year),
        title: localized(HOME_LIMITS.milestoneTitle, true),
        text: localized(HOME_LIMITS.milestoneText, true),
        photo: image.nullable(),
      }),
    )
    .max(HOME_LIMITS.milestones, 'tooMany'),
  stats: z
    .array(
      z.object({
        id,
        label: localized(HOME_LIMITS.statLabel, true),
        value: whole(HOME_LIMITS.value),
        suffix: text(HOME_LIMITS.suffix),
      }),
    )
    .max(HOME_LIMITS.stats, 'tooMany'),
  layout: z
    .array(z.object({ key: z.enum(HOME_SECTION_KEYS), visible: z.boolean() }))
    .length(HOME_SECTION_KEYS.length, 'layout')
    .refine((items) => new Set(items.map((item) => item.key)).size === HOME_SECTION_KEYS.length, 'layout'),
});

export type HomeDraft = z.input<typeof homeInputSchema>;
