'use client';

import type { MediaItem } from '@/features/media';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import type { Localized } from '@/shared/types/localized';

import type { PartnersPageInput } from '../../types';

/** What every section of the Page tab gets from the form. */
export type SectionProps = {
  values: PartnersPageInput;
  /** Change the values (the draft is a copy; mutate it). */
  update: (recipe: (draft: PartnersPageInput) => void) => void;
  /** Translated error of a field path ("packages.items.1.name.mk"), if any. */
  error: (path: string) => string | undefined;
  /** Library files the content uses, by id. */
  media: Record<string, MediaItem>;
  addMedia: (item: MediaItem) => void;
};

/** Field ids follow the value path, so the error summary can link to them. */
export const fieldId = (path: string) => `pt-${path.replace(/\.(mk|en)$/, '').replaceAll('.', '-')}`;

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

type Node = Record<string, unknown>;
const walk = (root: unknown, keys: string[]) =>
  keys.reduce<unknown>((node, key) => (node as Node)[key], root);

/** The value at a path like "hero.title" or "packages.items.1.name". */
export const getAt = <T,>(root: PartnersPageInput, path: string): T => walk(root, path.split('.')) as T;

/** Sets the value at a path in a draft. */
export function setAt(root: PartnersPageInput, path: string, value: unknown) {
  const keys = path.split('.');
  const last = keys.pop()!;
  (walk(root, keys) as Node)[last] = value;
}

type LocProps = {
  section: Pick<SectionProps, 'values' | 'update' | 'error'>;
  /** Where the value lives: "hero.title", "packages.items.1.name". */
  path: string;
  label: string;
  max: number;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  help?: string;
};

/** A both-languages text field bound to a path of the page's values. */
export function Loc({ section, path, label, max, required, multiline, rows, help }: LocProps) {
  return (
    <LocalizedField
      id={fieldId(path)}
      label={label}
      help={help}
      required={required}
      multiline={multiline}
      rows={rows ?? 2}
      value={getAt<Localized>(section.values, path)}
      onChange={(value) => section.update((draft) => setAt(draft, path, value))}
      error={section.error(`${path}.mk`)}
      maxLength={max}
    />
  );
}
