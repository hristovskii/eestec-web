import type { useTranslations } from 'next-intl';

type Translate = ReturnType<typeof useTranslations<'admin.media'>>;

/** Actions return message keys (admin.media.errors.*); unknown keys fall back to a generic text. */
export function errorText(t: Translate, key: string | undefined): string {
  const known = [
    'type',
    'size',
    'empty',
    'altRequired',
    'altTooLong',
    'creditTooLong',
    'forbidden',
    'not_found',
  ];
  return t(`errors.${known.includes(key ?? '') ? key : 'unexpected'}` as Parameters<Translate>[0]);
}
