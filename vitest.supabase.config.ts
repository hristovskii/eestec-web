import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Contract suites against the local Supabase stack (`pnpm test:supabase`). They commit real rows through
// PostgREST, so files run one after another; every suite creates what it changes (unique slugs, e-mails).
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.supabase.test.ts', 'tests/supabase/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./tests/supabase/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    restoreMocks: true,
  },
});
