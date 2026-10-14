import { expect, test } from '@playwright/test';

// Image budgets (M13d, docs/ARCHITECTURE.md): what is served is small, only the first screen's
// images load eagerly, and every image can be sized by the browser before it arrives.

const PAGES = [
  '/en',
  '/en/events',
  '/en/events/power-up-2026',
  '/en/upcoming',
  '/en/upcoming/ai-at-the-edge',
  '/en/journey',
  '/en/partners',
  '/en/contact',
];
/** Largest image the optimiser may send, in bytes (a hero cover). Cards and thumbnails are smaller. */
const MAX_SERVED_BYTES = 250_000;

for (const path of PAGES) {
  test(`${path}: served images fit the budget, load lazily and can be sized before they arrive`, async ({
    page,
  }) => {
    const served: { url: string; bytes: number }[] = [];
    page.on('response', (response) => {
      if (!response.url().includes('/_next/image')) return;
      void response.body().then((body) => served.push({ url: response.url(), bytes: body.length }));
    });
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto(path);
    // Scroll to the bottom in steps so lazy images load too.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    for (const image of served) expect(image.bytes, image.url).toBeLessThanOrEqual(MAX_SERVED_BYTES);

    const images = await page
      .locator('main img:not(.leaflet-tile), header img:not(.leaflet-tile), footer img:not(.leaflet-tile)')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const img = node as HTMLImageElement;
          return {
            src: img.currentSrc || img.src,
            alt: img.getAttribute('alt'),
            lazy: img.loading === 'lazy',
            priority: img.getAttribute('fetchpriority') === 'high',
            // Either the size is written on the tag, or the image fills a box that has its own size.
            sized:
              (img.hasAttribute('width') && img.hasAttribute('height')) ||
              (getComputedStyle(img).position === 'absolute' && img.hasAttribute('sizes')),
          };
        }),
      );
    for (const image of images) {
      expect(image.alt, `${image.src} has an alt attribute`).not.toBeNull();
      expect(image.sized, `${image.src} has a size or fills a sized box`).toBe(true);
    }
    // At most the logo and one first-screen picture are eager; everything else waits.
    const eager = images.filter((image) => !image.lazy);
    expect(eager.length, `eager images: ${eager.map((image) => image.src).join(', ')}`).toBeLessThanOrEqual(
      3,
    );
  });
}
