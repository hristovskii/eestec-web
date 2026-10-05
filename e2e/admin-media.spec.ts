import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Media library (M4a). The mock store is shared by parallel tests, so tests that change
// data use their own files and never assert totals other tests could change.

async function signInAs(page: Page, persona: 'super-admin' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

// A 2 × 1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGN4qmUARAAKKgJ/Mt7YcQAAAABJRU5ErkJggg==',
  'base64',
);

const grid = (page: Page) => page.getByRole('list', { name: 'Files' });

test.describe('media library (M4a)', () => {
  test('lists files with tabs and flags images without alt text', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/media');
    await expect(page.getByRole('heading', { level: 1, name: 'Media library' })).toBeVisible();
    await expect(grid(page).getByRole('button', { name: /cover-ai-edge\.jpg/ })).toBeVisible();

    await page.getByRole('link', { name: /^Documents/ }).click();
    await expect(page).toHaveURL(/kind=document/);
    await expect(grid(page).getByRole('button', { name: /partnership-offer-2026\.pdf/ })).toBeVisible();
    await expect(grid(page).getByRole('button', { name: /\.jpg/ })).toHaveCount(0);

    await page.goto('/admin/media?alt=missing');
    for (const card of await grid(page).getByRole('listitem').all()) {
      await expect(card).toContainText('No alt text');
    }
  });

  test('an image needs alt text (or "decorative") to be saved', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes shared sample data: run once');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/media?q=ohrid-group-selfie');
    await grid(page)
      .getByRole('button', { name: /ohrid-group-selfie\.jpg/ })
      .click();
    const panel = page.getByRole('dialog', { name: 'File details' });

    await panel.getByLabel('Photo credit').fill('Marija Stojanovska (PR)');
    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(panel.getByText('Add alt text, or mark the image as decorative.')).toBeVisible();

    await panel.getByLabel(/^Alt text/).fill('About twenty students taking a selfie on the Ohrid lake shore');
    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(grid(page).getByRole('listitem').first()).not.toContainText('No alt text');
  });

  test('uploads in two steps once every image has alt text', async ({ page, request }, testInfo) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/media');
    await page.getByRole('button', { name: 'Upload files' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Upload files' });
    const fileName = `e2e-${testInfo.project.name}.png`;
    await dialog.locator('input[type=file]').setInputFiles([
      { name: fileName, mimeType: 'image/png', buffer: PNG },
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
    ]);
    await expect(dialog.getByText("This file type isn't accepted.", { exact: false })).toBeVisible();
    const submit = dialog.getByRole('button', { name: 'Upload 1 file' });
    await expect(submit).toBeDisabled();
    await dialog.getByLabel(`Alt text (${fileName})`).fill('A red test pixel');
    await submit.click();
    await expect(page.getByText('1 file uploaded')).toBeVisible();

    const card = grid(page).getByRole('button', { name: new RegExp(fileName.replace('.', '\\.')) });
    await expect(card).toBeVisible();
    await expect(card).toContainText('2 × 1');
    const src = await card.locator('img').getAttribute('src');
    const file = await request.get(src!);
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toBe('image/png');
  });

  test('event managers see and change only their own uploads (D18)', async ({ page }) => {
    await signInAs(page, 'event-manager');
    await page.goto('/admin/media');
    await expect(page.getByText('The files you uploaded.', { exact: false })).toBeVisible();
    await expect(grid(page).getByRole('button', { name: /ai-at-the-edge-lab\.jpg/ })).toBeVisible();
    await expect(grid(page).getByRole('button', { name: /LC_Skopje_red\.png/ })).toHaveCount(0);
    await expect(page.getByLabel('Uploaded by')).toHaveCount(0);
  });

  test('the mock upload route needs a signed-in admin and a reserved upload', async ({ request }) => {
    const id = '00000000-0000-4000-8000-000000000000';
    const anonymous = await request.put(`/api/dev-uploads/${id}`, {
      headers: { 'content-type': 'image/png' },
      data: PNG,
    });
    expect(anonymous.status()).toBe(403);
    expect((await request.get(`/api/dev-uploads/${id}`)).status()).toBe(404);
  });

  test('no serious accessibility violations (grid and details)', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/media');
    expect(await seriousViolations(page)).toEqual([]);
    await grid(page)
      .getByRole('button', { name: /ai-at-the-edge-lab\.jpg/ })
      .click();
    await expect(page.getByRole('dialog', { name: 'File details' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
