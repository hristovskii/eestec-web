import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

describe('data source environment', () => {
  it('defaults to mocks without Supabase credentials', () => {
    expect(parseEnv({}).DATA_SOURCE).toBe('mock');
  });

  it('requires server credentials only when Supabase is selected', () => {
    expect(() => parseEnv({ DATA_SOURCE: 'supabase' })).toThrow();
    expect(
      parseEnv({
        DATA_SOURCE: 'supabase',
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_ANON_KEY: 'anon',
        SUPABASE_SERVICE_ROLE_KEY: 'secret',
      }).DATA_SOURCE,
    ).toBe('supabase');
  });
});
