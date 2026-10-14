import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// Every public page, in both languages, on a desktop and on a phone (M13c): axe finds no serious or
// critical problem, there is one h1 and one main landmark, the language is set, headings don't
// skip a level, and every image has alt text. Pages with their own tests also cover their states.

const ROUTES = [
  '/',
  '/events',
  '/events/robomac-2025',
  '/upcoming',
  '/upcoming/ai-at-the-edge',
  '/journey',
  '/join',
  '/partners',
  '/contact',
  '/privacy',
  '/does-not-exist',
] as const;

/** Lazy images, faded rows and web fonts settle before axe looks at colours. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

for (const [locale, prefix] of [
  ['mk', ''],
  ['en', '/en'],
] as const) {
  test.describe(`public pages in ${locale}`, () => {
    for (const route of ROUTES) {
      const path = route === '/' ? prefix || '/' : `${prefix}${route}`;
      test(`${path}: axe, headings, landmarks, language`, async ({ page }) => {
        await page.goto(path);
        await settle(page);
        expect(await seriousViolations(page)).toEqual([]);

        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect(page.getByRole('main')).toHaveCount(1);
        await expect(page.getByRole('banner')).toHaveCount(1);
        await expect(page.getByRole('contentinfo')).toHaveCount(1);

        // Headings go down one level at a time (a skipped level confuses screen reader users).
        const levels = await page
          .locator('main :is(h1, h2, h3, h4, h5, h6)')
          .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));
        levels.forEach((level, index) => {
          if (index > 0)
            expect(level, `${path}: heading ${index + 1}`).toBeLessThanOrEqual(levels[index - 1]! + 1);
        });

        // Every picture has an alt attribute ("" marks a decorative one).
        const missing = await page.locator('img:not([alt])').count();
        expect(missing, `${path}: images without alt`).toBe(0);
      });
    }
  });
}
