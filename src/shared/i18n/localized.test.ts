import { describe, expect, it } from 'vitest';

import { resolveLocalized, resolveText } from './localized';

describe('resolveLocalized', () => {
  it('returns Macedonian on MK pages', () => {
    expect(resolveLocalized({ mk: 'Настани', en: 'Events' }, 'mk')).toBe('Настани');
  });

  it('returns English on EN pages when it exists', () => {
    expect(resolveLocalized({ mk: 'Настани', en: 'Events' }, 'en')).toBe('Events');
  });

  it('falls back to Macedonian when English is missing or empty', () => {
    expect(resolveLocalized({ mk: 'Настани' }, 'en')).toBe('Настани');
    expect(resolveLocalized({ mk: 'Настани', en: '' }, 'en')).toBe('Настани');
  });
});

describe('resolveText', () => {
  it('reports the language actually used', () => {
    expect(resolveText({ mk: 'Настани' }, 'en')).toEqual({ text: 'Настани', lang: 'mk' });
    expect(resolveText({ mk: 'Настани', en: 'Events' }, 'en')).toEqual({ text: 'Events', lang: 'en' });
  });
});
