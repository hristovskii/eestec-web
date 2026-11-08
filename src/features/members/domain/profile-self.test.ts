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

describe('profile photo', () => {
  it('takes a JPG or PNG up to 8 MB', async () => {
    const { photoPickProblem } = await import('./profile-self');
    expect(photoPickProblem({ type: 'image/png', size: 8_000_000 })).toBeNull();
    expect(photoPickProblem({ type: 'image/jpeg', size: 100 })).toBeNull();
    expect(photoPickProblem({ type: 'image/gif', size: 100 })).toBe('photoType');
    expect(photoPickProblem({ type: 'application/pdf', size: 100 })).toBe('photoType');
    expect(photoPickProblem({ type: 'image/png', size: 8_000_001 })).toBe('photoSize');
  });

  it('knows a JPEG by its first bytes', async () => {
    const { isJpeg } = await import('./profile-self');
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new Uint8Array([]))).toBe(false);
  });
});
