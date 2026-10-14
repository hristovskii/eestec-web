import { HOME_SECTION_KEYS, type HomeSectionKey, type HomeSectionSetting } from '../types';

/** The order of the design (Home-Desktop), everything visible. */
export const DEFAULT_LAYOUT: readonly HomeSectionSetting[] = HOME_SECTION_KEYS.map((key) => ({
  key,
  visible: true,
}));

/** Every section exactly once: unknown or repeated keys are dropped, missing ones are added at the end, visible. */
export function normalizeLayout(layout: readonly HomeSectionSetting[]): HomeSectionSetting[] {
  const seen = new Set<HomeSectionKey>();
  const kept = layout.filter((item) => {
    if (!HOME_SECTION_KEYS.includes(item.key) || seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
  const missing = HOME_SECTION_KEYS.filter((key) => !seen.has(key)).map((key) => ({ key, visible: true }));
  return [...kept, ...missing];
}

/** The sections the page shows, in order. The route maps each key to a section. */
export const visibleSections = (layout: readonly HomeSectionSetting[]): HomeSectionKey[] =>
  normalizeLayout(layout)
    .filter((item) => item.visible)
    .map((item) => item.key);
