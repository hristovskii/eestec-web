import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

const header = (page: Page) => page.locator('header:visible');

async function signInAs(page: Page, persona: string) {
  // Devtools persona switcher (mock data only).
  await page.getByRole('button', { name: 'Open dev tools' }).click();
  // Controlled by the server session: it flips once the page has refreshed.
  await page.getByRole('radio', { name: new RegExp(`^${persona} ·`) }).click();
  await expect(page.getByRole('radio', { name: new RegExp(`^${persona} ·`) })).toBeChecked();
}

test.describe('site chrome (M2)', () => {
  test('one header, one footer, no horizontal scroll (MK and EN)', async ({ page }) => {
    for (const path of ['/privacy', '/en/privacy']) {
      await page.goto(path);
      await expect(header(page)).toHaveCount(1);
      await expect(page.locator('footer:visible')).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('header menu fits at 1024 and 1280 px in Macedonian', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop widths only');
    for (const width of [1024, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/privacy');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test('language switch keeps the page', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Политика за приватност');
    await header(page).getByRole('link', { name: 'EN', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy');
  });

  test('desktop nav shows all eight items (phase 2 on in e2e)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await page.goto('/en/privacy');
    const nav = header(page).getByRole('navigation', { name: 'Main' });
    for (const label of [
      'Home',
      'Events',
      'Upcoming Events',
      'Members',
      'Memories',
      'EESTEC Journey',
      'Join Us',
      'Contact',
    ]) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(header(page).getByRole('link', { name: 'Log in' })).toBeVisible();
  });

  test('mobile menu opens, shows guest actions and closes with Escape', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    await page.goto('/en/privacy');
    await header(page).getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: 'Become an EESTECer' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Member log in' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: 'Become an EESTECer' })).toBeHidden();
  });

  test('member and admin account states (HeaderStates)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop account menu');
    await page.goto('/en/privacy');
    await signInAs(page, 'Member');
    await page.getByRole('button', { name: 'Close dev tools' }).click();
    await header(page).getByRole('button', { name: 'Account menu: Marija Stojanovska' }).click();
    await expect(page.getByRole('menuitem', { name: 'My profile' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Admin panel' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await signInAs(page, 'Super admin');
    await page.getByRole('button', { name: 'Close dev tools' }).click();
    await header(page).getByRole('button', { name: 'Account menu: Ana Trajkovska' }).click();
    await expect(page.getByRole('menuitem', { name: 'Admin panel' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await expect(header(page).getByRole('link', { name: 'Log in' })).toBeVisible();
  });

  test('footer shows settings data', async ({ page }) => {
    await page.goto('/en/privacy');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'hello@eestec.mk' })).toBeVisible();
    await expect(footer.getByText('Weekly meeting: Wednesdays, 18:00 · Room 117, FEEIT')).toBeVisible();
    await expect(footer.getByText('© 2026 EESTEC LC Skopje · Student association')).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/en/privacy');
  });

  test('privacy page marks its placeholder text (D17)', async ({ page }) => {
    await page.goto('/en/privacy');
    await expect(page.getByText('Placeholder text', { exact: true })).toBeVisible();
  });

  test('no serious accessibility violations (guest and menu open)', async ({ page, isMobile }) => {
    await page.goto('/en/privacy');
    expect(await seriousViolations(page)).toEqual([]);
    if (isMobile) {
      await header(page).getByRole('button', { name: 'Open menu' }).click();
      expect(await seriousViolations(page)).toEqual([]);
    }
  });
});
