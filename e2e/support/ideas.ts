import { expect, type Page } from '@playwright/test';

import { hydrated } from './members';

/** A visitor (or the signed-in person) sends an idea through the real form. Returns what they typed. */
export async function sendIdea(
  page: Page,
  options: { title: string; name?: string; email?: string; anonymous?: boolean; type?: string },
) {
  await page.goto('/en/submit');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Have an idea? Been to an event?' }),
  ).toBeVisible();
  await hydrated(page, 'form[aria-labelledby="sf-title-heading"]');
  await page.waitForTimeout(3200);
  const form = page.getByRole('form', { name: 'Submit an idea' });
  await form.getByText(options.type ?? 'Workshop topic', { exact: true }).click();
  await form.getByLabel(/^Title/).fill(options.title);
  await form
    .getByLabel(/^Describe your idea/)
    .fill('A longer description of the idea, so that it is more than twenty characters.');
  if (options.anonymous) await form.getByRole('checkbox', { name: 'Submit anonymously' }).check();
  else if (options.name) {
    await form.getByLabel(/^Name/).fill(options.name);
    if (options.email) {
      await form.getByLabel(/^E-mail/).fill(options.email);
      await form.getByRole('checkbox', { name: /I agree that/ }).check();
    }
  }
  await form.getByRole('button', { name: 'Send idea' }).click();
  await expect(page.getByRole('heading', { name: /Your idea is with the board/ })).toBeVisible();
}

/** A visitor sends an impression of an event through the real form. */
export async function sendImpression(
  page: Page,
  options: { text: string; event?: string; stars?: number; name?: string; email?: string },
) {
  await page.goto(`/en/submit?tab=impression&event=${options.event ?? 'power-up-2026'}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Have an idea? Been to an event?' }),
  ).toBeVisible();
  await hydrated(page, 'form[aria-labelledby="sf-title-heading"]');
  await page.waitForTimeout(3200);
  const form = page.getByRole('form', { name: 'Share an impression or feedback' });
  if (options.stars) {
    const label = ['Poor', 'Okay', 'Good', 'Great', 'Amazing'][options.stars - 1];
    await form.getByRole('radio', { name: `${options.stars} of 5: ${label}` }).check({ force: true });
  }
  await form.getByLabel(/^Your impression or feedback/).fill(options.text);
  if (options.name) {
    await form.getByLabel(/^Name/).fill(options.name);
    if (options.email) {
      await form.getByLabel(/^E-mail/).fill(options.email);
      await form.getByRole('checkbox', { name: /I agree that/ }).check();
    }
  }
  await form.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByRole('heading', { name: /Thanks for your feedback on/ })).toBeVisible();
}
