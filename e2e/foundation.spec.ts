import { expect, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

test.describe('foundation (M0)', () => {
  test('Macedonian is the default locale at /', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'mk');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('EESTEC LC Скопје');
  });

  test('English lives under /en', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('EESTEC LC Skopje');
  });

  test('/mk redirects to the unprefixed URL', async ({ page }) => {
    await page.goto('/mk');
    await expect(page).toHaveURL(/\/$/);
  });

  test('unknown public URL renders the 404 page with a 404 status', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Страницата не е пронајдена');
  });

  test('unknown admin URL renders the admin 404 page', async ({ page }) => {
    const response = await page.goto('/admin/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
    await expect(page.getByRole('link', { name: 'Back to the admin dashboard' })).toBeVisible();
  });

  test('unknown API URL returns 404', async ({ request }) => {
    const response = await request.get('/api/does-not-exist');
    expect(response.status()).toBe(404);
  });

  test('admin is English-only, noindex, outside locale routing', async ({ page }) => {
    const response = await page.goto('/admin');
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('security headers are set', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('home has no serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    expect(await seriousViolations(page)).toEqual([]);
  });
});
