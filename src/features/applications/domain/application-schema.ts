import { z } from 'zod';

import {
  EMAIL_MAX,
  FILE_MAX_BYTES,
  FILE_TYPES,
  isUpload,
  maxLengthOf,
  NAME_MAX,
  type UploadLike,
  type Field,
} from './application-fields';

// The schema of one event's form, checked by the browser and the server. The browser loads this file
// only when the form is first used (zod is about 90 KB), so the rest lives in `application-fields.ts`.
export * from './application-fields';

const isPdf = (file: UploadLike) =>
  (FILE_TYPES as readonly string[]).includes(file.type) || /\.pdf$/i.test(file.name);

function answerSchema(field: Field) {
  switch (field.type) {
    case 'text':
    case 'long_text': {
      const max = maxLengthOf(field);
      const base = z.string().trim().max(max, { error: 'tooLong' });
      return field.required ? base.min(1, { error: 'required' }) : base;
    }
    case 'select': {
      const values = (field.options ?? []).map((option) => option.value);
      const base = z.string().refine((value) => value === '' || values.includes(value), { error: 'choose' });
      return field.required ? base.refine((value) => value !== '', { error: 'choose' }) : base;
    }
    case 'checkbox':
      return field.required ? z.literal(true, { error: 'checkbox' }) : z.boolean();
    case 'file': {
      const base = z
        .custom<UploadLike | null>((value) => value === null || isUpload(value))
        .refine((file) => !file || isPdf(file), { error: 'fileType' })
        .refine((file) => !file || file.size <= FILE_MAX_BYTES, { error: 'fileSize' });
      return field.required ? base.refine((file) => file !== null, { error: 'fileRequired' }) : base;
    }
  }
}

/** The schema of one event's form: the fixed fields plus its questions. */
export function buildApplicationSchema(fields: readonly Field[]) {
  return z.object({
    name: z.string().trim().min(1, { error: 'name' }).max(NAME_MAX, { error: 'tooLong' }),
    email: z
      .string()
      .trim()
      .max(EMAIL_MAX, { error: 'tooLong' })
      .pipe(z.email({ error: 'email' })),
    consent: z.literal(true, { error: 'consent' }),
    answers: z.object(Object.fromEntries(fields.map((field) => [field.key, answerSchema(field)]))),
  });
}
