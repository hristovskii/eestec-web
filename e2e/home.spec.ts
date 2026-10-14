import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// The public Home page (M8c). The admin tests change Home content for a moment (headline, a
// milestone, the section order) and put it back, so these tests check what stays the same.

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function openHome(page: Page, path = '/en') {
  // Tiles come from OpenStreetMap: a test must not need the internet.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/);
}

test.describe('home (M8c)', () => {
  test('hero with the next event, its countdown and the application state', async ({ page }) => {
    await openHome(page);
    const hero = page.getByRole('region', { name: /\S/ }).first();
    await expect(hero.getByRole('link', { name: 'Join Us' })).toHaveAttribute('href', '/en/join');
    await expect(hero.getByRole('link', { name: 'Upcoming Events' })).toHaveAttribute('href', '/en/upcoming');

    const card = page.getByRole('article').filter({ hasText: 'Next event' });
    await expect(card.getByRole('heading', { level: 2 })).toHaveText('Workshop: AI at the Edge');
    await expect(card).toContainText('7–13 Nov 2026');
    await expect(card).toContainText('Applications open');
    await expect(card.getByRole('timer')).toHaveAccessibleName('Until the event starts');
    await expect(card.getByRole('timer')).toContainText('days');
    await expect(card.getByRole('link', { name: /Event details/ })).toHaveAttribute(
      'href',
      /\/en\/upcoming\/.+/,
    );
  });

  test('about text, six activity cards and the link to eestec.net', async ({ page }) => {
    await openHome(page);
    const about = page.getByRole('region', { name: 'What is EESTEC?' });
    await expect(about).toContainText('non-profit, non-political student association');
    await expect(about.getByRole('listitem')).toHaveCount(6);
    await expect(about.getByRole('heading', { level: 3, name: 'Soft Skills trainings' })).toBeVisible();
    await expect(about.getByRole('link', { name: /Visit eestec\.net/ })).toHaveAttribute(
      'href',
      'https://eestec.net',
    );
  });

  test('timeline of milestones in the order the board set, with photos where they have one', async ({
    page,
  }) => {
    await openHome(page);
    const timeline = page.getByRole('region', { name: 'Tradition of LC Skopje' });
    await expect(timeline.getByText(/^Since \d{4}$/)).toBeVisible();
    const items = timeline.getByRole('listitem');
    expect(await items.count()).toBeGreaterThanOrEqual(5);
    await expect(items.first()).toContainText('2005');
    await expect(items.first()).toContainText('International networking workshop');
    await expect(items.first().getByRole('img', { name: /Lake Ohrid/ })).toBeAttached();
  });

  test('the timeline scrolls with the arrow buttons when it does not fit', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones show the timeline as a vertical list');
    await page.setViewportSize({ width: 1024, height: 800 });
    await openHome(page);
    const next = page.getByRole('button', { name: 'Next milestones' });
    const previous = page.getByRole('button', { name: 'Previous milestones' });
    await expect(next).toBeVisible();
    await expect(previous).toBeDisabled();
    const track = page.getByRole('region', { name: 'Milestones of LC Skopje' });
    await next.click();
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(previous).toBeEnabled();
  });

  test('numbers count up to the final value and are read as the final value', async ({ page }) => {
    await openHome(page);
    const numbers = page.getByRole('region', { name: 'EESTEC in numbers' });
    await numbers.scrollIntoViewIfNeeded();
    const stat = numbers
      .locator('div')
      .filter({ hasText: /^EESTEC members in Europe/ })
      .last();
    await expect(stat.locator('.sr-only')).toHaveText('5,000+');
    await expect(stat.locator('[aria-hidden]')).toHaveText('5,000+');
    await expect(numbers.getByText('Local Committees')).toBeVisible();
  });

  test('reduced motion shows the final numbers at once', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await openHome(page, '/en');
    const numbers = page.getByRole('region', { name: 'EESTEC in numbers' });
    await numbers.scrollIntoViewIfNeeded();
    await expect(numbers.locator('[aria-hidden]').filter({ hasText: '5,000+' })).toBeVisible();
    await context.close();
  });

  test('the committee map and the weekly meeting box', async ({ page }) => {
    await openHome(page);
    const network = page.getByRole('region', { name: 'EESTEC across Europe' });
    await expect(network.getByRole('button', { name: /^All · \d+$/ })).toBeVisible();
    await expect(network.getByRole('button', { name: 'List view' })).toBeVisible();

    const meeting = page.getByRole('region', { name: /We meet every/ });
    await expect(meeting).toContainText('We meet every Wednesday at 18:00 in Room 117, FEEIT.');
    await expect(meeting.getByRole('link', { name: /Get directions/ })).toHaveAttribute(
      'href',
      /google\.com\/maps\/search\/\?api=1&query=/,
    );
  });

  test('sections follow the order of the design, and unfinished ones stay out', async ({ page }) => {
    await openHome(page);
    const headings = await page.locator('main h2').allInnerTexts();
    const order = [
      'Workshop: AI at the Edge',
      'What is EESTEC?',
      'Tradition of LC Skopje',
      'EESTEC in numbers',
      'From first meeting to alumni',
    ].map((text) => headings.indexOf(text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The partner strip (M11) is always the last section, directly above the footer.
    const partners = page.getByRole('heading', { level: 2, name: 'Our Partners' });
    await expect(partners).toBeVisible();
    const last = await page.locator('main h2').allInnerTexts();
    expect(last.at(-1)).toBe('Our Partners');
  });

  test('the Journey teaser: six steps and a button to the Journey page', async ({ page }) => {
    await openHome(page);
    const teaser = page.getByRole('region', { name: 'From first meeting to alumni' });
    await expect(teaser).toContainText('Six steps to get the most out of EESTEC');
    await expect(teaser.getByRole('listitem')).toHaveCount(6);
    await expect(teaser.getByText('STEP 01')).toBeVisible();
    await expect(teaser.getByRole('heading', { level: 3, name: 'Go International' })).toBeVisible();
    await teaser.getByRole('link', { name: 'Explore the journey' }).click();
    await expect(page).toHaveURL(/\/en\/journey$/);
  });

  test('Macedonian is the default language and nothing scrolls sideways', async ({ page }) => {
    await openHome(page, '/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'mk');
    await expect(page.getByRole('region', { name: 'Што е EESTEC?' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Традицијата на LC Скопје' })).toBeVisible();
    await expect(page.getByRole('region', { name: /Се среќаваме/ })).toContainText('секоја среда');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no serious accessibility violations (English and Macedonian)', async ({ page }) => {
    await openHome(page, '/en');
    await page.getByRole('region', { name: 'Tradition of LC Skopje' }).scrollIntoViewIfNeeded();
    expect(await seriousViolations(page)).toEqual([]);
    await openHome(page, '/');
    expect(await seriousViolations(page)).toEqual([]);
  });
});
