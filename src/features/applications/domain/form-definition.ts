import type { Localized } from '@/shared/types/localized';

import type { ApplicationField, ApplicationFieldType } from '../types';
import { DEFAULT_APPLICATION_FIELDS, DEFAULT_FORM_INTRO } from './default-form';

// Pure helpers of the form builder (Admin › Applications › Application form).

const empty: Localized = { mk: '' };
const random = () => crypto.randomUUID().replaceAll('-', '').slice(0, 6);

/** A new question: a stable key (answers are stored under it, so it never changes with the label). */
export function newField(type: ApplicationFieldType): ApplicationField {
  const base: ApplicationField = {
    key: `q-${random()}`,
    type,
    label: { ...empty },
    required: false,
    help: { ...empty },
    placeholder: { ...empty },
  };
  switch (type) {
    case 'text':
      return { ...base, format: 'plain', maxLength: 200 };
    case 'long_text':
      return { ...base, maxLength: 2000 };
    case 'select':
      return {
        ...base,
        appearance: 'dropdown',
        options: [newOption(), newOption()],
      };
    case 'checkbox':
    case 'file':
      return base;
  }
}

export function newOption() {
  return { value: `o-${random()}`, label: { ...empty } };
}

/** The type decides which settings exist: the others are dropped before saving. */
function clean(field: ApplicationField): ApplicationField {
  const { key, type, required } = field;
  const out: ApplicationField = {
    key,
    type,
    required,
    label: tidy(field.label),
    help: tidy(field.help),
    placeholder: type === 'checkbox' || type === 'file' ? { ...empty } : tidy(field.placeholder),
  };
  if (type === 'text') {
    out.format = field.format ?? 'plain';
    if (field.maxLength) out.maxLength = field.maxLength;
  }
  if (type === 'long_text' && field.maxLength) out.maxLength = field.maxLength;
  if (type === 'select') {
    out.appearance = field.appearance ?? 'dropdown';
    out.options = (field.options ?? []).map((option) => ({ value: option.value, label: tidy(option.label) }));
  }
  return out;
}

/** An empty English text means "use the Macedonian one": it isn't stored. */
function tidy(value: Localized): Localized {
  const en = value.en?.trim();
  return { mk: value.mk.trim(), ...(en ? { en } : {}) };
}

export function normalizeForm(form: { intro: Localized; fields: ApplicationField[] }) {
  return { intro: tidy(form.intro), fields: form.fields.map(clean) };
}

/** What a new event's form starts as: the default questions of spec 03. */
export const defaultForm = () =>
  structuredClone({ intro: DEFAULT_FORM_INTRO, fields: DEFAULT_APPLICATION_FIELDS });

/** Has the board changed anything compared with the default questions? */
export const isDefaultForm = (form: { intro: Localized; fields: ApplicationField[] }) =>
  JSON.stringify(normalizeForm(form)) === JSON.stringify(normalizeForm(defaultForm()));
