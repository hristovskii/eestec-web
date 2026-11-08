import { describe, expect, it } from 'vitest';

import { isReservedUsername, isValidUsername, normalizeUsername, socialUrlProblem } from './profile-self';

describe('profile address', () => {
  it('accepts lower-case letters, digits and hyphens inside, 3 to 30 characters', () => {
    for (const ok of ['ana', 'marija-stojanovska', 'a1b', 'x'.repeat(30), 'ana-2']) {
      expect(isValidUsername(ok), ok).toBe(true);
    }
  });

  it('refuses everything else', () => {
    for (const bad of [
      '',
      'ab',
      'x'.repeat(31),
      '-ana',
      'ana-',
      'ana--b',
      'Ana',
      'ana b',
      'ana_b',
      'ана',
      'ana.b',
      'ana/b',
    ]) {
      expect(isValidUsername(bad), bad).toBe(false);
    }
  });

  it('makes what was typed lower case without spaces around it', () => {
    expect(normalizeUsername('  Marija-S ')).toBe('marija-s');
  });

  it('keeps words that are pages or official out', () => {
    expect(isReservedUsername('admin')).toBe(true);
    expect(isReservedUsername('__none__')).toBe(true);
    expect(isReservedUsername('ana')).toBe(false);
  });
});

describe('social links', () => {
  it('lets an empty link through (they are optional)', () => {
    expect(socialUrlProblem('', 'github')).toBeNull();
    expect(socialUrlProblem('   ', 'linkedin')).toBeNull();
  });

  it('wants an https address on the right site', () => {
    expect(socialUrlProblem('https://github.com/marijas', 'github')).toBeNull();
    expect(socialUrlProblem('https://www.linkedin.com/in/marija', 'linkedin')).toBeNull();
    expect(socialUrlProblem('https://mk.linkedin.com/in/marija', 'linkedin')).toBeNull();
    expect(socialUrlProblem('http://github.com/marijas', 'github')).toBe('urlInvalid');
    expect(socialUrlProblem('github.com/marijas', 'github')).toBe('urlInvalid');
    expect(socialUrlProblem('https://gitlab.com/marijas', 'github')).toBe('urlHost');
    expect(socialUrlProblem('https://evilgithub.com/x', 'github')).toBe('urlHost');
    expect(socialUrlProblem('https://github.com.evil.io/x', 'github')).toBe('urlHost');
  });
});
