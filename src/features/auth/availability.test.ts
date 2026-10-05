import { describe, expect, it } from 'vitest';

import { isMockSignInBlocked } from './availability';

describe('isMockSignInBlocked', () => {
  it.each([
    { vercelEnv: 'production', blocked: true },
    { vercelEnv: 'preview', blocked: false },
    { vercelEnv: 'development', blocked: false },
    { vercelEnv: undefined, blocked: false },
  ])('mock data on VERCEL_ENV=$vercelEnv → blocked: $blocked', ({ vercelEnv, blocked }) => {
    expect(isMockSignInBlocked({ dataSource: 'mock', vercelEnv })).toBe(blocked);
  });
});
