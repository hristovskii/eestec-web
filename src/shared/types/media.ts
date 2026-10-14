import type { Localized } from './localized';

/** An uploaded image. `alt` is required by type: decorative images pass alt="" explicitly. */
export type Media = {
  src: string;
  width: number;
  height: number;
  alt: string;
  credit?: string;
};

/**
 * SAMPLE DATA placeholder for fixtures: the canvas shows striped boxes labelled
 * "Photo: …" instead of real photos. Never produced by real uploads.
 */
export type SampleMedia = {
  sample: true;
  /** The canvas caption, e.g. "participants in a group exercise". */
  caption: string;
  alt: string;
  credit?: string;
};

export type AnyMedia = Media | SampleMedia;

export const isSampleMedia = (media: AnyMedia): media is SampleMedia => 'sample' in media;

/**
 * A library file used somewhere on a page, with the alt text of that use (board content, so it has
 * both languages; Macedonian is required). Resolved to an `AnyMedia` by `media.resolveMediaRef`.
 */
export type MediaRef = { mediaId: string; alt: Localized };
