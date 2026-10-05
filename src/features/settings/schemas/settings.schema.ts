import { z } from 'zod';

import { NOTIFICATION_KINDS, SEO_PAGES, type SettingsInput, type SettingsRecord, WEEKDAYS } from '../types';

// Admin › Settings. Messages are keys under admin.settings.errors (the client translates them).

const text = (max: number) => z.string().trim().max(max, 'tooLong');
const required = (max: number) => text(max).min(1, 'required');
const email = z.email('email');

/** { mk, en? }: Macedonian required when `mkRequired`, English always optional (D8). */
const localized = (max: number, mkRequired = false) =>
  z.object({ mk: mkRequired ? required(max) : text(max), en: text(max).optional() });

const imageAsset = z.object({
  mediaId: z.string().nullable(),
  src: z.string().min(1),
  fileName: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
});

const whole = (min: number, max: number) =>
  z.number('number').int('number').min(min, 'range').max(max, 'range');

export const SETTINGS_LIMITS = {
  deadlineSoonHours: [1, 336],
  justEndedDays: [1, 60],
  defaultMaxParticipants: [1, 1000],
  retentionMonths: [1, 60],
} as const;

export const settingsInputSchema = z.object({
  siteName: required(80),
  footerTagline: localized(240, true),
  branding: z.object({ fullColor: imageAsset, white: imageAsset, icon: imageAsset }),
  contact: z.object({
    mainEmail: email,
    address: localized(200, true),
    officeRoom: localized(120),
  }),
  weeklyMeeting: z.object({
    day: z.enum(WEEKDAYS),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time'),
    room: localized(120),
    showOnHome: z.boolean(),
  }),
  boardRoles: z.array(z.object({ id: z.string().min(1), title: required(80), email })).max(20, 'tooMany'),
  socialLinks: z.array(
    z.object({
      platform: z.enum(['instagram', 'facebook', 'linkedin']),
      handle: text(80),
      // Empty: the link is hidden on the site.
      url: z.union([z.literal(''), z.url({ protocol: /^https$/, error: 'url' })]),
    }),
  ),
  legal: z.object({
    fullName: text(200),
    shortName: text(80),
    registrationNumber: text(40),
    taxNumber: text(40),
    bankAccount: text(60),
    bankName: text(80),
    registeredSeat: text(200),
  }),
  events: z.object({
    deadlineSoonHours: whole(...SETTINGS_LIMITS.deadlineSoonHours),
    justEndedDays: whole(...SETTINGS_LIMITS.justEndedDays),
    defaultMaxParticipants: whole(...SETTINGS_LIMITS.defaultMaxParticipants),
    defaultWaitlistEnabled: z.boolean(),
    autoCloseApplications: z.boolean(),
  }),
  retentionMonths: whole(...SETTINGS_LIMITS.retentionMonths),
  seo: z.record(
    z.enum(SEO_PAGES),
    z.object({ title: localized(120), description: localized(320), shareImage: imageAsset.nullable() }),
  ),
  notifications: z.record(
    z.enum(NOTIFICATION_KINDS),
    z
      .object({ enabled: z.boolean(), recipients: z.array(email).max(10, 'tooMany') })
      .refine((value) => !value.enabled || value.recipients.length > 0, {
        message: 'recipientsRequired',
        path: ['recipients'],
      }),
  ),
}) satisfies z.ZodType<SettingsInput>;

/** Sections of the form, in page order (sub-nav, activity log entries). */
export const SETTINGS_SECTIONS = [
  'branding',
  'events',
  'contact',
  'seo',
  'notifications',
  'languages',
  'activity',
  'security',
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** Which form section owns each stored field (for "edited Settings › Events, SEO"). */
const SECTION_OF: Record<keyof SettingsInput, SettingsSection> = {
  siteName: 'branding',
  footerTagline: 'branding',
  branding: 'branding',
  events: 'events',
  contact: 'contact',
  weeklyMeeting: 'contact',
  boardRoles: 'contact',
  socialLinks: 'contact',
  legal: 'contact',
  seo: 'seo',
  notifications: 'notifications',
  retentionMonths: 'security',
};

/** Sections whose values differ between two versions, in page order. */
export function changedSections(
  before: SettingsRecord | SettingsInput,
  after: SettingsInput,
): SettingsSection[] {
  const changed = new Set<SettingsSection>();
  for (const key of Object.keys(SECTION_OF) as (keyof SettingsInput)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed.add(SECTION_OF[key]);
  }
  return SETTINGS_SECTIONS.filter((section) => changed.has(section));
}
