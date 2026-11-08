// The CV a member shares with partner companies (decided: PDF only, up to 5 MB, off by default,
// deleted the moment sharing is turned off). Rules without zod, shared by the form and the server.

export const CV = { type: 'application/pdf', maxBytes: 5_000_000, nameMax: 120 } as const;

/** A problem key for a file the person picked, or null. */
export function cvPickProblem(file: { size: number; type: string }): 'cvType' | 'cvSize' | null {
  if (file.type !== CV.type) return 'cvType';
  return file.size > CV.maxBytes || file.size === 0 ? 'cvSize' : null;
}

/** The first bytes of a PDF ("%PDF-"): the server does not trust the type the browser names. */
export const isPdf = (bytes: Uint8Array) =>
  bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-';

/** The name shown to the member: no folders, no control characters, not too long, ends in .pdf. */
export function cleanFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const withExtension = /\.pdf$/i.test(base) ? base : `${base || 'CV'}.pdf`;
  if (withExtension.length <= CV.nameMax) return withExtension;
  return `${withExtension.slice(0, CV.nameMax - 4)}.pdf`;
}

/** "240 KB", "1.2 MB" (decimal, like the file dialogs of the sample frames). */
export const formatFileSize = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
