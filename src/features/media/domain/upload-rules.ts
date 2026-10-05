import type { MediaKind } from '../types';

// Upload rules: what the Media library accepts. The same rules run in the browser (instant
// feedback) and on the server (the real check).

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] as const;
export const DOCUMENT_TYPES = ['application/pdf'] as const;
export const ACCEPTED_TYPES: readonly string[] = [...IMAGE_TYPES, ...DOCUMENT_TYPES];

/** Photos are compressed in the browser in the backend phase; until then keep uploads small. */
export const MAX_BYTES: Record<MediaKind, number> = { image: 5_000_000, document: 10_000_000 };

export const kindOf = (mimeType: string): MediaKind | null =>
  (IMAGE_TYPES as readonly string[]).includes(mimeType)
    ? 'image'
    : (DOCUMENT_TYPES as readonly string[]).includes(mimeType)
      ? 'document'
      : null;

export type UploadProblem = 'type' | 'size' | 'empty';

/** Why a file can't be uploaded, or null when it can. */
export function uploadProblem(file: { type: string; size: number }): UploadProblem | null {
  const kind = kindOf(file.type);
  if (!kind) return 'type';
  if (file.size === 0) return 'empty';
  if (file.size > MAX_BYTES[kind]) return 'size';
  return null;
}

/** Images need alt text before they can be used; '' means decorative. Documents have none. */
export const needsAlt = (item: { kind: MediaKind; alt: string | null }) =>
  item.kind === 'image' && item.alt === null;

/** "240 KB", "1.4 MB". */
export const formatBytes = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
