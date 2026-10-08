import { describe, expect, it } from 'vitest';

import { fieldErrorsFrom } from '@/shared/forms/action-result';

import { applicationFormSchema } from '../schemas/application-form.schema';
import { DEFAULT_APPLICATION_FIELDS, DEFAULT_FORM_INTRO } from './default-form';
import { defaultForm, isDefaultForm, newField, normalizeForm } from './form-definition';

const errorsOf = (form: unknown) => {
  const result = applicationFormSchema.safeParse(form);
  return result.success ? {} : fieldErrorsFrom(result.error.issues);
};

describe('form definition', () => {
  it('accepts the default questions', () => {
    expect(errorsOf(defaultForm())).toEqual({});
    expect(isDefaultForm(defaultForm())).toBe(true);
  });

  it('gives every new question a stable, unique key and the settings of its type', () => {
    const keys = new Set(Array.from({ length: 50 }, () => newField('text').key));
    expect(keys.size).toBe(50);
    expect(newField('select').options).toHaveLength(2);
    expect(newField('long_text').maxLength).toBe(2000);
    expect(newField('checkbox').options).toBeUndefined();
  });

  it('asks for a label in Macedonian and two options for a select', () => {
    const form = {
      intro: { mk: '' },
      fields: [newField('text'), { ...newField('select'), label: { mk: 'Choose' } }],
    };
    expect(errorsOf(form)).toEqual({
      'fields.0.label.mk': ['required'],
      'fields.1.options.0.label.mk': ['required'],
      'fields.1.options.1.label.mk': ['required'],
    });
    const one = {
      ...newField('select'),
      label: { mk: 'Pick' },
      options: [{ value: 'a', label: { mk: 'A' } }],
    };
    expect(errorsOf({ intro: { mk: '' }, fields: [one] })).toEqual({ 'fields.0.options': ['twoOptions'] });
  });

  it('refuses duplicate keys, bad keys and too many questions', () => {
    const labelled = (type: 'text' | 'checkbox') => ({ ...newField(type), label: { mk: 'Q' } });
    const a = labelled('text');
    expect(errorsOf({ intro: { mk: '' }, fields: [a, { ...labelled('checkbox'), key: a.key }] })).toEqual({
      'fields.1.key': ['duplicate'],
    });
    expect(errorsOf({ intro: { mk: '' }, fields: [{ ...a, key: 'Bad Key!' }] })).toEqual({
      'fields.0.key': ['key'],
    });
    const many = Array.from({ length: 31 }, () => labelled('text'));
    expect(errorsOf({ intro: { mk: '' }, fields: many })).toEqual({ fields: ['tooMany'] });
  });

  it('drops what a type does not use and empty English texts before saving', () => {
    const field = {
      ...newField('checkbox'),
      label: { mk: ' Photos allowed ', en: '  ' },
      format: 'phone' as const,
      maxLength: 10,
      options: [{ value: 'x', label: { mk: 'X' } }],
      placeholder: { mk: 'ignored' },
    };
    const [cleaned] = normalizeForm({ intro: { mk: 'Hi ', en: '' }, fields: [field] }).fields;
    expect(cleaned).toEqual({
      key: field.key,
      type: 'checkbox',
      required: false,
      label: { mk: 'Photos allowed' },
      help: { mk: '' },
      placeholder: { mk: '' },
    });
  });

  it('knows when the form still equals the default', () => {
    const form = defaultForm();
    form.fields.pop();
    expect(isDefaultForm(form)).toBe(false);
    expect(DEFAULT_APPLICATION_FIELDS.length).toBeGreaterThan(form.fields.length);
    expect(isDefaultForm({ intro: DEFAULT_FORM_INTRO, fields: DEFAULT_APPLICATION_FIELDS })).toBe(true);
  });
});
