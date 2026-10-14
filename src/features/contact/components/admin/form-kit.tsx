'use client';

import type { ContactPageInput } from '../../types';

/** What every Contact section gets from the form. */
export type SectionProps = {
  values: ContactPageInput;
  /** Change the values (the draft is a copy; mutate it). */
  update: (recipe: (draft: ContactPageInput) => void) => void;
  /** Translated error of a field path ("subjects.2.routeEmail"), if any. */
  error: (path: string) => string | undefined;
};

/** Field ids follow the value path, so the error summary can link to them. */
export const fieldId = (path: string) => `ct-${path.replace(/\.(mk|en)$/, '').replaceAll('.', '-')}`;

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
