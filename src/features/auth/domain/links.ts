import { localizedPath } from '@/shared/seo/alternates';

import type { TokenKind } from '../types';

/**
 * Where the button of an e-mail goes. A new e-mail address is confirmed with the same route as the sign-up e-mail;
 * `type` tells them apart. The reset page is a page of the site, so it has a language.
 */
export function linkFor(kind: TokenKind, token: string, locale: 'mk' | 'en'): string {
  if (kind === 'confirm') return `/auth/confirm?token=${token}`;
  if (kind === 'email_change') return `/auth/confirm?token=${token}&type=email&lang=${locale}`;
  return `${localizedPath('/reset-password', locale)}?token=${token}`;
}
