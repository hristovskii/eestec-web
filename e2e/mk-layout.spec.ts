import { expect, test } from '@playwright/test';

// Macedonian is the default language and its words are longer (M13e): on a small phone nothing
// scrolls sideways and no text is cut off by a box that is too narrow.

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
];

test.use({ viewport: { width: 360, height: 800 } });

for (const path of ROUTES) {
  test(`${path} in Macedonian at 360 px: no sideways scroll, no clipped text`, async ({ page }) => {
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/);
    await page.evaluate(() => document.fonts.ready);
    // Everything lazy is on the page before it is measured.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      window.scrollTo(0, 0);
    });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'page is wider than the screen').toBeLessThanOrEqual(0);

    // A box that hides what does not fit and whose content is wider than the box cuts text off.
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main *, header *, footer *')]
        .filter((element) => {
          const style = getComputedStyle(element);
          const hides = ['hidden', 'clip'].includes(style.overflowX);
          // Meant to be cut: scrolling logo rows, the map, screen-reader-only text, truncated lines.
          const meant =
            element.closest('.leaflet-container, [role="group"][aria-label], [aria-hidden="true"]') ||
            style.textOverflow === 'ellipsis' ||
            element.className.toString().includes('sr-only');
          return (
            hides &&
            !meant &&
            (element.textContent ?? '').trim().length > 0 &&
            element.scrollWidth > element.clientWidth + 1
          );
        })
        .map(
          (element) =>
            `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 50)}" in ${element.parentElement?.className.toString().slice(0, 70)}`,
        ),
    );
    expect(clipped, 'text cut off by its box').toEqual([]);
  });
}
