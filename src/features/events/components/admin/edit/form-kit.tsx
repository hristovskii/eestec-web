'use client';

import * as React from 'react';

import type { MediaItem } from '@/features/media';
import { isoToZoned, zonedToIso } from '@/shared/lib/zoned-time';

import type { EventDraftInput } from '../../../schemas/event.schema';
import type { EventTiming } from '../../../types';

/** What every section of the edit form gets. */
export type EventFormContextValue = {
  values: EventDraftInput;
  /** Change the values (the draft is a copy; mutate it). */
  update: (recipe: (draft: EventDraftInput) => void) => void;
  /** Translated error of a field path ("gallery.2.alt"), if any. */
  error: (path: string) => string | undefined;
  /** Library files used by the event, by id (thumbnails, file names). */
  media: Record<string, MediaItem>;
  addMedia: (items: MediaItem[]) => void;
  /** Where the event is on the site right now (page address prefix). */
  timing: EventTiming;
  /** Super admins and editors may add topics; event managers may not (D18). */
  canAddTopics: boolean;
  canDelete: boolean;
  isNew: boolean;
  /** "Edit application form · 8 questions": null when this admin may not edit it. */
  applicationForm: { href: string; questions: number } | null;
  /**
   * Field ids follow the value path, so the error summary can link to them. They include the
   * event id: Next keeps the previous page mounted (hidden) for back/forward, and two forms on
   * the page must not share ids.
   */
  fieldId: (path: string) => string;
};

export const EventFormContext = React.createContext<EventFormContextValue | null>(null);

export function useEventForm(): EventFormContextValue {
  const context = React.use(EventFormContext);
  if (!context) throw new Error('useEventForm outside the event form');
  return context;
}

/** `e-<event id or "new">-<path>`, e.g. "e-ev-ai-at-the-edge-gallery-2-alt". */
export const fieldIdFor = (scope: string) => (path: string) =>
  `e-${scope}-${path.replace(/\.(mk|en)$/, '').replaceAll('.', '-')}`;

/** ISO instant → value of <input type="datetime-local"> in Skopje time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const { date, time } = isoToZoned(iso);
  return `${date}T${time}`;
}

/** <input type="datetime-local"> value (Skopje) → ISO instant, or null when empty / invalid. */
export function fromLocalInput(value: string): string | null {
  const [date = '', time = ''] = value.split('T');
  return zonedToIso(date, time.slice(0, 5));
}

/** "" for empty number inputs, so they can be cleared. */
export const numberValue = (value: number | null) => (value === null ? '' : String(value));
export const parseNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
