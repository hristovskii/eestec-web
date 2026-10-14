import { expect, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// The public Join Us page (M10b). The admin tests change the content for a moment and put it
// back; these tests check what stays the same. The application form (section 6) is M10c.

test.describe('join page (M10b)', () => {
  test('hero, "at a glance" and the next info session', async ({ page }) => {
    await page.goto('/en/join');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Become an EESTECer');
    await expect(page.getByRole('link', { name: 'See the journey' })).toHaveAttribute('href', '/en/journey');
    const glance = page.getByRole('heading', { name: 'At a glance' }).locator('xpath=..');
    await expect(glance).toContainText('University students in Skopje');
    await expect(glance).toContainText('600 MKD / year');
    // The mock clock is pinned to Sunday 4 Oct 2026: the next Wednesday is the 7th.
    await expect(glance).toContainText('Wed 7 Oct · 18:00 · Room 117, FEEIT');
  });

  test('the sections come in order, each with its heading', async ({ page }) => {
    await page.goto('/en/join');
    const headings = await page.locator('main h2').allInnerTexts();
    const order = [
      'What you get out of it',
      'Students in Skopje, any year',
      'Four steps to full membership',
      'The short version',
      'Questions we hear a lot',
    ].map((text) => headings.indexOf(text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    await expect(page.locator('#why').getByRole('listitem')).toHaveCount(6);
    await expect(page.locator('#who')).toContainText('Not sure you qualify?');
    await expect(page.locator('#who').getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/);
    await expect(page.locator('#how').getByRole('listitem')).toHaveCount(4);
    await expect(page.locator('#how')).toContainText('600 MKD');
    await expect(page.locator('#rules')).toContainText('Your rights');
    await expect(page.locator('#rules')).toContainText('Zero tolerance');
    await expect(page.locator('#rules')).toContainText('Write your own motivation letter');
  });

  test('official documents list the sample PDFs without a download link', async ({ page }) => {
    await page.goto('/en/join');
    const docs = page
      .locator('#rules')
      .getByRole('heading', { name: 'Official documents' })
      .locator('xpath=..');
    await expect(docs.getByRole('listitem')).toHaveCount(3);
    await expect(docs).toContainText('Statute');
    await expect(docs).toContainText('Internal rules');
    await expect(docs).toContainText('Code of conduct');
    await expect(docs).toContainText('sample file, no download yet');
    await expect(docs.getByRole('link')).toHaveCount(0);
  });

  test('the sub-nav jumps to a section and marks the one being read', async ({ page }) => {
    await page.goto('/en/join');
    const nav = page.getByRole('navigation', { name: 'On this page' });
    await expect(nav.getByRole('link')).toHaveText([
      'Why join',
      'Who can join',
      'How to join',
      'Rules',
      'FAQ',
    ]);
    await nav.getByRole('link', { name: 'How to join' }).click();
    await expect(page).toHaveURL(/#how$/);
    await expect(page.locator('#how')).toBeInViewport();
    await expect(nav.getByRole('link', { name: 'How to join' })).toHaveAttribute('aria-current', 'true');
    await nav.getByRole('link', { name: 'FAQ' }).click();
    await expect(nav.getByRole('link', { name: 'FAQ' })).toHaveAttribute('aria-current', 'true');
    await expect(nav.getByRole('link', { name: 'How to join' })).not.toHaveAttribute('aria-current', 'true');
    // The sticky bar does not cover the heading it jumped to.
    const bar = await nav.boundingBox();
    const heading = await page.locator('#faq-title').boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height - 1);
  });

  test('the FAQ opens one answer at a time, also with the keyboard', async ({ page }) => {
    await page.goto('/en/join');
    const first = page.getByRole('button', { name: 'Do I have to study at FEEIT?' });
    const second = page.getByRole('button', { name: 'How much time does it take?' });
    await first.scrollIntoViewIfNeeded();
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await first.click();
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Most members study at FEEIT')).toBeVisible();
    await second.focus();
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByText('Most members spend 2–4 hours a week')).toBeVisible();
    await second.click();
    await expect(second).toHaveAttribute('aria-expanded', 'false');
  });

  test('there is no "Apply now" until the form exists', async ({ page }) => {
    await page.goto('/en/join');
    await expect(page.getByRole('link', { name: 'Apply now' })).toHaveCount(0);
  });

  test('Macedonian is the default language, nothing scrolls sideways, and axe is clean', async ({ page }) => {
    await page.goto('/join');
    await expect(page.locator('html')).toHaveAttribute('lang', 'mk');
    await expect(page.getByRole('navigation', { name: 'На оваа страница' })).toBeVisible();
    await expect(page.locator('#rules')).toContainText('Твои права');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto('/en/join');
    await page.getByRole('button', { name: 'Do I have to study at FEEIT?' }).click();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
