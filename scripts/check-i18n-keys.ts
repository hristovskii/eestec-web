// Fails when mk.json and en.json don't have exactly the same keys (docs/ARCHITECTURE.md §6).
// `_meta` holds the file's review status and is ignored.
import { readFileSync } from 'node:fs';

type Tree = { [key: string]: string | Tree };

const load = (locale: string): Tree =>
  JSON.parse(
    readFileSync(new URL(`../src/shared/i18n/messages/${locale}.json`, import.meta.url), 'utf8'),
  ) as Tree;

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    if (prefix === '' && key === '_meta') return [];
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : keys(value, path);
  });
}

const en = new Set(keys(load('en')));
const mk = new Set(keys(load('mk')));
const missingInMk = [...en].filter((key) => !mk.has(key));
const extraInMk = [...mk].filter((key) => !en.has(key));

if (missingInMk.length || extraInMk.length) {
  if (missingInMk.length) console.error(`Missing in mk.json:\n  ${missingInMk.join('\n  ')}`);
  if (extraInMk.length) console.error(`Not in en.json:\n  ${extraInMk.join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n keys match (${en.size} keys).`);
