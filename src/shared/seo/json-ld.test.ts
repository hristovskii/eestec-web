import { describe, expect, it } from 'vitest';

import { absoluteUrl, compact, serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('cannot be closed early by board text', () => {
    const text = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({ name: '</script><script>alert(1)</script>' });
  });

  it('escapes the line separators', () => {
    expect(serializeJsonLd({ name: 'a\u2028b\u2029c' })).not.toMatch(/[\u2028\u2029]/);
  });
});

describe('compact', () => {
  it('drops empty strings, nulls, undefined and empty lists, and keeps zero and false', () => {
    expect(compact({ a: '', b: null, c: undefined, d: [], e: 0, f: false, g: 'x' })).toEqual({
      e: 0,
      f: false,
      g: 'x',
    });
  });
});

describe('absoluteUrl', () => {
  it('prefixes site paths with the origin and leaves full addresses alone', () => {
    expect(absoluteUrl('https://eestec.mk', '/brand/logo.png')).toBe('https://eestec.mk/brand/logo.png');
    expect(absoluteUrl('https://eestec.mk', 'https://cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg');
  });
});
