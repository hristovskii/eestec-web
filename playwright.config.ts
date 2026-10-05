import { defineConfig, devices } from '@playwright/test';

import { PORT, PRODUCTION_PORT } from './e2e/support/servers';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Servers start one after the other, so the second reuses the first one's build.
  webServer: [
    {
      // Production build with the e2e flags (flags and dev surfaces are read at build time),
      // mock data, pinned clock.
      command: `pnpm build && pnpm start --port ${PORT}`,
      timeout: 300_000,
      port: PORT,
      reuseExistingServer: false,
      env: { FEATURE_FLAGS: 'phase2', ENABLE_DEV_SURFACES: 'true' },
    },
    {
      // Production gates that are read at request time (e.g. the mock admin sign-in).
      command: `pnpm start --port ${PRODUCTION_PORT}`,
      timeout: 60_000,
      port: PRODUCTION_PORT,
      reuseExistingServer: false,
      env: { VERCEL_ENV: 'production' },
    },
  ],
});
