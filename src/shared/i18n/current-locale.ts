import 'server-only';

import { locale as rootLocale } from 'next/root-params';
import { hasLocale } from 'next-intl';

import { type Locale, routing } from './routing';

/** The locale of the current public page (root param), falling back to the default (MK). */
export async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}
