import { describe, expect, it } from 'vitest';

import { fieldErrorsFrom } from '@/shared/forms/action-result';

import {
  buildApplicationSchema,
  FILE_MAX_BYTES,
  readApplicationForm,
  storedAnswers,
} from './application-schema';
import { DEFAULT_APPLICATION_FIELDS } from './default-form';

const fields = DEFAULT_APPLICATION_FIELDS;
const schema = buildApplicationSchema(fields);

const valid = {
  name: 'Marija Stojanovska',
  email: 'marija.s@students.feit.ukim.edu.mk',
  consent: true,
  answers: {
    phone: '',
    faculty: 'FEEIT, UKIM Skopje',
    year: '3',
    member: 'yes',
    motivation: 'I want to build things.',
    cv: null,
    diet: 'none',
    tshirt: '',
  },
};

const errorsOf = (values: unknown) => {
  const result = schema.safeParse(values);
  return result.success ? {} : fieldErrorsFrom(result.error.issues);
};

describe('buildApplicationSchema', () => {
  it('accepts a complete application', () => {
    expect(errorsOf(valid)).toEqual({});
  });

  it('asks for the fixed fields and the consent', () => {
    expect(errorsOf({ ...valid, name: ' ', email: 'not-an-email', consent: false })).toEqual({
      name: ['name'],
      email: ['email'],
      consent: ['consent'],
    });
  });

  it('checks required answers, options and lengths', () => {
    const errors = errorsOf({
      ...valid,
      answers: { ...valid.answers, faculty: '', year: '', member: 'maybe', motivation: 'x'.repeat(2001) },
    });
    expect(errors).toEqual({
      'answers.faculty': ['required'],
      'answers.year': ['choose'],
      'answers.member': ['choose'],
      'answers.motivation': ['tooLong'],
    });
  });

  it('accepts PDFs up to 5 MB only', () => {
    const file = (name: string, type: string, size: number) => ({ name, type, size });
    const withCv = (cv: unknown) => errorsOf({ ...valid, answers: { ...valid.answers, cv } });
    expect(withCv(file('cv.pdf', 'application/pdf', 1000))).toEqual({});
    expect(withCv(file('cv.docx', 'application/msword', 1000))).toEqual({ 'answers.cv': ['fileType'] });
    expect(withCv(file('cv.pdf', 'application/pdf', FILE_MAX_BYTES + 1))).toEqual({
      'answers.cv': ['fileSize'],
    });
  });

  it('requires a ticked box for a required checkbox and a file for a required upload', () => {
    const strict = buildApplicationSchema([
      {
        key: 'days',
        type: 'checkbox',
        label: { mk: 'All days' },
        required: true,
        help: { mk: '' },
        placeholder: { mk: '' },
      },
      {
        key: 'cv',
        type: 'file',
        label: { mk: 'CV' },
        required: true,
        help: { mk: '' },
        placeholder: { mk: '' },
      },
    ]);
    const result = strict.safeParse({ ...valid, answers: { days: false, cv: null } });
    expect(result.success ? {} : fieldErrorsFrom(result.error.issues)).toEqual({
      'answers.days': ['checkbox'],
      'answers.cv': ['fileRequired'],
    });
  });
});

describe('readApplicationForm', () => {
  it('reads the controls of the form, and leaves empty optional answers out when storing', () => {
    const data = new FormData();
    data.set('name', 'Ana');
    data.set('email', 'ana@example.com');
    data.set('consent', 'on');
    data.set('answer-faculty', 'FEEIT');
    data.set('answer-cv', new File([], ''));
    const values = readApplicationForm(data, fields);
    expect(values).toMatchObject({ name: 'Ana', email: 'ana@example.com', consent: true });
    expect(values.answers).toMatchObject({ faculty: 'FEEIT', phone: '', cv: null, year: '' });
    expect(storedAnswers(values.answers, {})).toEqual({ faculty: 'FEEIT' });
  });
});
