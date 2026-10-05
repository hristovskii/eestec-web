import sanitize from 'sanitize-html';

import { isEmptyRichText } from './rich-text';

// Rich text from the admin editor (and later from members' Memories) is cleaned on every save and
// again before it's shown (docs/ARCHITECTURE.md §9 risks). Only what the editor can produce
// survives: headings 2–3, paragraphs, bold, italic, links, lists, quotes and images.

const OPTIONS: sanitize.IOptions = {
  allowedTags: ['p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'br', 'img'],
  allowedAttributes: { a: ['href', 'rel'], img: ['src', 'alt', 'width', 'height'] },
  allowedSchemes: ['https', 'http', 'mailto'],
  // Images: https, or same-site paths (Media library files).
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }),
    b: 'strong',
    i: 'em',
    h1: 'h2',
    h4: 'h3',
    h5: 'h3',
    h6: 'h3',
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.alt?.trim(),
};

/** Clean editor HTML. Empty documents ("<p></p>") become "". */
export function sanitizeRichText(html: string): string {
  const clean = sanitize(html, OPTIONS).trim();
  return isEmptyRichText(clean) ? '' : clean;
}
