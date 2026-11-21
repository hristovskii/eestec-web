import { readFileSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { generateSeed, seedId } from './generate-seed';

describe('database seed', () => {
  it('uses stable namespaced IDs', () => {
    expect(seedId('events', 'example')).toBe(seedId('events', 'example'));
    expect(seedId('events', 'example')).not.toBe(seedId('media', 'example'));
  });

  it('matches the fixture-generated SQL', () => {
    const output = generateSeed();
    if (process.env.UPDATE_SEED === '1') writeFileSync('supabase/seed.sql', output);
    expect(readFileSync('supabase/seed.sql', 'utf8')).toBe(output);
  });
});
