import type { Paged } from '@/shared/data/paged';

import type { MediaCounts, MediaItem, MediaListQuery, MediaUploader } from '../types';

export type CreateUploadInput = {
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: MediaUploader;
};

export type ConfirmUploadInput = {
  uploadId: string;
  /** The uploader confirming; must be the one who created the upload. */
  userId: string;
  /** Images: required text, or '' for decorative. Documents: null. */
  alt: string | null;
  credit?: string;
  width?: number;
  height?: number;
  now: Date;
};

/**
 * The Media library. Uploads take two steps so files never pass through a Server Action
 * (body limits): createUpload returns a URL the browser PUTs the file to (a dev route on mocks,
 * a signed Storage URL on Supabase), then confirmUpload records it with its alt text.
 */
export interface MediaRepository {
  list(query: MediaListQuery): Promise<Paged<MediaItem> & { counts: MediaCounts }>;
  get(id: string): Promise<MediaItem | null>;
  createUpload(input: CreateUploadInput): Promise<{ uploadId: string; uploadUrl: string }>;
  /** A reserved upload of `userId` (to check the file type before confirming), or null. */
  getUpload(uploadId: string, userId: string): Promise<{ mimeType: string; received: boolean } | null>;
  /** null when the upload is unknown, belongs to someone else, or the file never arrived. */
  confirmUpload(input: ConfirmUploadInput): Promise<MediaItem | null>;
  update(id: string, patch: { alt?: string | null; credit?: string }): Promise<MediaItem | null>;
  remove(id: string): Promise<boolean>;
}
