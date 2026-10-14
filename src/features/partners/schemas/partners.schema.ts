import { z } from 'zod';

import { localized, mediaRef, required, rowId } from '@/shared/forms/page-schema';

import { PARTNER_ICONS, TIER_SIZES } from '../types';

// Admin › Pages › Sponsors. Messages are keys of `admin.partners.errors` (the client translates them).

export const PARTNERS_LIMITS = {
  eyebrow: 60,
  title: 90,
  lead: 240,
  button: 40,
  stats: 4,
  statValue: 20,
  statLabel: 60,
  cards: 6,
  singles: 6,
  cardTitle: 60,
  cardText: 200,
  packages: 4,
  packageName: 40,
  packageText: 160,
  price: 40,
  packageItems: 8,
  packageItem: 100,
  note: 240,
  badge: 30,
  pages: 30,
  personName: 80,
  alt: 200,
  sponsorName: 80,
  url: 300,
  tiers: 8,
  tierName: 40,
} as const;

const icon = z.enum(PARTNER_ICONS, 'required');
const card = z.object({
  id: rowId,
  icon,
  title: localized(PARTNERS_LIMITS.cardTitle, true),
  text: localized(PARTNERS_LIMITS.cardText, true),
});

export const partnersPageSchema = z.object({
  hero: z.object({
    eyebrow: localized(PARTNERS_LIMITS.eyebrow),
    title: localized(PARTNERS_LIMITS.title, true),
    lead: localized(PARTNERS_LIMITS.lead, true),
    primaryLabel: localized(PARTNERS_LIMITS.button, true),
    offerLabel: localized(PARTNERS_LIMITS.button, true),
  }),
  reach: z.object({
    title: localized(PARTNERS_LIMITS.title),
    stats: z
      .array(
        z.object({
          id: rowId,
          value: localized(PARTNERS_LIMITS.statValue, true),
          label: localized(PARTNERS_LIMITS.statLabel, true),
        }),
      )
      .max(PARTNERS_LIMITS.stats, 'tooMany'),
  }),
  why: z.object({
    eyebrow: localized(PARTNERS_LIMITS.eyebrow),
    title: localized(PARTNERS_LIMITS.title, true),
    cards: z.array(card).max(PARTNERS_LIMITS.cards, 'tooMany'),
  }),
  packages: z.object({
    eyebrow: localized(PARTNERS_LIMITS.eyebrow),
    title: localized(PARTNERS_LIMITS.title, true),
    note: localized(PARTNERS_LIMITS.note),
    badge: localized(PARTNERS_LIMITS.badge, true),
    items: z
      .array(
        z.object({
          id: rowId,
          name: localized(PARTNERS_LIMITS.packageName, true),
          text: localized(PARTNERS_LIMITS.packageText, true),
          priceText: localized(PARTNERS_LIMITS.price),
          items: z
            .array(z.object({ id: rowId, text: localized(PARTNERS_LIMITS.packageItem, true) }))
            .max(PARTNERS_LIMITS.packageItems, 'tooMany'),
          highlighted: z.boolean(),
          cta: localized(PARTNERS_LIMITS.button, true),
        }),
      )
      .max(PARTNERS_LIMITS.packages, 'tooMany')
      // One card is "Most chosen", not two.
      .refine((items) => items.filter((item) => item.highlighted).length <= 1, 'oneHighlight'),
    singlesTitle: localized(PARTNERS_LIMITS.title),
    singles: z.array(card).max(PARTNERS_LIMITS.singles, 'tooMany'),
  }),
  offer: z.object({
    // Empty: no offer card and no download buttons.
    mediaId: z.string().max(80, 'tooLong'),
    title: localized(PARTNERS_LIMITS.title),
    text: localized(PARTNERS_LIMITS.note),
    pages: localized(PARTNERS_LIMITS.pages),
    downloadLabel: localized(PARTNERS_LIMITS.button, true),
  }),
  partners: z.object({
    eyebrow: localized(PARTNERS_LIMITS.eyebrow),
    title: localized(PARTNERS_LIMITS.title, true),
    pastTitle: localized(PARTNERS_LIMITS.title, true),
  }),
  contact: z.object({
    eyebrow: localized(PARTNERS_LIMITS.eyebrow),
    title: localized(PARTNERS_LIMITS.title, true),
    text: localized(PARTNERS_LIMITS.note),
    person: z.object({
      name: required(PARTNERS_LIMITS.personName),
      role: localized(PARTNERS_LIMITS.title),
      email: z.email('email').max(160, 'tooLong'),
    }),
  }),
});

const date = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date')]);

/** A sponsor's website: empty (the logo is then not a link) or an https address. */
const website = z
  .string()
  .trim()
  .max(PARTNERS_LIMITS.url, 'tooLong')
  .refine((value) => value === '' || z.url({ protocol: /^https$/ }).safeParse(value).success, 'url');

export const sponsorSchema = z
  .object({
    name: required(PARTNERS_LIMITS.sponsorName),
    logo: mediaRef(PARTNERS_LIMITS.alt).nullable(),
    websiteUrl: website,
    tierId: z.string().min(1, 'required'),
    activeFrom: date,
    activeTo: date,
    isActive: z.boolean(),
  })
  .refine((sponsor) => !sponsor.activeFrom || !sponsor.activeTo || sponsor.activeFrom <= sponsor.activeTo, {
    path: ['activeTo'],
    message: 'range',
  });

export const tiersSchema = z
  .array(
    z.object({
      id: rowId,
      name: localized(PARTNERS_LIMITS.tierName, true),
      size: z.enum(TIER_SIZES, 'required'),
    }),
  )
  .min(1, 'tooFew')
  .max(PARTNERS_LIMITS.tiers, 'tooMany')
  .refine((tiers) => new Set(tiers.map((tier) => tier.id)).size === tiers.length, 'unexpected');
