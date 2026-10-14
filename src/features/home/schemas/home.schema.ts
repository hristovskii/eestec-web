import { z } from 'zod';

import { localized, mediaRef, rowId, siteHref, text, whole } from '@/shared/forms/page-schema';

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

const button = z.object({ label: localized(HOME_LIMITS.button, true), href: siteHref(HOME_LIMITS.href) });
const image = mediaRef(HOME_LIMITS.alt);
const id = rowId;

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
