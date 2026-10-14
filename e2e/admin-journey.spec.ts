import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Pages › Journey (M9a). The tests that change the content put it back, and run one after
// the other on the desktop project (the mock store is shared by everything running at once).

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const save = (page: Page) => page.getByRole('button', { name: 'Save changes' });
const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => Math.random().toString(36).slice(2, 8);

test.describe('journey admin (M9a)', () => {
  test('shows the six sample steps and passes axe', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/journey');
    await expect(page.getByRole('heading', { level: 1, name: 'EESTEC Journey' })).toBeVisible();
    await expect(page.locator('#j-hero-title')).toHaveValue('From your first meeting to alumni');
    await expect(page.locator('[id^="j-steps-"][id$="-title"]')).toHaveCount(6);
    await expect(page.locator('#j-steps-0-title')).toHaveValue('Join');
    await expect(page.locator('#j-steps-5-title')).toHaveValue('Stay Connected');
    await expect(page.locator('#j-steps-0-bullets-0-text')).toHaveValue(
      'Meet students from every year and department',
    );
    await expect(page.locator('#j-steps-0-quote-author')).toHaveValue(/Elena Petrovska/);
    await expect(save(page)).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('warns that a button to a member page stays hidden until members are on', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/journey');
    await expect(page.locator('#j-steps-2-button-href')).toHaveValue('/members#teams');
    await expect(page.getByText(/needs member accounts/)).toHaveCount(2);
    await expect(page.locator('#j-steps-0-button-href')).toHaveValue('/join');
  });

  test.describe('changes', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'editing is a desktop flow');
    });

    test('edits the title, saves, and keeps it after a reload', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/journey');
      const original = await page.locator('#j-hero-title').inputValue();
      const text = `Journey ${unique()}`;
      try {
        await page.locator('#j-hero-title').fill(text);
        await expect(page.getByText('Unsaved changes')).toBeVisible();
        await save(page).click();
        await expect(toast(page, 'Journey page saved')).toBeVisible();
        await page.reload();
        await expect(page.locator('#j-hero-title')).toHaveValue(text);
      } finally {
        await page.locator('#j-hero-title').fill(original);
        await save(page).click();
        await expect(toast(page, 'Journey page saved').last()).toBeVisible();
      }
    });

    test('will not save an empty title, a bad link or a quote without an author, and says where', async ({
      page,
    }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/journey');
      await page.locator('#j-steps-1-title').fill('');
      await page.locator('#j-steps-1-button-href').fill('participate');
      await page.locator('#j-steps-0-quote-author').fill('');
      await save(page).click();
      const summary = page.getByRole('alert').filter({ hasText: "Can't save yet: fix 3 fields" });
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link', { name: /Steps 2 › Title/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Steps 2 › Link/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Steps 1 › Who said it/ })).toBeVisible();
      await expect(page.locator('#j-steps-1-title-error')).toContainText('Fill this in');
      await expect(page.locator('#j-steps-1-button-href-error')).toContainText('full link');
      await page.reload();
      await expect(page.locator('#j-steps-1-title')).toHaveValue('Participate');
    });

    test('adds a step with a benefit and a quote, saves it, and removes it again', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/journey');
      const titles = page.locator('[id^="j-steps-"][id$="-title"]');
      await expect(titles).toHaveCount(6);
      const name = `Step ${unique()}`;
      try {
        await page.getByRole('button', { name: 'Add step' }).click();
        await expect(titles).toHaveCount(7);
        await expect(titles.nth(6)).toBeFocused();
        await titles.nth(6).fill(name);
        await page.locator('#j-steps-6-text').fill('Something new.');
        await page.locator('#j-steps-6-button-label').fill('Go');
        await page.getByRole('button', { name: 'Add benefit' }).last().click();
        await expect(page.locator('#j-steps-6-bullets-0-text')).toBeFocused();
        await page.locator('#j-steps-6-bullets-0-text').fill('A first benefit');
        await page.getByRole('button', { name: 'Add a quote' }).last().click();
        await page.locator('#j-steps-6-quote-text').fill('Great.');
        await page.locator('#j-steps-6-quote-author').fill('Someone · member');
        await save(page).click();
        await expect(toast(page, 'Journey page saved')).toBeVisible();
        await page.reload();
        await expect(titles).toHaveCount(7);
        await expect(page.locator('#j-steps-6-bullets-0-text')).toHaveValue('A first benefit');
      } finally {
        await page.getByRole('button', { name: `Remove ${name}` }).click();
        await save(page).click();
        await expect(page.getByText('All changes saved')).toBeVisible();
        await expect(titles).toHaveCount(6);
      }
    });

    test('reorders steps with the keyboard, then puts them back', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/journey');
      const titles = () =>
        page
          .locator('[id^="j-steps-"][id$="-title"]')
          .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
      const before = await titles();
      const announced = (text: string) =>
        expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();
      const handle = page.getByRole('button', { name: 'Reorder Participate' });
      await handle.focus();
      await page.keyboard.press('Space');
      await announced('Participate is now at position 2 of 6.');
      await page.keyboard.press('ArrowDown');
      await announced('Participate is now at position 3 of 6.');
      await page.keyboard.press('Space');
      await announced('Participate dropped at position 3 of 6.');
      await expect.poll(titles).toEqual([before[0], before[2], before[1], ...before.slice(3)]);
      // Leave without saving: nothing was stored.
      await page.reload();
      expect(await titles()).toEqual(before);
    });
  });

  test('editors may change the Journey page; event managers may not even open it', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/pages/journey');
    await expect(page.locator('#j-hero-title')).toBeEnabled();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/pages/journey');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });
});
