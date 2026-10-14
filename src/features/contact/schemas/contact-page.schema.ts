import { z } from 'zod';

import { localized, rowId, text } from '@/shared/forms/page-schema';

import { CONTACT_HEADINGS, MAP_ZOOM } from '../types';

// Admin › Pages › Contact. Messages are keys of `admin.contact.errors` (the client translates them).

export const CONTACT_LIMITS = {
  title: 90,
  lead: 240,
  eyebrow: 40,
  label: 40,
  href: 200,
  heading: 60,
  formTitle: 60,
  formIntro: 200,
  subjects: 8,
  subjectName: 40,
  email: 120,
  team: 60,
  note: 240,
  shortcuts: 3,
  pinLabel: 40,
  place: 90,
  address: 120,
} as const;

/** A page of this site ("/join#apply") or an https link. */
const href = z
  .string()
  .trim()
  .min(1, 'required')
  .max(CONTACT_LIMITS.href, 'tooLong')
  .refine(
    (value) => /^\/(?!\/)\S*$/.test(value) || z.url({ protocol: /^https$/ }).safeParse(value).success,
    'url',
  );

const email = z
  .string()
  .trim()
  .min(1, 'required')
  .max(CONTACT_LIMITS.email, 'tooLong')
  .refine((value) => z.email().safeParse(value).success, 'email');

const subject = z
  .object({
    id: rowId,
    name: localized(CONTACT_LIMITS.subjectName, true),
    routeEmail: email,
    teamLabel: localized(CONTACT_LIMITS.team, true),
    routeNote: localized(CONTACT_LIMITS.note),
    shortcutLabel: localized(CONTACT_LIMITS.label),
    // Empty is allowed (no link); otherwise a site page or an https link.
    shortcutUrl: text(CONTACT_LIMITS.href).refine(
      (value) =>
        value === '' ||
        /^\/(?!\/)\S*$/.test(value) ||
        z.url({ protocol: /^https$/ }).safeParse(value).success,
      'url',
    ),
  })
  .superRefine((value, context) => {
    // A link needs words; words without a link make no sense either.
    if (value.shortcutUrl && !value.shortcutLabel.mk.trim())
      context.addIssue({ code: 'custom', path: ['shortcutLabel', 'mk'], message: 'required' });
    if (!value.shortcutUrl && value.shortcutLabel.mk.trim())
      context.addIssue({ code: 'custom', path: ['shortcutUrl'], message: 'required' });
  });

export const contactPageSchema = z.object({
  hero: z.object({
    title: localized(CONTACT_LIMITS.title, true),
    lead: localized(CONTACT_LIMITS.lead, true),
  }),
  shortcuts: z
    .array(
      z.object({
        id: rowId,
        eyebrow: localized(CONTACT_LIMITS.eyebrow, true),
        label: localized(CONTACT_LIMITS.label, true),
        href,
      }),
    )
    .max(CONTACT_LIMITS.shortcuts, 'tooMany'),
  headings: z.object(
    Object.fromEntries(
      CONTACT_HEADINGS.map((key) => [key, localized(CONTACT_LIMITS.heading, true)]),
    ) as Record<(typeof CONTACT_HEADINGS)[number], ReturnType<typeof localized>>,
  ),
  form: z.object({
    title: localized(CONTACT_LIMITS.formTitle, true),
    intro: localized(CONTACT_LIMITS.formIntro),
  }),
  // The form needs something to choose from.
  subjects: z.array(subject).min(1, 'tooFew').max(CONTACT_LIMITS.subjects, 'tooMany'),
  map: z.object({
    pinLabel: localized(CONTACT_LIMITS.pinLabel),
    placeName: localized(CONTACT_LIMITS.place, true),
    placeAddress: localized(CONTACT_LIMITS.address),
    lat: z.number('number').min(-90, 'range').max(90, 'range'),
    lng: z.number('number').min(-180, 'range').max(180, 'range'),
    zoom: z.number('number').int('number').min(MAP_ZOOM[0], 'range').max(MAP_ZOOM[1], 'range'),
  }),
});
