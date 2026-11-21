import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/env', () => ({ env: { DATA_SOURCE: 'supabase' } }));

import { selectImplementation } from './select-implementation';

describe('unimplemented Supabase repositories', () => {
  it('fails explicitly instead of silently falling back to mock data', async () => {
    await expect(selectImplementation('example', { mock: () => ({}) })).rejects.toThrow(
      'example has no "supabase" implementation',
    );
  });
});
