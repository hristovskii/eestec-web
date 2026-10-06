import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';
import { PORT } from './support/servers';

// Public /events and /events/[slug] (M6), with the clock pinned to 4 Oct 2026, 18:18.
// Tests that change data create their own events in the admin.

const cardTitles = (page: Page) => page.locator('#events-panel h2');

async function signInAs(page: Page, persona: 'super-admin') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

/** Creates and publishes an event in the admin; returns its address. */
async function publishEvent(page: Page, { title, day }: { title: string; day: string }) {
  await signInAs(page, 'super-admin');
  await page.goto('/admin/events/new');
  const field = (path: string) => page.locator(`#e-new-${path}`);
  await field('title').fill(title);
  await field('shortDescription').fill('A sample event created by the tests.');
  await field('location').fill('FEEIT, Skopje');
  await field('startsAt').fill(day);
  await field('endsAt').fill(day);
  const slug = await field('slug').inputValue();
  await page.getByRole('region', { name: 'Save' }).getByRole('button', { name: 'Publish' }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Published' })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/events\/ev-/);
  return slug;
}

test.describe('events archive (M6)', () => {
  test('lists past local events, newest first, with tab counts (EventsList)', async ({ page }) => {
    await page.goto('/en/events');
    await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
    await expect(page.getByText(/events since 2024\./)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Local( Events)? \d+$/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Other tests add events that ended recently, so check the order of the sample ones.
    const titles = await cardTitles(page).allTextContents();
    expect(titles.indexOf('RoboMac 2026')).toBeGreaterThan(titles.indexOf('Soft Skills Academy Skopje 2026'));
    expect(titles).toContain('Soft Skills Academy Skopje 2026');
    // Hidden (by link only), drafts and upcoming events are not listed.
    await expect(page.getByRole('heading', { name: 'FEEIT Career Day 2026' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'New Year Social 2026' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Hands-on: FPGA Basics' })).toHaveCount(0);
    const robomac = page.getByRole('link', { name: /RoboMac 2026/ });
    await expect(robomac).toContainText('11 Apr 2026');
    await expect(robomac).toContainText('Organized by LC Skopje');
    await expect(page.getByText(/Showing 1–12 of \d+ local events/)).toBeVisible();

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('tabs, type chips, year, sort and pages live in the URL', async ({ page, isMobile }) => {
    await page.goto('/en/events?tab=international');
    await expect(cardTitles(page)).toContainText(['Workshop: Power Up — Renewable Grids']);

    await page.goto('/en/events');
    if (!isMobile) {
      await page
        .getByRole('group', { name: 'Filter by type' })
        .getByRole('link', { name: 'Competition' })
        .click();
      await expect(page).toHaveURL(/type=competition/);
      await expect(cardTitles(page)).toContainText(['RoboMac 2026']);
      await page.getByLabel('Year').selectOption('2025');
      await expect(page).toHaveURL(/year=2025/);
      await expect(cardTitles(page)).toHaveText([
        'RoboMac 2025',
        'EESTech Challenge 2025 — Local Round Skopje',
      ]);
      await page.locator('#ev-sort').selectOption('title');
      await expect(page).toHaveURL(/sort=title/);
      await expect(cardTitles(page).first()).toHaveText('EESTech Challenge 2025 — Local Round Skopje');
    }

    // Other tests add and delete events: page through whatever is there.
    await page.goto('/en/events');
    const status = await page
      .getByRole('status')
      .filter({ hasText: /^Showing/ })
      .textContent();
    const total = Number(/of (\d+)/.exec(status ?? '')?.[1]);
    test.skip(total <= 12, 'fewer than two pages of local events right now');
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 13–\d+ of \d+ local events/)).toBeVisible();
    await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
  });

  test('search with no results shows the designed empty state (EventsList-Empty)', async ({ page }) => {
    await page.goto('/en/events');
    await page.getByLabel('Search events by title').fill('hackathon');
    await expect(page).toHaveURL(/q=hackathon/);
    await expect(page.getByRole('heading', { name: 'No events match your search' })).toBeVisible();
    await expect(
      page.getByText("We couldn't find a local event called “hackathon”.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Remove filter: “hackathon”' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Search International Events' })).toHaveAttribute(
      'href',
      '/en/events?tab=international&q=hackathon',
    );
    await page.getByRole('link', { name: 'Clear all filters' }).click();
    await expect(page).toHaveURL(/\/en\/events$/);
    await expect(page.getByRole('heading', { name: 'Soft Skills Academy Skopje 2026' })).toBeVisible();
  });

  test('phones filter in a bottom sheet (EventsList-Mobile-Filters)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the sheet is the phone layout');
    await page.goto('/en/events');
    await page.getByRole('button', { name: 'Filters' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await sheet.getByRole('link', { name: 'Competition' }).click();
    await expect(page).toHaveURL(/type=competition/);
    await expect(sheet.getByRole('button', { name: /^Show \d+ events?$/ })).toBeVisible();
    await settled(sheet);
    expect(await seriousViolations(page)).toEqual([]);
    await sheet.getByRole('button', { name: /^Show/ }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: 'Filters, 1 active' })).toBeVisible();
  });

  test('Macedonian is the default language', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByRole('heading', { level: 1, name: 'Настани' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Локални/ })).toBeVisible();
  });
});

test.describe('event page (M6)', () => {
  test('shows details, description, gallery and neighbours (EventDetail)', async ({ page }) => {
    await page.goto('/en/events/power-up-2026');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Workshop: Power Up — Renewable Grids' }),
    ).toBeVisible();
    const details = page.getByRole('complementary', { name: 'Event details' });
    if (await details.isVisible()) {
      await expect(details).toContainText('18–24 May 2026 · 7 days');
      await expect(details).toContainText('24 students from 14 countries');
      await expect(details).toContainText('Workshop · International');
    }
    await expect(page.getByRole('heading', { level: 2, name: 'About the workshop' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Photo gallery' })).toBeVisible();
    const more = page.getByRole('navigation', { name: 'More events' });
    await expect(more.getByRole('link', { name: /Previous event/ })).toHaveAttribute(
      'href',
      '/en/events/delft-by-bike',
    );
    await expect(more.getByRole('link', { name: /Next event/ })).toHaveAttribute(
      'href',
      '/en/events/soft-skills-academy-2026',
    );

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the lightbox opens at a photo and browses with the keyboard', async ({ page }) => {
    await page.goto('/en/events/power-up-2026');
    await page.getByRole('button', { name: 'Open photo: Team presentations' }).click();
    const lightbox = page.getByRole('dialog', { name: /Workshop: Power Up/ });
    await expect(lightbox).toContainText('Team presentations · Photo: Ana Trajkovska');
    await expect(lightbox.getByRole('button', { name: 'Photo 5' })).toHaveAttribute('aria-current', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(lightbox).toContainText('International night');
    await settled(lightbox);
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
  });

  test('a minimal event hides empty sections (EventDetail-Minimal)', async ({ page }) => {
    await page.goto('/en/events/power-grid-lecture');
    await expect(page.getByRole('heading', { level: 2, name: 'About the lecture' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Photo gallery' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Aftermovie' })).toHaveCount(0);
    await expect(page.getByText('Mon 9 Dec 2024, 18:00').filter({ visible: true })).toBeVisible();
    await expect(
      page.getByText('FEEIT Student Parliament, with LC Skopje').filter({ visible: true }),
    ).toBeVisible();
  });

  test('hidden events open by link; drafts and unknown addresses are 404', async ({ page }) => {
    await page.goto('/en/events/feeit-career-day-2026');
    await expect(page.getByRole('heading', { level: 1, name: 'FEEIT Career Day 2026' })).toBeVisible();
    await page.goto('/en/events/no-such-event');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.goto('/en/events/new-year-social-2026');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('an event that just ended says so, on the page and its card (EventDetail-Ended)', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'creates sample data: run once');
    const title = `Just ended ${Date.now() % 100_000}`;
    const slug = await publishEvent(page, { title, day: '2026-10-03' });
    await page.goto(`/en/events/${slug}`);
    await expect(page.getByText('Just ended').filter({ visible: true }).first()).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'This event ended on 3 Oct 2026' }),
    ).toBeVisible();
    await page.goto(`/en/events?q=${encodeURIComponent(title.toLowerCase())}`);
    await expect(page.getByRole('link', { name: new RegExp(title) })).toContainText('Just ended');
  });

  test('an old address redirects (301) to the new one', async ({ page, isMobile }) => {
    test.skip(isMobile, 'creates sample data: run once');
    const slug = await publishEvent(page, { title: `Renamed ${Date.now() % 100_000}`, day: '2026-03-01' });
    // The /new form stays mounted (hidden) for back / forward: use the edit form's field.
    await page.locator('[id^="e-ev-"][id$="-slug"]').fill(`${slug}-new`);
    await page
      .getByRole('region', { name: 'Save' })
      .getByRole('button', { name: 'Update live page' })
      .click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Live page updated' })).toBeVisible();
    const response = await page.request.get(`/en/events/${slug}`, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toMatch(new RegExp(`/en/events/${slug}-new$`));
  });

  test('events that have not ended live under /upcoming', async ({ page }) => {
    const response = await page.request.get('/en/events/ai-at-the-edge', { maxRedirects: 0 });
    expect([303, 307, 308]).toContain(response.status());
    expect(response.headers().location).toMatch(/\/en\/upcoming\/ai-at-the-edge$/);
  });
});
