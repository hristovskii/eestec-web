import type { Localized } from '@/shared/types/localized';

import type { ApplicationField } from '../types';

// The fields every new application form starts with: the example fields of spec 03 ("full name,
// e-mail, phone, faculty, year of study, member / non-member, motivation letter, CV upload, dietary
// needs, T-shirt size"), with the labels, options and placeholders of UpcomingDetail. Full name and
// e-mail are fixed columns, so they are not listed here. Macedonian labels are drafts (D14,
// docs/i18n-review.md).

const text = (en: string, mk: string): Localized => ({ mk, en });
const empty: Localized = { mk: '' };
const option = (value: string, en: string, mk: string) => ({ value, label: text(en, mk) });

export const DEFAULT_FORM_INTRO = text('Takes about 10 minutes.', 'Трае околу 10 минути.');

export const MOTIVATION_MAX = 2000;

export const DEFAULT_APPLICATION_FIELDS: ApplicationField[] = [
  {
    key: 'phone',
    type: 'text',
    format: 'phone',
    label: text('Phone', 'Телефон'),
    required: false,
    help: empty,
    placeholder: empty,
    maxLength: 40,
  },
  {
    key: 'faculty',
    type: 'text',
    label: text('Faculty and university', 'Факултет и универзитет'),
    required: true,
    help: empty,
    placeholder: text('e.g. FEEIT, UKIM Skopje', 'на пр. ФЕИТ, УКИМ Скопје'),
    maxLength: 120,
  },
  {
    key: 'year',
    type: 'select',
    appearance: 'dropdown',
    label: text('Year of study', 'Година на студии'),
    required: true,
    help: empty,
    placeholder: empty,
    options: [
      option('1', '1st year', 'Прва година'),
      option('2', '2nd year', 'Втора година'),
      option('3', '3rd year', 'Трета година'),
      option('4', '4th year', 'Четврта година'),
      option('masters', 'Master’s', 'Магистерски студии'),
      option('phd', 'PhD', 'Докторски студии'),
    ],
  },
  {
    key: 'member',
    type: 'select',
    appearance: 'buttons',
    label: text('Are you an EESTEC member?', 'Дали сте член на EESTEC?'),
    required: true,
    help: empty,
    placeholder: empty,
    options: [option('yes', 'Yes', 'Да'), option('no', 'No', 'Не')],
  },
  {
    key: 'motivation',
    type: 'long_text',
    label: text('Motivation letter', 'Мотивациско писмо'),
    required: true,
    help: empty,
    placeholder: text(
      'Why this workshop, and what would you bring to the team?',
      'Зошто оваа работилница и што би донеле во тимот?',
    ),
    maxLength: MOTIVATION_MAX,
  },
  {
    key: 'cv',
    type: 'file',
    label: text('CV (PDF, max 5 MB)', 'CV (PDF, најмногу 5 MB)'),
    required: false,
    help: empty,
    placeholder: empty,
  },
  {
    key: 'diet',
    type: 'select',
    appearance: 'dropdown',
    label: text('Dietary needs', 'Исхрана'),
    required: false,
    help: empty,
    placeholder: empty,
    options: [
      option('none', 'None', 'Без посебни барања'),
      option('vegetarian', 'Vegetarian', 'Вегетаријанска'),
      option('vegan', 'Vegan', 'Веганска'),
      option('halal', 'Halal', 'Халал'),
      option('gluten-free', 'Gluten-free', 'Без глутен'),
      option('other', 'Other (tell us in the letter)', 'Друго (напишете во писмото)'),
    ],
  },
  {
    key: 'tshirt',
    type: 'select',
    appearance: 'buttons',
    label: text('T-shirt size', 'Големина на маица'),
    required: false,
    help: empty,
    placeholder: empty,
    options: ['XS', 'S', 'M', 'L', 'XL'].map((size) => option(size.toLowerCase(), size, size)),
  },
];
