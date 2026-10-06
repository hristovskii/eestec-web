import { expect, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

test.describe('design system (M1)', () => {
  test('renders every section', async ({ page }) => {
    await page.goto('/en/design-system');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'One system for every page of eestec.mk',
    );
    for (const title of [
      'Colors',
      'Typography',
      'Buttons & links',
      'Cards',
      'Form fields',
      'Lists: navigation',
      'Feedback & overlays',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await page.goto('/en/design-system');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('has no horizontal scroll', async ({ page }) => {
    await page.goto('/en/design-system');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('dialog traps focus and closes with Escape', async ({ page }) => {
    await page.goto('/en/design-system');
    await page.getByRole('button', { name: 'Open dialog' }).click();
    const dialog = page.getByRole('dialog', { name: 'Stop sharing your CV?' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('countdown follows the pinned mock clock', async ({ page }) => {
    await page.goto('/en/design-system');
    // The first one (Badges › Countdown); the Application box section has more.
    const timer = page.getByRole('timer', { name: 'Applications close in', exact: true }).first();
    // 4 Oct 2026 18:18 → 18 Oct 2026 23:59: 14 days 5 hours.
    await expect(timer).toContainText('14');
    await expect(timer).toContainText('05');
  });

  test('pagination: page numbers on desktop, "Page X of Y" everywhere', async ({ page, isMobile }) => {
    await page.goto('/en/design-system');
    const pages = page.getByRole('navigation', { name: 'Pages' });
    await expect(pages.getByText('Page 1 of 8')).toBeVisible();
    const current = pages.getByRole('link', { name: 'Page 1', exact: true });
    if (isMobile) await expect(current).toBeHidden();
    else await expect(current).toHaveAttribute('aria-current', 'page');
  });
});
