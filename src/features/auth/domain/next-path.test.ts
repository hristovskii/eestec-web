import { describe, expect, it } from 'vitest';

import { safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it('keeps a path on this site, with its query', () => {
    expect(safeNextPath('/events')).toBe('/events');
    expect(safeNextPath('/en/upcoming/ai-at-the-edge?x=1')).toBe('/en/upcoming/ai-at-the-edge?x=1');
    expect(safeNextPath(['/journey', '/other'])).toBe('/journey');
  });

  it('sends everything else to the home page', () => {
    for (const value of [
      undefined,
      '',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'events',
      '/a\nb',
    ])
      expect(safeNextPath(value)).toBe('/');
  });

  it('does not loop back to an auth page', () => {
    for (const value of [
      '/login',
      '/en/login?x=1',
      '/register',
      '/forgot-password',
      '/reset-password?token=a',
      '/auth/confirm',
    ])
      expect(safeNextPath(value)).toBe('/');
  });
});
