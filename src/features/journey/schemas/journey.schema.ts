import { z } from 'zod';

import { localized, mediaRef, rowId, siteHref } from '@/shared/forms/page-schema';

import { JOURNEY_ICONS } from '../types';

// Admin › Pages › Journey. Messages are keys of `admin.journey.errors` (the client translates them).

export const JOURNEY_LIMITS = {
  eyebrow: 60,
  title: 90,
  lead: 220,
  stepTitle: 40,
  stepText: 160,
  bullet: 100,
  quote: 200,
  author: 100,
  button: 40,
  href: 300,
  alt: 200,
  ctaText: 220,
  steps: 8,
  bullets: 4,
} as const;

const button = z.object({
  label: localized(JOURNEY_LIMITS.button, true),
  href: siteHref(JOURNEY_LIMITS.href),
});

export const journeyInputSchema = z.object({
  hero: z.object({
    eyebrow: localized(JOURNEY_LIMITS.eyebrow),
    title: localized(JOURNEY_LIMITS.title, true),
    lead: localized(JOURNEY_LIMITS.lead, true),
  }),
  steps: z
    .array(
      z.object({
        id: rowId,
        icon: z.enum(JOURNEY_ICONS, 'required'),
        title: localized(JOURNEY_LIMITS.stepTitle, true),
        text: localized(JOURNEY_LIMITS.stepText, true),
        button,
        bullets: z
          .array(z.object({ id: rowId, text: localized(JOURNEY_LIMITS.bullet, true) }))
          .max(JOURNEY_LIMITS.bullets, 'tooMany'),
        photo: mediaRef(JOURNEY_LIMITS.alt).nullable(),
        quote: z
          .object({
            text: localized(JOURNEY_LIMITS.quote, true),
            author: localized(JOURNEY_LIMITS.author, true),
          })
          .nullable(),
      }),
    )
    .min(1, 'tooFew')
    .max(JOURNEY_LIMITS.steps, 'tooMany'),
  cta: z.object({
    title: localized(JOURNEY_LIMITS.title, true),
    text: localized(JOURNEY_LIMITS.ctaText, true),
    button,
  }),
});
