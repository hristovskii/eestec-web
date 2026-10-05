'use client';

import type { SettingsInput } from '../../types';

/** What every Settings section gets from the form. */
export type SectionProps = {
  values: SettingsInput;
  /** Change the values (the draft is a copy; mutate it). */
  update: (recipe: (draft: SettingsInput) => void) => void;
  /** Translated error of a field path ("boardRoles.2.email"), if any. */
  error: (path: string) => string | undefined;
};

/** Field ids follow the value path, so the error summary can link to them. */
export const fieldId = (path: string) => `s-${path.replace(/\.(mk|en)$/, '').replaceAll('.', '-')}`;

/** Settings sections use the shared edit-screen panel and switch row. */
export { FormSection as SettingsPanel, SwitchRow } from '@/shared/admin-ui/form-section';
