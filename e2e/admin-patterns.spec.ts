import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// The admin patterns lab (/admin/design-system, M3b): shared admin-ui components with sample rows.

async function openLab(page: Page, query = '') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'super-admin', url: `http://localhost:${PORT}` }]);
  await page.goto(`/admin/design-system${query}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin patterns' })).toBeVisible();
}

test.describe('admin patterns (M3b)', () => {
  test('selecting rows shows the bulk bar; a new page of rows clears it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones get cards without selection');
    await openLab(page);
    await page.getByRole('checkbox', { name: 'Select New Year Social 2026' }).check();
    await page.getByRole('checkbox', { name: 'Select FEEIT Career Day 2026' }).check();
    const bulk = page.getByRole('region', { name: 'Bulk actions', exact: true });
    await expect(bulk).toContainText('2 selected');
    await expect(page.getByRole('checkbox', { name: 'Select all on this page' })).toHaveJSProperty(
      'indeterminate',
      true,
    );
    await bulk.getByRole('button', { name: 'Clear selection' }).click();
    await expect(bulk).toBeHidden();

    await page.getByRole('checkbox', { name: 'Select New Year Social 2026' }).check();
    await expect(bulk).toBeVisible();
    await page.getByRole('link', { name: /^Past/ }).click();
    await expect(page).toHaveURL(/tab=past/);
    await expect(bulk).toBeHidden();
  });

  test('sorting and filters live in the URL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sort headers are desktop-only');
    await openLab(page);
    await page.getByRole('columnheader', { name: /Event/ }).getByRole('link').click();
    await expect(page).toHaveURL(/sort=title/);
    await expect(page.getByRole('columnheader', { name: /Event/ })).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.getByRole('row').nth(1)).toContainText('EESTech Challenge 2027');

    await page.getByLabel('Status').selectOption('draft');
    await expect(page).toHaveURL(/status=draft/);
    await expect(page.getByRole('row')).toHaveCount(3); // header + 2 drafts
  });

  test('a search with no results shows the designed empty state; Clear filters resets', async ({ page }) => {
    await openLab(page);
    await page.getByRole('searchbox', { name: 'Search events' }).fill('robotics');
    await expect(page).toHaveURL(/q=robotics/);
    await expect(page.getByRole('heading', { name: 'No events match these filters' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).last().click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(page.getByRole('searchbox', { name: 'Search events' })).toHaveValue('');
  });

  test('phones get cards and a filter sheet with the active count', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile layout');
    await openLab(page, '?status=published');
    await expect(page.getByRole('list', { name: 'Events' }).getByRole('listitem').first()).toContainText(
      'Workshop: AI at the Edge',
    );
    await page.getByRole('button', { name: 'Filters (1 active)' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await expect(sheet.getByLabel('Status')).toHaveValue('published');
    await sheet.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/status=/);
  });

  test('delete needs the word DELETE, and focus starts in the box', async ({ page }) => {
    await openLab(page);
    await page.getByRole('button', { name: 'Delete confirmation' }).click();
    const dialog = page.getByRole('alertdialog', { name: /Delete “Workshop: AI at the Edge”/ });
    const confirm = dialog.getByRole('button', { name: 'Delete event' });
    await expect(dialog.getByLabel('Type DELETE to confirm')).toBeFocused();
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
    await expect(confirm).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('publish lists what is missing; leaving with changes asks first', async ({ page, isMobile }) => {
    test.skip(isMobile, 'uses the desktop sidebar');
    await openLab(page);
    const form = page.getByRole('region', { name: 'Save' }).last();
    await form.getByRole('button', { name: 'Publish' }).click();
    const summary = page.getByRole('alert').filter({ hasText: "Can't publish yet" });
    await expect(summary).toContainText("Can't publish yet: fix 2 fields");
    await expect(summary.getByRole('link', { name: 'End date' })).toBeVisible();

    await page.getByLabel('Cover image alt text').fill('Students at the workshop');
    await expect(form).toContainText('Unsaved changes');
    await page
      .getByRole('navigation', { name: 'Admin sections' })
      .first()
      .getByRole('link', { name: 'Settings' })
      .click();
    const leave = page.getByRole('alertdialog', { name: 'Leave without saving?' });
    await expect(leave.getByRole('button', { name: 'Stay on page' })).toBeFocused();
    await leave.getByRole('button', { name: 'Stay on page' }).click();
    await expect(page).toHaveURL(/\/admin\/design-system/);
  });

  test('the MK / EN field falls back to Macedonian when English is empty', async ({ page }) => {
    await openLab(page);
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByLabel(/^Title/)).toHaveValue('');
    await expect(page.getByText('Empty: the English page shows the Macedonian text.')).toBeVisible();
    await expect(page.getByLabel(/^Title/)).toHaveAttribute('lang', 'en');
  });

  test('no serious accessibility violations', async ({ page }) => {
    await openLab(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
