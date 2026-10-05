import type { Localized, ResolvedText } from '@/shared/types/localized';

import type { Locale } from './routing';

/** Picks the requested language, falling back to Macedonian when there is no English text. */
export function resolveLocalized<T>(value: Localized<T>, locale: Locale): T {
  if (locale === 'en' && value.en !== undefined && value.en !== '') return value.en;
  return value.mk;
}

/** Like resolveLocalized, but also says which language the text is in (render fallbacks with lang="mk"). */
export function resolveText(value: Localized, locale: Locale): ResolvedText {
  const hasEnglish = value.en !== undefined && value.en.trim() !== '';
  return locale === 'en' && hasEnglish ? { text: value.en!, lang: 'en' } : { text: value.mk, lang: 'mk' };
}
