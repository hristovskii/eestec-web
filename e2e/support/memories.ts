import { expect, type Browser, type Page } from '@playwright/test';

import { PORT } from './servers';

// A 1 × 1 PNG: the browser reads it, makes it a JPEG and the server stores it.
export const PNG = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
});

/** The member (already logged in) writes a complete Memory and sends it to the board. */
export async function submitNewMemory(page: Page, title: string) {
  await page.goto('/en/memories/new');
  await expect(page.locator('#me-title')).toBeVisible();
  await expect(page.locator('#me-text')).toBeVisible();
  await page.locator('#me-title').fill(title);
  const powerUp = await page
    .locator('#me-event option', { hasText: 'Power Up' })
    .first()
    .getAttribute('value');
  await page.locator('#me-event').selectOption(powerUp);
  await page.locator('#me-text').click();
  await page.keyboard.type('We took the bus and nobody wanted to get off.');
  await page.locator('#me-photos-cover-file').setInputFiles(PNG('cover.png'));
  await page.locator('#me-photos-cover-alt').fill('The group on the lakeside');
  await page.getByRole('button', { name: 'Submit for review' }).first().click();
  await expect(page.getByRole('heading', { name: 'Sent to the board' })).toBeVisible();
}

/** A browser of its own signed in as a board persona (the caller's session stays). */
export async function boardPage(browser: Browser, persona: 'super-admin' | 'editor' = 'super-admin') {
  const context = await browser.newContext({ baseURL: `http://localhost:${PORT}` });
  await context.addCookies([
    { name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` },
  ]);
  return { context, page: await context.newPage() };
}
