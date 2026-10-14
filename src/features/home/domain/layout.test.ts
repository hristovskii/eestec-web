import { describe, expect, it } from 'vitest';

import { HOME_SECTION_KEYS } from '../types';
import { DEFAULT_LAYOUT, normalizeLayout, visibleSections } from './layout';

describe('Home layout', () => {
  it('starts with every section visible, in the order of the design', () => {
    expect(visibleSections(DEFAULT_LAYOUT)).toEqual([...HOME_SECTION_KEYS]);
  });

  it('keeps the order and hides sections that are off', () => {
    const layout = [
      { key: 'map', visible: true },
      { key: 'about', visible: false },
      { key: 'numbers', visible: true },
    ] as const;
    expect(visibleSections(layout)).toEqual(['map', 'numbers', 'tradition', 'meeting', 'latest', 'journey']);
  });

  it('lists every section exactly once', () => {
    const normalized = normalizeLayout([
      { key: 'map', visible: true },
      { key: 'map', visible: false },
    ]);
    expect(normalized.map((item) => item.key).sort()).toEqual([...HOME_SECTION_KEYS].sort());
    expect(normalized[0]).toEqual({ key: 'map', visible: true });
  });
});
