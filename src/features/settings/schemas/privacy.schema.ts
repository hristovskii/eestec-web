import { z } from 'zod';

import { isEmptyRichText } from '@/shared/lib/rich-text';

// Admin › Pages › Contact › Privacy policy. Messages are keys of `admin.privacy.errors`.

export const PRIVACY_LIMITS = { title: 120, body: 60_000 } as const;

const text = (max: number) => z.string().trim().max(max, 'tooLong');

export const privacyInputSchema = z.object({
  title: z.object({
    mk: text(PRIVACY_LIMITS.title).min(1, 'required'),
    en: text(PRIVACY_LIMITS.title).optional(),
  }),
  body: z.object({
    // Macedonian is required, and "empty" includes an editor with only blank paragraphs.
    mk: z
      .string()
      .max(PRIVACY_LIMITS.body, 'tooLong')
      .refine((value) => !isEmptyRichText(value), 'required'),
    en: z.string().max(PRIVACY_LIMITS.body, 'tooLong').optional(),
  }),
  isPlaceholder: z.boolean(),
});
