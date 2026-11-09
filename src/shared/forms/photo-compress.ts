/** What a person can pick: compressed in the browser first (below). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
/** Longest side after compression. */
export const PHOTO_MAX_SIDE = 2000;

// Photos are made smaller in the browser before they are sent (the Memory editor and /submit say "Large photos are
// compressed automatically"): at most 2000 px on the long side, as a JPEG, so a photo is a few
// hundred KB and a Server Action never meets its size limit. Runs in the browser only.

export type PreparedPhoto = { blob: Blob; width: number; height: number; name: string };

export type PhotoProblem = 'type' | 'big' | 'unreadable';

/** The problem with a picked file before it is read, or null. */
export function photoProblem(file: File): PhotoProblem | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > PHOTO_MAX_BYTES) return 'big';
  return null;
}

export type PrepareOptions = {
  /** Longest side after compression (default 2000 px). */
  maxSide?: number;
  /** Make the JPEG at most this big: lower quality first, then fewer pixels. Without it: one pass at 0.85. */
  maxBytes?: number;
};

/** JPEG qualities tried in turn when the result has to fit `maxBytes`. */
const QUALITIES = [0.85, 0.7, 0.55, 0.4];
/** Below this side a photo is no longer a photo: give up instead of shrinking further. */
const MIN_SIDE = 640;

export async function preparePhoto(file: File, options: PrepareOptions = {}): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('unreadable');
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  try {
    let side = Math.min(options.maxSide ?? PHOTO_MAX_SIDE, Math.max(bitmap.width, bitmap.height));
    for (;;) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('unreadable');
      // A PNG with transparency would turn black as a JPEG: paint white first.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of options.maxBytes === undefined ? [0.85] : QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', quality),
        );
        if (!blob) throw new Error('unreadable');
        if (options.maxBytes === undefined || blob.size <= options.maxBytes)
          return { blob, width, height, name };
      }
      side = Math.round(side * 0.8);
      if (side < MIN_SIDE) throw new Error('big');
    }
  } finally {
    bitmap.close();
  }
}
