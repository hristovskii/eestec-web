import { z } from 'zod';

import { SLUG_MAX, SLUG_PATTERN } from '@/shared/lib/slug';

import { CONTENT_STATUSES, EVENT_SCOPES } from '../types';

// Two schemas per entity (docs/ARCHITECTURE.md §7): the draft schema is lenient ("Save draft
// always works": only shapes and lengths), the publish schema adds what the public page needs.
// Messages are keys under admin.events.errors (the client translates them).

export const EVENT_LIMITS = {
  title: 90,
  shortDescription: 160,
  location: 120,
  city: 60,
  organizer: 80,
  richText: 40_000,
  agenda: 30,
  agendaTitle: 90,
  agendaText: 300,
  feePrice: 40,
  feeNote: 200,
  alt: 160,
  credit: 120,
  seoTitle: 60,
  seoDescription: 160,
  topics: 20,
  gallery: 100,
} as const;

const text = (max: number) => z.string().trim().max(max, 'tooLong');
const localized = (max: number) => z.object({ mk: text(max), en: text(max).optional() });
const dateTime = z.iso.datetime({ offset: true, message: 'dateTime' });
const id = z.string().trim().min(1).max(64);
const day = z.iso.date('date');
const count = z.number().int('number').min(0, 'number').max(100_000, 'number').nullable();

const image = z.object({
  mediaId: id,
  /** null: still missing (gallery uploads); '' = decorative. */
  alt: text(EVENT_LIMITS.alt).nullable(),
  credit: text(EVENT_LIMITS.credit).optional(),
});

/** YouTube or Vimeo, or nothing (the video section is hidden while this is empty). */
export const VIDEO_URL =
  /^https:\/\/(www\.)?(youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|vimeo\.com\/\d+)(\S*)$/;

export const eventDraftSchema = z.object({
  slug: z.string().trim().max(SLUG_MAX, 'tooLong').regex(SLUG_PATTERN, 'slug'),
  title: localized(EVENT_LIMITS.title),
  shortDescription: localized(EVENT_LIMITS.shortDescription),
  scope: z.enum(EVENT_SCOPES),
  typeId: id,
  topicIds: z.array(id).max(EVENT_LIMITS.topics, 'tooMany'),
  startsAt: dateTime,
  endsAt: dateTime,
  allDay: z.boolean(),
  location: localized(EVENT_LIMITS.location),
  city: localized(EVENT_LIMITS.city),
  country: localized(EVENT_LIMITS.city),
  organizer: text(EVENT_LIMITS.organizer).nullable(),
  description: localized(EVENT_LIMITS.richText),
  agenda: z
    .array(
      z.object({
        id,
        date: day.nullable(),
        title: localized(EVENT_LIMITS.agendaTitle),
        text: localized(EVENT_LIMITS.agendaText),
      }),
    )
    .max(EVENT_LIMITS.agenda, 'tooMany'),
  requirements: localized(EVENT_LIMITS.richText),
  fee: z.object({ price: localized(EVENT_LIMITS.feePrice), note: localized(EVENT_LIMITS.feeNote) }),
  contactEmail: z.union([z.literal(''), z.email('email')]),
  participantCount: count,
  countryCount: count,
  cover: image.nullable(),
  gallery: z.array(image).max(EVENT_LIMITS.gallery, 'tooMany'),
  infoPackId: id.nullable(),
  videoUrl: z.union([z.literal(''), z.string().trim().regex(VIDEO_URL, 'videoUrl')]),
  status: z.enum(CONTENT_STATUSES),
  publishAt: dateTime.nullable(),
  nextUp: z.boolean(),
  applications: z.object({
    enabled: z.boolean(),
    via: z.enum(['form', 'external']),
    externalUrl: z.union([z.literal(''), z.url({ protocol: /^https?$/, message: 'url' })]),
    opensAt: dateTime.nullable(),
    deadline: dateTime.nullable(),
    resultsOn: day.nullable(),
    maxParticipants: z.number().int('number').min(1, 'number').max(10_000, 'number').nullable(),
    waitlist: z.boolean(),
  }),
  seo: z.object({
    title: localized(EVENT_LIMITS.seoTitle),
    description: localized(EVENT_LIMITS.seoDescription),
    shareImageId: id.nullable(),
  }),
});

export type EventDraftInput = z.infer<typeof eventDraftSchema>;

type Issue = { path: (string | number)[]; message: string };

/** What the public page needs before an event can be published (or stay published). */
export function publishIssues(event: EventDraftInput): Issue[] {
  const issues: Issue[] = [];
  const need = (ok: boolean, path: Issue['path'], message = 'required') => {
    if (!ok) issues.push({ path, message });
  };

  need(event.title.mk !== '', ['title', 'mk']);
  need(event.shortDescription.mk !== '', ['shortDescription', 'mk']);
  need(event.location.mk !== '', ['location', 'mk']);
  event.agenda.forEach((item, index) => need(item.title.mk !== '', ['agenda', index, 'title', 'mk']));
  need(Date.parse(event.endsAt) >= Date.parse(event.startsAt), ['endsAt'], 'endBeforeStart');
  need(event.cover !== null, ['cover']);
  need(event.cover === null || event.cover.alt !== null, ['cover', 'alt'], 'altRequired');
  event.gallery.forEach((photo, index) => need(photo.alt !== null, ['gallery', index, 'alt'], 'altRequired'));

  const apps = event.applications;
  if (apps.enabled && apps.via === 'external') need(apps.externalUrl !== '', ['applications', 'externalUrl']);
  if (apps.enabled && apps.via === 'form') {
    need(apps.deadline !== null, ['applications', 'deadline']);
    if (apps.deadline && apps.opensAt)
      need(
        Date.parse(apps.opensAt) < Date.parse(apps.deadline),
        ['applications', 'deadline'],
        'deadlineBeforeOpen',
      );
    if (apps.deadline)
      need(
        Date.parse(apps.deadline) <= Date.parse(event.endsAt),
        ['applications', 'deadline'],
        'deadlineAfterEnd',
      );
  }
  return issues;
}

/** The draft schema plus the publish rules (the edit form's "Publish" and bulk Publish). */
export const eventPublishSchema = eventDraftSchema.superRefine((event, ctx) => {
  for (const issue of publishIssues(event)) ctx.addIssue({ code: 'custom', ...issue });
});
