import { z } from 'zod';

import { MEMORY_LIMITS } from '../domain/memory-fields';

// The shape and the limits of what the editor sends. "Save draft" accepts anything within the
// limits; what a submit also needs is `submitProblems` (domain/memory-fields.ts).

const text = (max: number) => z.string().trim().max(max, 'tooLong');

const coverSchema = z.object({
  fileId: z.string().max(80).nullable(),
  sample: z.string().max(200).nullable(),
  alt: text(MEMORY_LIMITS.alt),
  credit: text(MEMORY_LIMITS.credit),
});

const photoSchema = z.object({
  id: z.string().min(1).max(80),
  fileId: z.string().max(80).nullable(),
  sample: z.string().max(200).nullable(),
  alt: text(MEMORY_LIMITS.alt),
  caption: text(MEMORY_LIMITS.caption),
});

export const memoryContentSchema = z.object({
  title: text(MEMORY_LIMITS.title),
  eventId: z.string().max(80).nullable(),
  otherEventName: text(MEMORY_LIMITS.otherEvent),
  city: text(MEMORY_LIMITS.city),
  country: text(MEMORY_LIMITS.country),
  happenedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateInvalid')
    .nullable(),
  body: z.string().max(MEMORY_LIMITS.bodyChars, 'bodyTooLong'),
  cover: coverSchema.nullable(),
  photos: z.array(photoSchema).max(MEMORY_LIMITS.photos, 'tooManyPhotos'),
});

export type MemoryContentInput = z.infer<typeof memoryContentSchema>;
