import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// The Contact page (M12b): details, board e-mails, map, social links and legal info. The admin
// tests change the page's title and subjects for a moment, so these tests check what stays the
// same.  The form has its own spec.

// A transparent 1×1 PNG: tiles come from OpenStreetMap, and a test must not need the internet.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function open(page: Page, path = '/en/contact') {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/);
  // The map loads when it is about to be seen (Leaflet is not part of the page load).
  await page.locator('[aria-labelledby="contact-map-title"]').scrollIntoViewIfNeeded();
  await expect(page.locator('.map-pin').first()).toBeAttached();
}

/** Fonts, the map and the pin settle before axe looks at colours. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

test.describe('contact page (M12b)', () => {
  test('top: shortcut cards to Join Us and For Companies', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('link', { name: /Want to join\?\s*Join Us →/ })).toHaveAttribute(
      'href',
      '/en/join',
    );
    await expect(page.getByRole('link', { name: /A company\?\s*For Companies →/ })).toHaveAttribute(
      'href',
      '/en/partners',
    );
  });

  test('contact info comes from Settings, and the board e-mails are links', async ({ page }) => {
    await open(page);
    const info = page.getByRole('complementary', { name: 'Contact information' });
    await expect(info.getByRole('link', { name: 'hello@eestec.mk' })).toHaveAttribute(
      'href',
      'mailto:hello@eestec.mk',
    );
    await expect(info).toContainText('FEEIT, Rugjer Boshkovikj 18, 1000 Skopje');
    await expect(info).toContainText('Room 117, ground floor, FEEIT');
    await expect(info).toContainText('Weekly meeting: Wednesdays, 18:00');
    const board = info
      .getByRole('heading', { level: 2, name: 'Write to a board member' })
      .locator('xpath=..');
    await expect(board.getByRole('term')).toHaveText([
      'Chairperson',
      'External relations & partners',
      'Membership & internal affairs',
      'Treasurer',
      'PR & media',
    ]);
    await expect(board.getByRole('link', { name: 'partners@eestec.mk' })).toHaveAttribute(
      'href',
      'mailto:partners@eestec.mk',
    );
  });

  test('map: one pin with its label, the place card and links to a map app', async ({ page, isMobile }) => {
    await open(page);
    const map = page.getByRole('region', { name: /^Map of FEEIT/ });
    await expect(map.locator('.map-pin')).toHaveCount(1);
    await expect(map.locator('.map-pin')).toHaveAttribute('aria-label', 'FEEIT · Room 117');
    await expect(map.locator('.map-label')).toHaveText('FEEIT · Room 117');
    const section = page.getByRole('region', { name: 'How to find us' });
    const directions = section.getByRole('link', { name: /Get directions/ }).filter({ visible: true });
    await expect(directions).toHaveAttribute(
      'href',
      /google\.com\/maps\/dir\/\?api=1&destination=42\.\d+,21\.\d+/,
    );
    await expect(directions).toHaveAttribute('target', '_blank');
    await expect(directions).toHaveAttribute('rel', /noopener/);
    await expect(
      section.getByText('FEEIT, Ss. Cyril and Methodius University').filter({ visible: true }),
    ).toBeVisible();
    // "Open in Maps" is on the card over the map, which phones do not have.
    if (!isMobile) await expect(section.getByRole('link', { name: /Open in Maps/ })).toBeVisible();
  });

  test('follow us: the three profiles open in a new tab', async ({ page }) => {
    await open(page);
    const social = page.getByRole('region', { name: 'Follow us' });
    await expect(social.getByRole('link')).toHaveCount(3);
    const instagram = social.getByRole('link', { name: /Instagram/ });
    await expect(instagram).toHaveAttribute('href', 'https://instagram.com/eestec_skopje');
    await expect(instagram).toHaveAttribute('target', '_blank');
    await expect(instagram).toHaveAttribute('rel', /noopener/);
    await expect(instagram).toContainText('@eestec_skopje');
  });

  test('legal info: the sample rows, copy buttons on the numbers only, and the statute link', async ({
    page,
  }) => {
    await open(page);
    const legal = page.getByRole('region', { name: 'Legal info' });
    await expect(legal.getByRole('term')).toHaveText([
      'Full registered name',
      'Short name',
      'Registration no. (EMBS)',
      'Tax no. (EDB)',
      'Bank account',
      'Registered seat',
    ]);
    await expect(legal.getByRole('button')).toHaveCount(3);
    await expect(legal.getByRole('link', { name: /Statute and internal rules/ })).toHaveAttribute(
      'href',
      '/en/join#rules',
    );
  });

  test('copy buttons copy the value and say so', async ({ page, context, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are a Chromium feature');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    const legal = page.getByRole('region', { name: 'Legal info' });
    await legal.getByRole('button', { name: 'Copy Registration no. (EMBS)' }).click();
    await expect(legal.getByRole('status').filter({ hasText: 'Copied' })).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('[0000000]');
    if (!isMobile) {
      await page.getByRole('button', { name: 'Copy e-mail address' }).click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('hello@eestec.mk');
    }
  });

  test('phones: nothing scrolls sideways and the e-mail has no copy button', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the phone layout');
    await open(page);
    await expect(page.getByRole('button', { name: 'Copy e-mail address' })).toBeHidden();
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1]!);
  });

  test('Macedonian: the labels are translated', async ({ page }) => {
    await open(page, '/contact');
    await expect(page.getByText('Главна е-пошта')).toBeVisible();
    await expect(page.getByRole('region', { name: /^Карта:/ })).toBeVisible();
    await expect(page.getByRole('term').filter({ hasText: 'Даночен број (ЕДБ)' })).toBeVisible();
  });

  test('passes axe', async ({ page }) => {
    await open(page);
    await settle(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
