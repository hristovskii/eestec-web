import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('keeps a custom font size and a text colour together', () => {
    expect(cn('text-body text-white')).toBe('text-body text-white');
    expect(cn('text-small', 'text-brand-dark')).toBe('text-small text-brand-dark');
  });

  it('still resolves real conflicts', () => {
    expect(cn('text-ink', 'text-white')).toBe('text-white');
    expect(cn('text-body', 'text-small')).toBe('text-small');
    expect(cn('shadow-card', 'shadow-menu')).toBe('shadow-menu');
  });
});
