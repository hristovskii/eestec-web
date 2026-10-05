// Page addresses ("ai-at-the-edge"). Macedonian titles are transliterated, so a Cyrillic title
// still gets a readable Latin address.

const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  ѓ: 'gj',
  е: 'e',
  ж: 'zh',
  з: 'z',
  ѕ: 'dz',
  и: 'i',
  ј: 'j',
  к: 'k',
  л: 'l',
  љ: 'lj',
  м: 'm',
  н: 'n',
  њ: 'nj',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  ќ: 'kj',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  џ: 'dj',
  ш: 'sh',
  // Serbian / Bulgarian / Russian letters that turn up in names
  ђ: 'dj',
  ћ: 'c',
  й: 'j',
  щ: 'sht',
  ъ: 'a',
  ь: '',
  ю: 'yu',
  я: 'ya',
  ё: 'e',
  ы: 'y',
  э: 'e',
};

export const SLUG_MAX = 80;

/** Lowercase Latin letters, digits and single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text: string): string {
  return [...text.toLowerCase()]
    .map((char) => CYRILLIC[char] ?? char)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');
}

/** `base`, or `base-2`, `base-3`… when taken. */
export function uniqueSlug(base: string, taken: (slug: string) => boolean): string {
  if (!taken(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base.slice(0, SLUG_MAX - String(n).length - 1)}-${n}`;
    if (!taken(candidate)) return candidate;
  }
}
