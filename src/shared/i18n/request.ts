import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { locale as rootLocale } from 'next/root-params';

import { routing } from './routing';

export const TIME_ZONE = 'Europe/Skopje';

export default getRequestConfig(async ({ locale: override }) => {
  const segment = override ?? (await rootLocale());

  // No [locale] root param → an admin route. The admin UI is English-only (D13).
  if (segment === undefined) {
    const [common, admin] = await Promise.all([
      import('./messages/en.json').then((m) => m.default),
      import('./messages/admin.en.json').then((m) => m.default),
    ]);
    return { locale: 'en', timeZone: TIME_ZONE, messages: { ...common, admin } };
  }

  const locale = hasLocale(routing.locales, segment) ? segment : routing.defaultLocale;
  const messages = (await import(`./messages/${locale}.json`)) as { default: Record<string, unknown> };
  return { locale, timeZone: TIME_ZONE, messages: messages.default };
});
