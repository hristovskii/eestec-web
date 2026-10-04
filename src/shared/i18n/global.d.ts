import type { routing } from './routing';
import type messages from './messages/en.json';
import type adminMessages from './messages/admin.en.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages & { admin: typeof adminMessages };
  }
}
