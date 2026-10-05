import type { Locale } from '@/shared/i18n/routing';

/**
 * Board-editable text in both languages (D8): Macedonian is required, English optional.
 * Write models (admin) carry Localized values; read models are already resolved to strings.
 */
export type Localized<T = string> = { mk: T; en?: T };

/** Resolved text plus the language it is actually in (EN pages fall back to MK per field). */
export type ResolvedText = { text: string; lang: Locale };
