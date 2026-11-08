import { z } from 'zod';

import { type FileInfo, IDEA_LIMITS, OTHER_EVENT } from './submission-fields';

// The schemas the browser and the server both check. The browser loads this file only when a form
// is first used (zod is about 90 KB), so the constants live in `submission-fields.ts`. Messages are
// keys of `ideas.submit.errors`.
export * from './submission-fields';

const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const trimmed = (max: number) => z.string().trim().max(max, 'tooLong');

const fileInfo = z.object({ name: z.string(), size: z.number(), type: z.string() });

/** "About you": a name and an e-mail are optional; an e-mail without the consent box ticked is not. */
const about = () => ({
  name: trimmed(IDEA_LIMITS.name),
  email: trimmed(IDEA_LIMITS.email).refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'email',
  ),
  consent: z.boolean(),
  anonymous: z.boolean(),
});

function consentIssue(
  value: { email: string; consent: boolean; anonymous: boolean },
  context: z.RefinementCtx,
  member: boolean,
) {
  if (!member && !value.anonymous && z.email().safeParse(value.email.trim()).success && !value.consent)
    context.addIssue({ code: 'custom', path: ['consent'], message: 'consent' });
}

/** `typeIds`: the idea types the board offers now; anything else is not a choice. */
export const buildIdeaSchema = (typeIds: readonly string[], member: boolean) =>
  z
    .object({
      type: z.string().refine((value) => typeIds.includes(value), 'type'),
      title: trimmed(IDEA_LIMITS.title).min(1, 'title'),
      description: trimmed(IDEA_LIMITS.description).min(IDEA_LIMITS.descriptionMin, 'description'),
      attachment: fileInfo.nullable().superRefine((file, context) => {
        if (!file) return;
        if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type))
          context.addIssue({ code: 'custom', message: 'attachmentType' });
        else if (file.size > IDEA_LIMITS.attachmentBytes)
          context.addIssue({ code: 'custom', message: 'attachmentSize' });
      }),
      ...about(),
    })
    .superRefine((value, context) => consentIssue(value, context, member));

/** `eventIds`: the listed events that have started. */
export const buildImpressionSchema = (eventIds: readonly string[], member: boolean) =>
  z
    .object({
      event: z.string().refine((value) => value === OTHER_EVENT || eventIds.includes(value), 'event'),
      otherEvent: trimmed(IDEA_LIMITS.otherEvent),
      rating: z.number().int().min(1).max(5).nullable(),
      impression: trimmed(IDEA_LIMITS.impression).min(IDEA_LIMITS.impressionMin, 'impression'),
      photos: z.array(fileInfo).superRefine((photos: FileInfo[], context) => {
        if (photos.length > IDEA_LIMITS.photos) context.addIssue({ code: 'custom', message: 'photoCount' });
        else if (photos.some((photo) => !(PHOTO_TYPES as readonly string[]).includes(photo.type)))
          context.addIssue({ code: 'custom', message: 'photoType' });
        else if (photos.some((photo) => photo.size > IDEA_LIMITS.photoBytes))
          context.addIssue({ code: 'custom', message: 'photoSize' });
      }),
      asMemory: z.boolean(),
      memoryTitle: trimmed(IDEA_LIMITS.memoryTitle),
      ...about(),
    })
    .superRefine((value, context) => {
      consentIssue(value, context, member);
      if (value.event === OTHER_EVENT && value.otherEvent.trim() === '')
        context.addIssue({ code: 'custom', path: ['otherEvent'], message: 'otherEvent' });
      if (member && value.asMemory && value.memoryTitle.trim() === '')
        context.addIssue({ code: 'custom', path: ['memoryTitle'], message: 'memoryTitle' });
    });
