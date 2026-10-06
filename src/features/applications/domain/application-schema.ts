import { z } from 'zod';

import type { AnswerValue, ApplicationField, PublicApplicationField } from '../types';

// The application form is built at runtime from the event's form definition, so the form builder,
// the browser and the server validate with one schema (docs/ARCHITECTURE.md §7). Messages are keys
// of `applications.form.errors`.

export const NAME_MAX = 120;
export const EMAIL_MAX = 200;
export const TEXT_MAX = 200;
export const LONG_TEXT_MAX = 2000;
export const FILE_MAX_BYTES = 5 * 1024 * 1024;
export const FILE_TYPES = ['application/pdf'] as const;

/** Names of the form controls (FormData). */
export const FORM_FIELDS = {
  name: 'name',
  email: 'email',
  consent: 'consent',
  answer: (key: string) => `answer-${key}`,
} as const;

type Field = ApplicationField | PublicApplicationField;

export const maxLengthOf = (field: Field) =>
  field.maxLength ?? (field.type === 'long_text' ? LONG_TEXT_MAX : TEXT_MAX);

/** A file as both the browser and the server see it. */
export type UploadLike = { name: string; size: number; type: string };

const isUpload = (value: unknown): value is UploadLike =>
  typeof value === 'object' && value !== null && 'size' in value && 'name' in value && 'type' in value;

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

export type ApplicationValues = {
  name: string;
  email: string;
  consent: boolean;
  answers: Record<string, string | boolean | UploadLike | null>;
};

/** FormData → the values the schema checks (missing controls become empty answers). */
export function readApplicationForm(data: FormData, fields: readonly Field[]): ApplicationValues {
  const text = (name: string) => {
    const value = data.get(name);
    return typeof value === 'string' ? value : '';
  };
  const answers: ApplicationValues['answers'] = {};
  for (const field of fields) {
    const name = FORM_FIELDS.answer(field.key);
    if (field.type === 'checkbox') answers[field.key] = data.get(name) === 'on';
    else if (field.type === 'file') {
      const file = data.get(name);
      answers[field.key] = isUpload(file) && file.size > 0 ? file : null;
    } else answers[field.key] = text(name);
  }
  return {
    name: text(FORM_FIELDS.name),
    email: text(FORM_FIELDS.email),
    consent: data.get(FORM_FIELDS.consent) === 'on',
    answers,
  };
}

/** Answers worth storing: empty optional answers are left out. Files are stored separately. */
export function storedAnswers(
  values: ApplicationValues['answers'],
  files: Record<string, AnswerValue>,
): Record<string, AnswerValue> {
  const answers: Record<string, AnswerValue> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key in files) answers[key] = files[key]!;
    else if (typeof value === 'string' && value.trim() !== '') answers[key] = value.trim();
    else if (value === true) answers[key] = true;
  }
  return answers;
}
