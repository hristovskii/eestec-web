import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // The Supabase contract suites need the local stack: `pnpm test:supabase` runs them.
    exclude: ['**/node_modules/**', '**/*.supabase.test.ts', 'tests/supabase/**'],
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
  },
});
