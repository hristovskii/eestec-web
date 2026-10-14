import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Pages › Home (M8b). The tests that change the content put it back, and run one after the
// other on the desktop project (the mock store is shared by everything running at the same time).

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const save = (page: Page) => page.getByRole('button', { name: 'Save changes' });
const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => Math.random().toString(36).slice(2, 8);

test.describe('home admin (M8b)', () => {
  test('shows the sample content, the hint about the map counts and passes axe', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/home');
    await expect(page.getByRole('heading', { level: 1, name: 'Home page' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Map / Committees' }).last()).toHaveAttribute(
      'href',
      '/admin/pages/map',
    );
    await expect(page.locator('#h-hero-headline')).toHaveValue(
      'Learn more. Travel further. Build it together.',
    );
    await expect(page.locator('#h-activities-0-title')).toHaveValue('Workshops');
    await expect(page.locator('#h-milestones-0-year')).toHaveValue('2005');
    await expect(page.locator('#h-stats-2-value')).toHaveValue('5000');
    await expect(
      page.getByRole('list', { name: 'Home page sections, in the order shown' }).getByRole('listitem'),
    ).toHaveCount(7);
    await expect(save(page)).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test.describe('changes', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'editing is a desktop flow');
    });

    test('edits the hero, saves, and keeps it after a reload', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/home');
      const headline = page.locator('#h-hero-headline');
      const original = await headline.inputValue();
      const text = `Headline ${unique()}`;
      try {
        await headline.fill(text);
        await expect(page.getByText('Unsaved changes')).toBeVisible();
        await save(page).click();
        await expect(toast(page, 'Home page saved')).toBeVisible();
        await expect(page.getByText('All changes saved')).toBeVisible();
        await page.reload();
        await expect(page.locator('#h-hero-headline')).toHaveValue(text);
      } finally {
        await page.locator('#h-hero-headline').fill(original);
        await save(page).click();
        await expect(toast(page, 'Home page saved').last()).toBeVisible();
      }
    });

    test('will not save a missing headline, a bad link or an empty year, and says where', async ({
      page,
    }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/home');
      await page.locator('#h-hero-headline').fill('');
      await page.locator('#h-hero-primary-href').fill('join');
      await page.locator('#h-milestones-0-year').fill('');
      await save(page).click();
      const summary = page.getByRole('alert').filter({ hasText: "Can't save yet: fix 3 fields" });
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link', { name: /Headline/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Main button › Link/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Tradition of LC Skopje 1 › Year/ })).toBeVisible();
      await expect(page.locator('#h-hero-primary-href-error')).toContainText(
        'full link starting with https://',
      );
      await expect(page.locator('#h-milestones-0-year-error')).toContainText('whole number');
      await expect(page.getByText('Unsaved changes')).toBeVisible();
      // Nothing was stored.
      await page.reload();
      await expect(page.locator('#h-hero-headline')).not.toHaveValue('');
    });

    test('adds a milestone, saves it, and removes it again', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/home');
      const years = page.locator('[id^="h-milestones-"][id$="-year"]');
      await expect(years).toHaveCount(5);
      try {
        await page.getByRole('button', { name: 'Add milestone' }).click();
        await expect(years).toHaveCount(6);
        await expect(years.nth(5)).toBeFocused();
        await years.nth(5).fill('2026');
        await page.locator('#h-milestones-5-title').fill(`Milestone ${unique()}`);
        await page.locator('#h-milestones-5-text').fill('Something we did.');
        await save(page).click();
        await expect(toast(page, 'Home page saved')).toBeVisible();
        await page.reload();
        await expect(years).toHaveCount(6);
      } finally {
        await page.getByRole('button', { name: /^Remove 2026/ }).click();
        await save(page).click();
        await expect(page.getByText('All changes saved')).toBeVisible();
        await expect(years).toHaveCount(5);
      }
    });

    test('hides a section and moves another with the keyboard, then puts both back', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/home');
      const list = page.getByRole('list', { name: 'Home page sections, in the order shown' });
      const names = async () => {
        await expect(list.getByRole('listitem')).toHaveCount(7);
        return list.getByRole('listitem').locator('span.font-medium').allInnerTexts();
      };
      const before = await names();
      expect(before[0]).toBe('What is EESTEC');
      const latest = page.getByRole('switch', { name: 'Show Latest activity on Home' });
      await expect(latest).toBeChecked();
      await latest.click();
      const announced = (text: string) =>
        expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();
      const handle = page.getByRole('button', { name: 'Reorder EESTEC across Europe (map)' });
      await handle.focus();
      await page.keyboard.press('Space');
      await announced('EESTEC across Europe (map) is now at position 4 of 7.');
      await page.keyboard.press('ArrowUp');
      await announced('EESTEC across Europe (map) is now at position 3 of 7.');
      await page.keyboard.press('Space');
      await announced('EESTEC across Europe (map) dropped at position 3 of 7.');
      await save(page).click();
      await expect(toast(page, 'Home page saved')).toBeVisible();
      await page.reload();
      expect((await names())[2]).toBe('EESTEC across Europe (map)');
      await expect(page.getByRole('switch', { name: 'Show Latest activity on Home' })).not.toBeChecked();
      // The public page follows: no "Latest activity", and the map now comes before the numbers.
      const site = await page.context().newPage();
      const headings = async () => {
        await site.goto('/en');
        await expect(site.getByRole('heading', { level: 1 })).toHaveText(/\S/);
        return site.locator('main h2').allInnerTexts();
      };
      let seen = await headings();
      expect(seen).not.toContain("What we've been up to");
      expect(seen.indexOf('EESTEC across Europe')).toBeLessThan(seen.indexOf('EESTEC in numbers'));
      // Back to how it was.
      await page.getByRole('switch', { name: 'Show Latest activity on Home' }).click();
      // Moving "EESTEC in numbers" up puts the map back below it.
      const numbers = page.getByRole('button', { name: 'Reorder EESTEC in numbers' });
      await numbers.focus();
      await page.keyboard.press('Space');
      await announced('EESTEC in numbers is now at position 4 of 7.');
      await page.keyboard.press('ArrowUp');
      await announced('EESTEC in numbers is now at position 3 of 7.');
      await page.keyboard.press('Space');
      await announced('EESTEC in numbers dropped at position 3 of 7.');
      await save(page).click();
      await expect(page.getByText('All changes saved')).toBeVisible();
      await page.reload();
      expect(await names()).toEqual(before);
      seen = await headings();
      expect(seen).toContain("What we've been up to");
      expect(seen.indexOf('EESTEC in numbers')).toBeLessThan(seen.indexOf('EESTEC across Europe'));
      await site.close();
    });
  });

  test('editors may change the Home page; event managers may not even open it', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/pages/home');
    await expect(page.locator('#h-hero-headline')).toBeEnabled();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/pages/home');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });
});
