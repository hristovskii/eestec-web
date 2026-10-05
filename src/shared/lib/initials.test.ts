import { describe, expect, it } from 'vitest';

import { initials } from './initials';

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Ana Trajkovska')).toBe('AT');
    expect(initials('  petar   kolev ')).toBe('PK');
    expect(initials('Marija Ana Stojanovska')).toBe('MS');
  });
  it('handles one word and empty names', () => {
    expect(initials('Ivana')).toBe('IV');
    expect(initials('')).toBe('?');
  });
});
