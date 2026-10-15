import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// The public Journey page (M9b). The admin test changes the content for a moment and puts it
// back; these tests check what stays the same. The e2e build has Phase 2 on, so the buttons to
// member pages show here (the Phase 1 rule itself is a unit test).

const step = (page: Page, n: number) => page.locator(`#step-${n}`);
const more = (page: Page, n: number) => step(page, n).getByRole('button', { name: /Show (more|less)/ });

/** Scrolls down the whole path and waits until every card has finished sliding in (axe misreads half-faded colours). */
async function finishAnimations(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))),
  );
}

async function seeEverything(page: Page) {
  for (const n of [1, 2, 3, 4, 5, 6]) await step(page, n).scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('#step-1, #step-2, #step-3, #step-4, #step-5, #step-6')
        .evaluateAll((items) =>
          items.every(
            (item) => getComputedStyle(item.querySelector('article')!.parentElement!).opacity === '1',
          ),
        ),
    )
    .toBe(true);
}

test.describe('journey page (M9b)', () => {
  test('hero, six steps in order, and the closing call to action', async ({ page }) => {
    await page.goto('/en/journey');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('From your first meeting to alumni');
    await expect(
      page.getByText('Six steps to get the most out of EESTEC. Start wherever you are.'),
    ).toBeVisible();
    const titles = page
      .locator('#step-1, #step-2, #step-3, #step-4, #step-5, #step-6')
      .getByRole('heading', { level: 2 });
    await expect(titles).toHaveText([
      'Join',
      'Participate',
      'Volunteer & Organize',
      'Go International',
      'Lead',
      'Stay Connected',
    ]);
    await expect(step(page, 3)).toContainText('STEP 03');
    await expect(step(page, 1).getByRole('link', { name: 'Join Us' })).toHaveAttribute('href', '/en/join');
    await expect(step(page, 4).getByRole('link', { name: 'See events abroad' })).toHaveAttribute(
      'href',
      '/en/upcoming?scope=international',
    );

    const cta = page.getByRole('region', { name: 'Ready for step one?' });
    await expect(cta.getByRole('link', { name: 'Start your journey' })).toHaveAttribute('href', '/en/join');
    await expect(cta).toContainText('Wednesdays, 18:00 · Room 117, FEEIT');
  });

  test('the pills in the hero jump to their step', async ({ page }) => {
    await page.goto('/en/journey');
    const pills = page.getByRole('navigation', { name: 'Journey steps' });
    await expect(pills.getByRole('link')).toHaveCount(6);
    await pills.getByRole('link', { name: /Go International/ }).click();
    await expect(page).toHaveURL(/#step-4$/);
    await expect(step(page, 4)).toBeInViewport();
  });

  test('a step opens with its benefits, photo and quote, and stays open until closed', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'phones keep one step open: see the next test');
    await page.goto('/en/journey');
    const first = step(page, 1);
    await first.scrollIntoViewIfNeeded();
    await expect(first.getByText('Come to the weekly meeting every Wednesday')).toBeHidden();
    // Hovering only highlights.
    await first.getByRole('article').hover();
    await expect(more(page, 1)).toHaveAttribute('aria-expanded', 'false');

    await more(page, 1).click();
    await expect(more(page, 1)).toHaveAttribute('aria-expanded', 'true');
    await expect(more(page, 1)).toHaveText(/Show less/);
    await expect(first.getByText('Come to the weekly meeting every Wednesday')).toBeVisible();
    await expect(first.getByRole('img', { name: /Wednesday meeting in room 117/ })).toBeVisible();
    await expect(first.getByRole('blockquote')).toContainText('free pizza');
    await expect(first.getByText('Elena Petrovska · member since 2023')).toBeVisible();

    // Opening another one leaves the first open (desktop).
    await step(page, 2).scrollIntoViewIfNeeded();
    await more(page, 2).click();
    await expect(more(page, 1)).toHaveAttribute('aria-expanded', 'true');
    await expect(more(page, 2)).toHaveAttribute('aria-expanded', 'true');
    await more(page, 1).click();
    await expect(first.getByText('Come to the weekly meeting every Wednesday')).toBeHidden();
  });

  test('phones keep one step open at a time', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the one-at-a-time rule is for phones');
    await page.goto('/en/journey');
    await step(page, 1).scrollIntoViewIfNeeded();
    await more(page, 1).click();
    await expect(more(page, 1)).toHaveAttribute('aria-expanded', 'true');
    await step(page, 2).scrollIntoViewIfNeeded();
    await more(page, 2).click();
    await expect(more(page, 2)).toHaveAttribute('aria-expanded', 'true');
    await expect(more(page, 1)).toHaveAttribute('aria-expanded', 'false');
  });

  test('"Show more" works with the keyboard and names its step for screen readers', async ({ page }) => {
    await page.goto('/en/journey');
    const button = step(page, 2).getByRole('button', { name: 'Show more — Participate' });
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(step(page, 2).getByRole('button', { name: 'Show less — Participate' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(step(page, 2).locator('#step-2-more')).toBeVisible();
  });

  test('reduced motion shows every step at once', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/en/journey`);
    for (const n of [1, 6]) {
      const card = step(page, n).getByRole('article');
      await expect(card).toHaveCSS('opacity', '1');
      await expect(card.locator('xpath=..')).not.toHaveClass(/opacity-0/);
    }
    await context.close();
  });

  test('without reduced motion a step below the screen waits, then slides in', async ({ page, isMobile }) => {
    test.skip(isMobile, 'checked on the desktop layout');
    await page.goto('/en/journey');
    const last = step(page, 6).getByRole('article').locator('xpath=..');
    await expect(last).toHaveClass(/opacity-0/);
    await step(page, 6).scrollIntoViewIfNeeded();
    await expect(last).toHaveClass(/opacity-100/);
  });

  test('Macedonian, no sideways scroll, and no serious accessibility violations', async ({ page }) => {
    await page.goto('/journey');
    await expect(page.locator('html')).toHaveAttribute('lang', 'mk');
    await seeEverything(page);
    await expect(step(page, 1)).toContainText('ЧЕКОР 01');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await finishAnimations(page);
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto('/en/journey');
    await seeEverything(page);
    await step(page, 3).scrollIntoViewIfNeeded();
    await more(page, 3).click();
    await finishAnimations(page);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('a change in Admin shows on the page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'editing is a desktop flow');
    await page
      .context()
      .addCookies([{ name: 'eestec_mock_persona', value: 'editor', url: `http://localhost:${PORT}` }]);
    await page.goto('/admin/pages/journey');
    const title = page.locator('#j-hero-title');
    const original = await title.inputValue();
    try {
      await title.fill('Your path through EESTEC');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(
        page.locator('[data-sonner-toast]').filter({ hasText: 'Journey page saved' }),
      ).toBeVisible();
      // The field edits the Macedonian text, so the unprefixed (Macedonian) page changes.
      await page.goto('/journey');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your path through EESTEC');
    } finally {
      await page.goto('/admin/pages/journey');
      await page.locator('#j-hero-title').fill(original);
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(
        page.locator('[data-sonner-toast]').filter({ hasText: 'Journey page saved' }),
      ).toBeVisible();
    }
  });
});
