import { z } from 'zod';

import { localized, rowId } from '@/shared/forms/page-schema';

import { JOIN_ICONS, JOIN_SECTIONS } from '../types';

// Admin › Pages › Join Us. Messages are keys of `admin.join.errors` (the client translates them).

export const JOIN_LIMITS = {
  eyebrow: 60,
  title: 90,
  lead: 240,
  cardTitle: 60,
  cardText: 200,
  glance: 3,
  glanceLabel: 30,
  glanceValue: 80,
  benefits: 8,
  line: 160,
  lines: 8,
  options: 12,
  option: 60,
  steps: 6,
  stepTitle: 60,
  stepText: 160,
  feeAmount: 30,
  feePer: 30,
  note: 240,
  conduct: 6,
  intro: 240,
  documents: 8,
  faq: 20,
  question: 120,
  answer: 600,
  nextRound: 60,
} as const;

const icon = z.enum(JOIN_ICONS, 'required');
const card = z.object({
  id: rowId,
  icon,
  title: localized(JOIN_LIMITS.cardTitle, true),
  text: localized(JOIN_LIMITS.cardText, true),
});
const lines = (max: number, maxLength: number, min = 0) =>
  z
    .array(z.object({ id: rowId, text: localized(maxLength, true) }))
    .min(min, 'tooFew')
    .max(max, 'tooMany');

export const joinInputSchema = z.object({
  hero: z.object({
    eyebrow: localized(JOIN_LIMITS.eyebrow),
    title: localized(JOIN_LIMITS.title, true),
    lead: localized(JOIN_LIMITS.lead, true),
  }),
  headings: z.object(
    Object.fromEntries(JOIN_SECTIONS.map((key) => [key, localized(JOIN_LIMITS.title, true)])) as Record<
      (typeof JOIN_SECTIONS)[number],
      ReturnType<typeof localized>
    >,
  ),
  glance: z
    .array(
      z.object({
        id: rowId,
        icon,
        label: localized(JOIN_LIMITS.glanceLabel, true),
        value: localized(JOIN_LIMITS.glanceValue, true),
      }),
    )
    .max(JOIN_LIMITS.glance, 'tooMany'),
  benefits: z.array(card).max(JOIN_LIMITS.benefits, 'tooMany'),
  eligibility: z.object({
    items: lines(JOIN_LIMITS.lines, JOIN_LIMITS.line),
    noteTitle: localized(JOIN_LIMITS.cardTitle),
    noteText: localized(JOIN_LIMITS.note),
  }),
  steps: z
    .array(
      z.object({
        id: rowId,
        title: localized(JOIN_LIMITS.stepTitle, true),
        text: localized(JOIN_LIMITS.stepText, true),
      }),
    )
    .max(JOIN_LIMITS.steps, 'tooMany'),
  fee: z.object({
    amount: localized(JOIN_LIMITS.feeAmount),
    per: localized(JOIN_LIMITS.feePer),
    note: localized(JOIN_LIMITS.note),
  }),
  rules: z.object({
    intro: localized(JOIN_LIMITS.intro),
    rights: lines(JOIN_LIMITS.lines, JOIN_LIMITS.line),
    duties: lines(JOIN_LIMITS.lines, JOIN_LIMITS.line),
    conduct: z.array(card).max(JOIN_LIMITS.conduct, 'tooMany'),
    international: z.object({
      before: lines(JOIN_LIMITS.lines, JOIN_LIMITS.line),
      during: lines(JOIN_LIMITS.lines, JOIN_LIMITS.line),
      after: lines(JOIN_LIMITS.lines, JOIN_LIMITS.line),
    }),
  }),
  documents: z
    .array(
      z.object({
        id: rowId,
        title: localized(JOIN_LIMITS.cardTitle, true),
        mediaId: z.string().min(1, 'required'),
      }),
    )
    .max(JOIN_LIMITS.documents, 'tooMany'),
  faq: z
    .array(
      z.object({
        id: rowId,
        question: localized(JOIN_LIMITS.question, true),
        answer: localized(JOIN_LIMITS.answer, true),
      }),
    )
    .max(JOIN_LIMITS.faq, 'tooMany'),
  apply: z.object({
    open: z.boolean(),
    nextRound: localized(JOIN_LIMITS.nextRound),
    intro: localized(JOIN_LIMITS.intro),
    // The form needs something to choose from.
    faculties: lines(JOIN_LIMITS.options, JOIN_LIMITS.option, 1),
    interests: lines(JOIN_LIMITS.options, JOIN_LIMITS.option, 1),
    heardFrom: lines(JOIN_LIMITS.options, JOIN_LIMITS.option, 1),
  }),
});
