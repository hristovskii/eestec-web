import { expect, test } from '@playwright/test';

import { PRODUCTION_URL } from './support/servers';

// The mock admin sign-in must not work on a production deployment (VERCEL_ENV=production with
// DATA_SOURCE=mock). This server is the same build, started with VERCEL_ENV=production. That the
// sign-in and 2-step actions answer "unavailable" is covered by data/auth.mock.test.ts.
test.use({ baseURL: PRODUCTION_URL });

test.describe('admin on production with mock data', () => {
  test('/admin/login shows "Admin not available yet" and no sign-in form', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Admin not available yet');
    await expect(page.getByLabel('E-mail')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
  });

  test('a hand-made mock session cookie does not open the panel', async ({ page, context }) => {
    await context.addCookies([{ name: 'eestec_mock_persona', value: 'super-admin', url: PRODUCTION_URL }]);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Admin not available yet');
  });
});
