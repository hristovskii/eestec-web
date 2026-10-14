import { expect, type Page, test } from '@playwright/test';

// Search and sharing (M13a): robots.txt, sitemap.xml, canonical + hreflang, Open Graph and Twitter
// tags. The e2e server runs with member accounts on, so their pages are in the sitemap here; the
// Phase 1 list is a unit test (settings/seo-paths.test.ts).

const head = (page: Page, selector: string, attribute: string) =>
  page
    .locator(selector)
    .evaluateAll((nodes, name) => nodes.map((node) => node.getAttribute(name)), attribute);

const path = (url: string | null | undefined) => (url ? new URL(url).pathname : null);

test.describe('robots.txt and sitemap.xml (M13a)', () => {
  test('robots.txt opens the site, closes the admin and the API, and points at the sitemap', async ({
    request,
  }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toContain('User-Agent: *');
    expect(body).toContain('Allow: /');
    for (const closed of ['/admin', '/api/', '/design-system']) expect(body).toContain(`Disallow: ${closed}`);
    expect(body).toMatch(/Sitemap: https?:\/\/[^/]+\/sitemap\.xml/);
  });

  test('the sitemap lists pages and listed events in both languages, with hreflang', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => path(match[1]));
    for (const page of ['/', '/en', '/events', '/en/events', '/contact', '/en/partners', '/privacy'])
      expect(urls).toContain(page);
    // An upcoming event is listed under /upcoming, a past one under /events, never both.
    expect(urls).toContain('/upcoming/ai-at-the-edge');
    expect(urls).toContain('/en/upcoming/ai-at-the-edge');
    expect(urls).not.toContain('/events/ai-at-the-edge');
    expect(urls).toContain('/events/robomac-2025');
    expect(urls).not.toContain('/upcoming/robomac-2025');
    // Drafts and hidden events stay out, and so does everything that is not for search engines.
    for (const unlisted of ['new-year-social-2026', 'eestech-challenge-2027', 'feeit-career-day-2026'])
      expect(urls.some((url) => url?.endsWith(`/${unlisted}`))).toBe(false);
    expect(urls.some((url) => /^\/(en\/)?(admin|api|design-system)/.test(url ?? ''))).toBe(false);
    expect(xml).toContain('hreflang="en"');
    expect(xml).toContain('hreflang="mk"');
    // No invented dates.
    expect(xml).not.toContain('<lastmod>');
  });
});

test.describe('canonical, hreflang and social tags (M13a)', () => {
  test('a Macedonian page is canonical at its own address and names English as the alternate', async ({
    page,
  }) => {
    await page.goto('/contact');
    expect(await head(page, 'link[rel="canonical"]', 'href').then((hrefs) => hrefs.map(path))).toEqual([
      '/contact',
    ]);
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((nodes) =>
        nodes.map((node) => [node.getAttribute('hreflang'), node.getAttribute('href')]),
      );
    expect(alternates.map(([lang, href]) => [lang, path(href)])).toEqual([
      ['mk', '/contact'],
      ['en', '/en/contact'],
      ['x-default', '/contact'],
    ]);
    expect(await head(page, 'meta[property="og:locale"]', 'content')).toEqual(['mk_MK']);
    expect(await head(page, 'meta[property="og:locale:alternate"]', 'content')).toEqual(['en_US']);
  });

  test('the English page is canonical under /en, and Home is "/" and "/en"', async ({ page }) => {
    await page.goto('/en/contact');
    expect((await head(page, 'link[rel="canonical"]', 'href')).map(path)).toEqual(['/en/contact']);
    await page.goto('/en');
    expect((await head(page, 'link[rel="canonical"]', 'href')).map(path)).toEqual(['/en']);
    await page.goto('/');
    expect((await head(page, 'link[rel="canonical"]', 'href')).map(path)).toEqual(['/']);
  });

  test('Open Graph and Twitter: type, site name, URL, image with size and alt, large card', async ({
    page,
  }) => {
    await page.goto('/en/partners');
    expect(await head(page, 'meta[property="og:type"]', 'content')).toEqual(['website']);
    expect(await head(page, 'meta[property="og:site_name"]', 'content')).toEqual(['EESTEC LC Skopje']);
    expect((await head(page, 'meta[property="og:url"]', 'content')).map(path)).toEqual(['/en/partners']);
    // No share image set by the board: the brand image stands in, with its real size.
    expect((await head(page, 'meta[property="og:image"]', 'content')).map(path)).toEqual([
      '/brand/LC_Skopje_red_background.png',
    ]);
    expect(await head(page, 'meta[property="og:image:width"]', 'content')).toEqual(['4167']);
    expect(await head(page, 'meta[property="og:image:alt"]', 'content')).toEqual(['EESTEC LC Skopje']);
    expect(await head(page, 'meta[name="twitter:card"]', 'content')).toEqual(['summary_large_image']);
  });

  test('an event page is canonical at its current address', async ({ page }) => {
    await page.goto('/en/upcoming/ai-at-the-edge');
    expect((await head(page, 'link[rel="canonical"]', 'href')).map(path)).toEqual([
      '/en/upcoming/ai-at-the-edge',
    ]);
    expect((await head(page, 'link[rel="alternate"][hreflang="mk"]', 'href')).map(path)).toEqual([
      '/upcoming/ai-at-the-edge',
    ]);
    await page.goto('/events/robomac-2025');
    expect((await head(page, 'link[rel="canonical"]', 'href')).map(path)).toEqual(['/events/robomac-2025']);
  });

  test('the admin panel and the 404 page are kept out of search', async ({ page, request }) => {
    const admin = await request.get('/admin/login');
    expect(admin.headers()['x-robots-tag']).toContain('noindex');
    await page.goto('/does-not-exist');
    expect(await head(page, 'meta[name="robots"]', 'content')).toContain('noindex');
  });
});
