import { z } from 'zod';

import { APPLICATION_FIELD_TYPES } from '../types';

// The form builder's definition of an event's application form (spec 03: add, remove and reorder
// questions; text, long text, select, checkbox, file). One schema for the browser and the action.
// Messages are keys of `admin.applications.builder.errors`.

export const FORM_LIMITS = {
  fields: 30,
  options: 30,
  label: 120,
  help: 200,
  placeholder: 120,
  intro: 120,
  optionLabel: 80,
  /** Highest "max characters" a text question can ask for. */
  textMax: 5000,
} as const;

const text = (max: number, required = false) => {
  const base = z.string().trim().max(max, 'tooLong');
  return required ? base.min(1, 'required') : base;
};

/** MK is the required language (D8); an empty EN falls back to it on the English page. */
const localized = (max: number, required = false) =>
  z.object({ mk: text(max, required), en: text(max).optional() });

export const FIELD_KEY = /^[a-z0-9][a-z0-9-]{0,39}$/;

const option = z.object({
  value: z.string().regex(FIELD_KEY, 'key'),
  label: localized(FORM_LIMITS.optionLabel, true),
});

const field = z.object({
  key: z.string().regex(FIELD_KEY, 'key'),
  type: z.enum(APPLICATION_FIELD_TYPES),
  label: localized(FORM_LIMITS.label, true),
  required: z.boolean(),
  help: localized(FORM_LIMITS.help),
  placeholder: localized(FORM_LIMITS.placeholder),
  format: z.enum(['plain', 'phone']).optional(),
  maxLength: z.number().int('number').min(1, 'number').max(FORM_LIMITS.textMax, 'number').optional(),
  options: z.array(option).max(FORM_LIMITS.options, 'tooMany').optional(),
  appearance: z.enum(['dropdown', 'buttons']).optional(),
});

export const applicationFormSchema = z
  .object({
    intro: localized(FORM_LIMITS.intro),
    fields: z.array(field).max(FORM_LIMITS.fields, 'tooMany'),
  })
  .superRefine((form, ctx) => {
    const seen = new Set<string>();
    form.fields.forEach((item, index) => {
      if (seen.has(item.key))
        ctx.addIssue({ code: 'custom', path: ['fields', index, 'key'], message: 'duplicate' });
      seen.add(item.key);
      if (item.type !== 'select') return;
      const options = item.options ?? [];
      if (options.length < 2)
        ctx.addIssue({ code: 'custom', path: ['fields', index, 'options'], message: 'twoOptions' });
      const values = new Set<string>();
      options.forEach((choice, at) => {
        if (values.has(choice.value))
          ctx.addIssue({
            code: 'custom',
            path: ['fields', index, 'options', at, 'value'],
            message: 'duplicate',
          });
        values.add(choice.value);
      });
    });
  });

export type ApplicationFormInput = z.infer<typeof applicationFormSchema>;
