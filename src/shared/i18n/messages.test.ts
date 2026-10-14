import { describe, expect, it } from 'vitest';

import en from './messages/en.json';
import mk from './messages/mk.json';

// Both languages say the same thing with the same placeholders, and the Macedonian text follows a
// few typographic rules. Wording and tone stay with a native reviewer (docs/i18n-review.md).

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) => {
      if (prefix === '' && key === '_meta') return [];
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === 'string' ? [[path, value]] : Object.entries(flatten(value, path));
    }),
  );
}

const english = flatten(en);
const macedonian = flatten(mk);

/**
 * Arguments of an ICU message: `{name}`, and the argument of `{count, plural, …}` / `{scope, select, …}`
 * together with the arguments inside their branches (but not the words that label a branch).
 */
function argumentsOf(text: string): string[] {
  const found = new Set<string>();
  const readMessage = (from: number, until: (char: string) => boolean): number => {
    let index = from;
    while (index < text.length && !until(text[index] ?? '')) {
      if (text[index] === '{') index = readArgument(index + 1);
      else index += 1;
    }
    return index;
  };
  /** `from` is just after an opening brace; returns the index after its closing brace. */
  const readArgument = (from: number): number => {
    const head = /^\s*(\w+)\s*([,}])/.exec(text.slice(from));
    if (!head) return from;
    found.add(head[1] ?? '');
    let index = from + head[0].length;
    if (head[2] === '}') return index;
    // `, plural, one {…} other {…}` or `, select, …`: skip the type, then read each branch.
    index = text.indexOf(',', index) + 1;
    while (index > 0 && index < text.length && text[index] !== '}') {
      const open = text.indexOf('{', index);
      const close = text.indexOf('}', index);
      if (open === -1 || (close !== -1 && close < open)) break;
      index = readMessage(open + 1, (char) => char === '}') + 1;
    }
    return text[index] === '}' ? index + 1 : index;
  };
  readMessage(0, () => false);
  return [...found].sort();
}
const tagsOf = (text: string) => [...new Set([...text.matchAll(/<(\w+)>/g)].map((match) => match[1]))].sort();

describe('messages', () => {
  it('use the same placeholders and rich-text tags in both languages', () => {
    const different = Object.keys(macedonian).filter(
      (key) =>
        JSON.stringify(argumentsOf(macedonian[key] ?? '')) !==
          JSON.stringify(argumentsOf(english[key] ?? '')) ||
        JSON.stringify(tagsOf(macedonian[key] ?? '')) !== JSON.stringify(tagsOf(english[key] ?? '')),
    );
    expect(different).toEqual([]);
  });

  it('Macedonian text has no three dots, doubled or trailing spaces, or straight double quotes', () => {
    const bad = Object.entries(macedonian)
      .filter(
        ([, text]) =>
          /\.\.\.|\s{2,}|^\s|\s$/.test(text) || /(^|[\s(])"[^"]*"/.test(text.replace(/<[^>]*>/g, '')),
      )
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it('Macedonian words are not written in two alphabets at once', () => {
    const bad = Object.entries(macedonian)
      .filter(([, text]) =>
        // Plain words only: not tags, placeholders or the addresses and names that stay Latin.
        text
          .replace(/<[^>]*>|\{[^}]*\}/g, ' ')
          .split(/[\s/]+/)
          // "EESTEC-овец", "PDF-датотека": a Latin name or acronym, a hyphen, Cyrillic: fine.
          .some((word) =>
            word.split('-').some((part) => /[\u0400-\u04FF]/.test(part) && /[A-Za-z]/.test(part)),
          ),
      )
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it('the weekly meeting is called a "средба" everywhere', () => {
    expect(Object.entries(macedonian).filter(([, text]) => /состанок/i.test(text))).toEqual([]);
  });
});
