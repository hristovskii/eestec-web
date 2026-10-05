import { finishMediaUpload, startMediaUpload } from '../../actions/media';
import { kindOf, uploadProblem } from '../../domain/upload-rules';
import type { MediaItem } from '../../types';

export type UploadFileResult = { ok: true; item: MediaItem } | { ok: false; error: string };

/** Natural size of an image file (0 for SVGs without a size: left out). */
function dimensions(file: File) {
  return new Promise<{ width?: number; height?: number }>((resolve) => {
    if (kindOf(file.type) !== 'image') return resolve({});
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image.naturalWidth ? { width: image.naturalWidth, height: image.naturalHeight } : {});
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    image.src = url;
  });
}

/** PUT with upload progress (fetch can't report it). */
function put(url: string, file: File, onProgress: (percent: number) => void, signal?: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}

/**
 * One file into the Media library outside the upload dialog (event galleries, covers, PDFs):
 * reserve → PUT the bytes (with progress) → confirm. Errors are admin.media.errors keys.
 */
export async function uploadMediaFile(
  file: File,
  {
    alt,
    altLater = false,
    onProgress = () => undefined,
    signal,
  }: { alt?: string; altLater?: boolean; onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<UploadFileResult> {
  const problem = uploadProblem(file);
  if (problem) return { ok: false, error: problem };
  const size = await dimensions(file);
  const start = await startMediaUpload({ fileName: file.name, mimeType: file.type, size: file.size });
  if (!start.ok)
    return {
      ok: false,
      error:
        start.error === 'validation'
          ? (Object.values(start.fieldErrors)[0]?.[0] ?? 'unexpected')
          : start.error,
    };
  if (!(await put(start.data.uploadUrl, file, onProgress, signal)))
    return { ok: false, error: signal?.aborted ? 'cancelled' : 'unexpected' };
  const finish = await finishMediaUpload({ uploadId: start.data.uploadId, alt, altLater, ...size });
  if (!finish.ok)
    return {
      ok: false,
      error: finish.error === 'validation' ? (finish.fieldErrors.alt?.[0] ?? 'unexpected') : finish.error,
    };
  return { ok: true, item: finish.data };
}
