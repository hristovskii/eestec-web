import { PHOTO_MAX_BYTES, PHOTO_MAX_SIDE, PHOTO_TYPES } from '../../domain/memory-fields';

// Photos are made smaller in the browser before they are sent (the editor says "Large photos are
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

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('unreadable');
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
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
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('unreadable');
  return { blob, width, height, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
}
