import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The visible M20 checklist: every repository registered with `selectImplementation` and whether it has
 * a "supabase" implementation. `PENDING` is what is still missing; implementing a repository means
 * removing it here (the test fails both ways), so the list only shrinks.
 */
const PENDING = ['auth', 'idea-form', 'submissions', 'memories'];

function registrations() {
  const files = [
    ...readdirSync('src/features').map((feature) => join('src/features', feature, 'data/index.ts')),
    ...readdirSync('src/shared/data', { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join('src/shared/data', entry.name, 'index.ts')),
  ];
  const found: { name: string; supabase: boolean }[] = [];
  for (const file of files) {
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const parts = source.split(/selectImplementation</).slice(1);
    for (const part of parts) {
      const name = /^[^(]*\(\s*'([\w-]+)'/.exec(part)?.[1];
      if (name) found.push({ name, supabase: /\bsupabase\s*[:(]/.test(part.split(/\n\n/)[0] ?? part) });
    }
  }
  return found;
}

describe('Supabase repository coverage (M20 checklist)', () => {
  it('finds the registered repositories', () => {
    expect(registrations().length).toBeGreaterThanOrEqual(24);
  });

  it('lists exactly the repositories that have no Supabase implementation yet', () => {
    const missing = registrations()
      .filter((entry) => !entry.supabase)
      .map((entry) => entry.name)
      .sort();
    expect(missing).toEqual([...PENDING].sort());
  });
});
