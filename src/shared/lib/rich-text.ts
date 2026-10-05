// Small helpers for editor HTML that the browser can use too (no sanitizer in the bundle).

/** True when the HTML has no text and no images. */
export function isEmptyRichText(html: string): boolean {
  return !/<img\b/i.test(html) && html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '') === '';
}

/** Words in rich text ("96 words" under the editor). */
export function countWords(html: string): number {
  const text = html
    .replace(/<\/(p|h2|h3|li|blockquote)>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}
