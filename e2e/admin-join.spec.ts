import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Pages › Join Us (M10a). The tests that change the content put it back, and run one
// after the other on the desktop project (the mock store is shared by everything running at once).

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const save = (page: Page) => page.getByRole('button', { name: 'Save changes' });
const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => Math.random().toString(36).slice(2, 8);

test.describe('join admin (M10a)', () => {
  test('shows the sample content and passes axe', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/join');
    await expect(page.getByRole('heading', { level: 1, name: 'Join Us' })).toBeVisible();
    await expect(page.locator('#jn-hero-title')).toHaveValue('Become an EESTECer');
    await expect(page.locator('#jn-benefits-0-title')).toHaveValue('International experience');
    await expect(page.locator('[id^="jn-faq-"][id$="-question"]')).toHaveCount(6);
    await expect(page.locator('#jn-steps-3-title')).toHaveValue('Become a full member');
    await expect(page.locator('#jn-documents-0-title')).toHaveValue('Statute');
    await expect(page.getByRole('switch', { name: 'Applications are open' })).toBeChecked();
    await expect(save(page)).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test.describe('changes', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'editing is a desktop flow');
    });

    test('edits the title, saves, and keeps it after a reload', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/join');
      const original = await page.locator('#jn-hero-title').inputValue();
      const text = `Join ${unique()}`;
      try {
        await page.locator('#jn-hero-title').fill(text);
        await expect(page.getByText('Unsaved changes')).toBeVisible();
        await save(page).click();
        await expect(toast(page, 'Join Us page saved')).toBeVisible();
        await page.reload();
        await expect(page.locator('#jn-hero-title')).toHaveValue(text);
      } finally {
        await page.locator('#jn-hero-title').fill(original);
        await save(page).click();
        await expect(toast(page, 'Join Us page saved').last()).toBeVisible();
      }
    });

    test('will not save an empty question, an empty heading or a form without faculties, and says where', async ({
      page,
    }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/join');
      await page.locator('#jn-faq-1-question').fill('');
      await page.locator('#jn-headings-why').fill('');
      while ((await page.getByRole('button', { name: /^Remove option \d+ of Faculties$/ }).count()) > 0)
        await page.getByRole('button', { name: /^Remove option 1 of Faculties$/ }).click();
      await save(page).click();
      const summary = page.getByRole('alert').filter({ hasText: "Can't save yet: fix 3 fields" });
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link', { name: /FAQ 2 › Question/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Heading of “Why join”/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Faculties/ })).toBeVisible();
      await page.reload();
      await expect(page.locator('#jn-faq-1-question')).toHaveValue('How much time does it take?');
    });

    test('adds a FAQ item and a requirement, saves, and removes them again', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/join');
      const questions = page.locator('[id^="jn-faq-"][id$="-question"]');
      const requirements = page.locator('[id^="jn-eligibility-items-"][id$="-text"]');
      await expect(questions).toHaveCount(6);
      await expect(requirements).toHaveCount(4);
      const name = `Question ${unique()}`;
      try {
        await page.getByRole('button', { name: 'Add question' }).click();
        await expect(questions.nth(6)).toBeFocused();
        await questions.nth(6).fill(name);
        await page.locator('#jn-faq-6-answer').fill('An answer.');
        await page.getByRole('button', { name: 'Add requirement' }).click();
        await expect(requirements.nth(4)).toBeFocused();
        await requirements.nth(4).fill('Be curious');
        await save(page).click();
        await expect(toast(page, 'Join Us page saved')).toBeVisible();
        await page.reload();
        await expect(questions).toHaveCount(7);
        await expect(requirements).toHaveCount(5);
      } finally {
        await page.getByRole('button', { name: `Remove ${name}` }).click();
        await page.getByRole('button', { name: 'Remove requirement 5' }).click();
        await save(page).click();
        await expect(page.getByText('All changes saved')).toBeVisible();
        await expect(questions).toHaveCount(6);
        await expect(requirements).toHaveCount(4);
      }
    });

    test('replaces a document with another PDF from the library', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/join');
      const row = page
        .locator('#jn-documents-0-title')
        .locator('xpath=ancestor::div[contains(@class,"border-line")][1]');
      await expect(row).toContainText('statute.pdf');
      await row.getByRole('button', { name: 'Choose another file' }).click();
      const dialog = page.getByRole('dialog', { name: 'Choose a PDF' });
      await dialog.getByRole('radio', { name: /partnership-offer-2026\.pdf/ }).click();
      await dialog.getByRole('button', { name: 'Use PDF' }).click();
      await expect(row).toContainText('partnership-offer-2026.pdf');
      await expect(save(page)).toBeEnabled();
      // Leave without saving: nothing was stored.
      await page.reload();
      await expect(
        page
          .locator('#jn-documents-0-title')
          .locator('xpath=ancestor::div[contains(@class,"border-line")][1]'),
      ).toContainText('statute.pdf');
    });

    test('reorders FAQ items with the keyboard (nothing is saved)', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/join');
      const questions = () =>
        page
          .locator('[id^="jn-faq-"][id$="-question"]')
          .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
      const before = await questions();
      const announced = (text: string) =>
        expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();
      const handle = page.getByRole('button', { name: `Reorder ${before[1]}` });
      await handle.focus();
      await page.keyboard.press('Space');
      await announced(`${before[1]} is now at position 2 of 6.`);
      // dnd-kit starts listening for the arrow keys one task after the pick-up.
      await page.waitForTimeout(150);
      await page.keyboard.press('ArrowDown');
      await announced(`${before[1]} is now at position 3 of 6.`);
      await page.keyboard.press('Space');
      await announced(`${before[1]} dropped at position 3 of 6.`);
      await expect.poll(questions).toEqual([before[0], before[2], before[1], ...before.slice(3)]);
      await expect(save(page)).toBeEnabled();
    });
  });

  test('editors may change the Join Us page; event managers may not even open it', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/pages/join');
    await expect(page.locator('#jn-hero-title')).toBeEnabled();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/pages/join');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });
});
