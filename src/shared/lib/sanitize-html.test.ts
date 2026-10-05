import { describe, expect, it } from 'vitest';

import { countWords, isEmptyRichText } from './rich-text';
import { sanitizeRichText } from './sanitize-html';

describe('sanitizeRichText', () => {
  it('keeps what the editor makes', () => {
    const html =
      '<h3>About</h3><p>Small <strong>models</strong> and <em>boards</em>. Read the <a href="https://eestec.mk/x">programme</a>.</p><ul><li><p>Labs</p></li></ul><blockquote><p>Quote</p></blockquote>';
    expect(sanitizeRichText(html)).toBe(
      html.replace(
        '<a href="https://eestec.mk/x">',
        '<a href="https://eestec.mk/x" rel="noopener noreferrer">',
      ),
    );
  });

  it('removes scripts, handlers, styles and unsafe links', () => {
    expect(sanitizeRichText('<p onclick="x()" style="color:red">Hi<script>alert(1)</script></p>')).toBe(
      '<p>Hi</p>',
    );
    expect(sanitizeRichText('<p><a href="javascript:alert(1)">x</a></p>')).toBe(
      '<p><a rel="noopener noreferrer">x</a></p>',
    );
    expect(sanitizeRichText('<iframe src="https://evil"></iframe><p>ok</p>')).toBe('<p>ok</p>');
  });

  it('drops images without alt text and non-https images', () => {
    expect(sanitizeRichText('<img src="https://eestec.mk/a.jpg"><p>x</p>')).toBe('<p>x</p>');
    expect(sanitizeRichText('<img src="data:image/png;base64,AAA" alt="x">')).toBe('<img alt="x" />');
    expect(sanitizeRichText('<img src="https://eestec.mk/a.jpg" alt="Lab">')).toBe(
      '<img src="https://eestec.mk/a.jpg" alt="Lab" />',
    );
  });

  it('maps other headings and tags to the allowed ones', () => {
    expect(sanitizeRichText('<h1>T</h1><b>B</b><i>I</i>')).toBe('<h2>T</h2><strong>B</strong><em>I</em>');
  });

  it('turns an empty document into an empty string', () => {
    expect(sanitizeRichText('<p></p>')).toBe('');
    expect(isEmptyRichText('<p> &nbsp; </p>')).toBe(true);
  });
});

describe('countWords', () => {
  it('counts words across blocks', () => {
    expect(countWords('<h3>About the workshop</h3><p>Most AI runs</p><ul><li><p>Labs</p></li></ul>')).toBe(7);
    expect(countWords('')).toBe(0);
  });
});
