import { z } from 'zod';

import { ACCEPTED_TYPES, MAX_BYTES, kindOf } from '../domain/upload-rules';

// Messages are keys under admin.media.errors (the client translates them).

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);

export const MEDIA_PAGE_SIZES = [24, 48, 96] as const;

/** /admin/media?kind=&q=&alt=missing&mine=1&sort=&page=&size= — invalid values fall back to defaults. */
export const mediaListParamsSchema = z.object({
  kind: z.preprocess(first, z.enum(['image', 'document']).optional().catch(undefined)),
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  alt: z.preprocess(first, z.enum(['missing']).optional().catch(undefined)),
  mine: z.preprocess(first, z.enum(['1']).optional().catch(undefined)),
  sort: z.preprocess(first, z.enum(['newest', 'oldest', 'name']).catch('newest')),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (MEDIA_PAGE_SIZES as readonly number[]).includes(n))
      .catch(24),
  ),
});
export type MediaListParams = z.infer<typeof mediaListParamsSchema>;

export const startUploadSchema = z
  .object({
    fileName: z.string().trim().min(1).max(200),
    mimeType: z.string().refine((type) => ACCEPTED_TYPES.includes(type), 'type'),
    size: z.number().int().positive('empty'),
  })
  .refine(({ mimeType, size }) => size <= MAX_BYTES[kindOf(mimeType) ?? 'document'], {
    message: 'size',
    path: ['size'],
  });

/** Alt text + credit, as typed in the upload dialog and the details panel. */
const altFields = {
  alt: z.string().trim().max(250, 'altTooLong').optional(),
  /** "Decorative image (no alt text)": stored as alt="". */
  decorative: z.boolean().default(false),
  credit: z.string().trim().max(120, 'creditTooLong').optional(),
};

export const finishUploadSchema = z.object({
  uploadId: z.uuid(),
  /**
   * Gallery uploads (several photos dropped at once): the alt text is written where the photo is
   * used, and publishing waits for it. The library shows the file as "No alt text" until then.
   */
  altLater: z.boolean().default(false),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  ...altFields,
});

export const updateMediaSchema = z.object({ id: z.string().min(1), ...altFields });

type AltInput = { alt?: string; decorative: boolean };

/**
 * Images need alt text or an explicit "decorative" (decided rule: alt text on every image).
 * The server checks it against the stored file type, never a flag sent by the browser.
 */
export const altMissing = (value: AltInput, isImage: boolean) => isImage && !value.decorative && !value.alt;

/** Stored alt: '' when decorative, the text otherwise, null for documents. */
export const storedAlt = (value: AltInput, isImage: boolean) =>
  !isImage ? null : value.decorative ? '' : (value.alt ?? '');

export const deleteMediaSchema = z.object({ id: z.string().min(1) });
