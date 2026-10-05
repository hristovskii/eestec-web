export type MediaKind = 'image' | 'document';

/** Who uploaded a file (event managers see and change only their own, D18). */
export type MediaUploader = { userId: string; name: string };

/** One file in the Media library. */
export type MediaItem = {
  id: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  /** Bytes. */
  size: number;
  /** Images only. */
  width?: number;
  height?: number;
  /**
   * Images only. Required before an image is used (decided rule): `null` = still missing
   * (e.g. Memory photos sent by members), `''` = marked as decorative.
   */
  alt: string | null;
  credit?: string;
  /** Where the file is served. `null` for SAMPLE placeholder photos (the canvas shows striped boxes). */
  src: string | null;
  /** SAMPLE DATA: the canvas caption shown on the placeholder. */
  sampleCaption?: string;
  uploadedBy: MediaUploader;
  uploadedAt: string;
};

export type MediaListQuery = {
  kind?: MediaKind;
  q?: string;
  missingAlt?: boolean;
  /** Only this uploader's files (event managers, or "Uploaded by me"). */
  uploadedBy?: string;
  sort: 'newest' | 'oldest' | 'name';
  page: number;
  pageSize: number;
};

export type MediaCounts = { all: number; image: number; document: number; missingAlt: number };
