'use client';

import type { MediaItem } from '@/features/media';

import type { JoinInput } from '../../types';

/** What every Join Us section gets from the form. */
export type SectionProps = {
  values: JoinInput;
  /** Change the values (the draft is a copy; mutate it). */
  update: (recipe: (draft: JoinInput) => void) => void;
  /** Translated error of a field path ("faq.2.question.mk"), if any. */
  error: (path: string) => string | undefined;
  /** Library files the content uses, by id. */
  media: Record<string, MediaItem>;
  addMedia: (item: MediaItem) => void;
};

/** Field ids follow the value path, so the error summary can link to them. */
export const fieldId = (path: string) => `jn-${path.replace(/\.(mk|en)$/, '').replaceAll('.', '-')}`;

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
