import { describe, expect, it } from 'vitest';

import { formatBytes, kindOf, needsAlt, uploadProblem } from './upload-rules';

describe('upload rules', () => {
  it('accepts images and PDFs only', () => {
    expect(kindOf('image/png')).toBe('image');
    expect(kindOf('image/svg+xml')).toBe('image');
    expect(kindOf('application/pdf')).toBe('document');
    expect(kindOf('text/html')).toBeNull();
    expect(uploadProblem({ type: 'application/zip', size: 10 })).toBe('type');
  });

  it('limits images to 5 MB and documents to 10 MB', () => {
    expect(uploadProblem({ type: 'image/jpeg', size: 5_000_000 })).toBeNull();
    expect(uploadProblem({ type: 'image/jpeg', size: 5_000_001 })).toBe('size');
    expect(uploadProblem({ type: 'application/pdf', size: 9_000_000 })).toBeNull();
    expect(uploadProblem({ type: 'image/png', size: 0 })).toBe('empty');
  });

  it('flags images without alt text; decorative ("") and documents are fine', () => {
    expect(needsAlt({ kind: 'image', alt: null })).toBe(true);
    expect(needsAlt({ kind: 'image', alt: '' })).toBe(false);
    expect(needsAlt({ kind: 'document', alt: null })).toBe(false);
  });

  it('formats sizes', () => {
    expect(formatBytes(240_000)).toBe('240 KB');
    expect(formatBytes(1_400_000)).toBe('1.4 MB');
  });
});
