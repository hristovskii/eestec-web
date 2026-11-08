import { countWords, isEmptyRichText } from '@/shared/lib/rich-text';

import type { MemoryContent } from '../types';

// Limits and rules of a Memory, with no zod (the editor is a client component and loads the schema
// only when it needs it). Messages are keys of `memories.editor.*`.

export const MEMORY_LIMITS = {
  title: 90,
  otherEvent: 90,
  city: 60,
  country: 60,
  alt: 160,
  caption: 160,
  credit: 80,
  photos: 30,
  /** The stored HTML, a guard against pasted books. */
  bodyChars: 60_000,
} as const;

/** What a person can upload: compressed in the browser first (see photo-compress). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
/** Longest side after compression. */
export const PHOTO_MAX_SIDE = 2000;

export const WORDS_PER_MINUTE = 200;

export const readMinutes = (words: number) => Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

export const EXCERPT_CHARS = 220;

/** The first words of the text for a card (plain text, cut at a word). */
export function excerptOf(html: string, max = EXCERPT_CHARS): string {
  const text = html
    .replace(/<\/(p|h2|h3|li|blockquote)>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40)).replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** What is missing before a Memory can be sent to the board. "Save draft" never needs any of it. */
export type MemoryProblem =
  | { field: 'title' }
  | { field: 'event' }
  | { field: 'place' }
  | { field: 'text' }
  | { field: 'cover' }
  | { field: 'coverAlt' }
  | { field: 'photoAlt'; count: number };

export function submitProblems(content: MemoryContent): MemoryProblem[] {
  const problems: MemoryProblem[] = [];
  if (!content.title.trim()) problems.push({ field: 'title' });
  if (!content.eventId && !content.otherEventName.trim()) problems.push({ field: 'event' });
  if (!content.city.trim() || !content.country.trim()) problems.push({ field: 'place' });
  if (isEmptyRichText(content.body)) problems.push({ field: 'text' });
  if (!content.cover) problems.push({ field: 'cover' });
  else if (!content.cover.alt.trim()) problems.push({ field: 'coverAlt' });
  const missing = content.photos.filter((photo) => !photo.alt.trim()).length;
  if (missing > 0) problems.push({ field: 'photoAlt', count: missing });
  return problems;
}

export const wordsIn = (html: string) => countWords(html);

/** The facts the editor and the queue show under a text: "412 words · about 6 min read". */
export const textFacts = (html: string) => {
  const words = countWords(html);
  return { words, minutes: readMinutes(words) };
};
