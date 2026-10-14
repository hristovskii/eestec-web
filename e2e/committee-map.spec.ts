import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';

// The committee map (M8a), shown in the component lab until Home arrives (M8c). Other tests add
// committees in the admin, so counts are read from the page, never assumed.

// A transparent 1×1 PNG: tiles come from OpenStreetMap, and a test must not need the internet.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function openMap(page: Page, path = '/en/design-system') {
  const tiles: string[] = [];
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    tiles.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
  });
  await page.goto(path);
  const section = page.locator('#committee-map');
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('.map-pin').first()).toBeAttached();
  return { section, tiles };
}

/** The number in a filter chip: "Observers · 8" → 8. */
const chipCount = async (page: Page, name: RegExp) =>
  Number(/(\d+)\s*$/.exec((await page.getByRole('button', { name }).first().textContent()) ?? '')?.[1]);

test.describe('committee map (M8a)', () => {
  test('draws a pin per committee with a name, the legend, and our popup (CommitteeMap)', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the popup and the legend are the desktop layout');
    const { section, tiles } = await openMap(page);
    const total = await chipCount(page, /^All · \d+$/);
    expect(total).toBeGreaterThanOrEqual(35);
    await expect(section.locator('.map-pin')).toHaveCount(total);

    // Every pin is a named, focusable button.
    const first = section.locator('.map-pin').first();
    await expect(first).toHaveAttribute('role', 'button');
    await expect(first).toHaveAttribute('tabindex', '0');
    await expect(first).toHaveAttribute(
      'aria-label',
      /— .+, (Local Committee|Observer|Junior Local Committee)$/,
    );

    // LC Skopje starts selected, with its popup and the red pin.
    const popup = section.getByRole('dialog', { name: /^LC Skopje/ });
    await expect(popup).toContainText('Skopje, North Macedonia');
    await expect(popup).toContainText('Local Committee');
    await expect(popup.getByRole('link', { name: /eestec\.mk/ })).toHaveAttribute(
      'href',
      'https://eestec.mk',
    );
    await expect(section.getByRole('list', { name: 'Legend' })).toContainText('Junior Local Committee');
    await expect(section.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    await expect(section.getByRole('region', { name: /Map of EESTEC committees/ })).toBeVisible();

    // Tiles come from the one configured provider; no Leaflet marker images are used.
    await expect.poll(() => tiles.length).toBeGreaterThan(0);
    expect(tiles.every((url) => url.startsWith('https://tile.openstreetmap.org/'))).toBe(true);
    expect(await page.evaluate(() => document.querySelectorAll('img.leaflet-marker-icon').length)).toBe(0);
  });

  test('filters by type', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    const { section } = await openMap(page);
    const observers = await chipCount(page, /^Observers · \d+$/);
    await page.getByRole('button', { name: /^Observers · \d+$/ }).click();
    await expect(page.getByRole('button', { name: /^Observers/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(section.locator('.map-pin')).toHaveCount(observers);
    await page.getByRole('button', { name: /^All · \d+$/ }).click();
    await expect(section.locator('.map-pin')).not.toHaveCount(observers);
  });

  test('a pin opens with Enter, takes focus into its popup, and Escape gives it back', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard on desktop');
    const { section } = await openMap(page);
    const pin = section.getByRole('button', { name: 'LC Belgrade — Serbia, Local Committee' });
    await pin.focus();
    await page.keyboard.press('Enter');
    const popup = section.getByRole('dialog', { name: 'LC Belgrade — Serbia, Local Committee' });
    await expect(popup).toContainText('Belgrade, Serbia');
    await expect(popup).toBeFocused();
    // Tab goes on to the close button, which also returns to the pin.
    await page.keyboard.press('Tab');
    await expect(popup.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(pin).toBeFocused();
    // Space works too.
    await page.keyboard.press('Space');
    await expect(popup).toBeVisible();
  });

  test('the same committees as a list: names, places, types and websites', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    const { section } = await openMap(page);
    const total = await chipCount(page, /^All · \d+$/);
    await page.getByRole('button', { name: 'List view' }).click();
    await expect(section.locator('.map-pin')).toHaveCount(0);
    const list = section.getByRole('region', { name: 'All committees' });
    await expect(list.getByRole('listitem')).toHaveCount(total);
    await expect(list.getByRole('listitem').filter({ hasText: 'LC Skopje' })).toContainText('our committee');
    await expect(list.getByRole('listitem').filter({ hasText: 'LC Skopje' })).toContainText(
      'Skopje, North Macedonia',
    );
    await expect(list.getByRole('link', { name: /eestec\.mk/ })).toHaveAttribute('href', 'https://eestec.mk');
    // Filters apply here too; Map brings the map back.
    await page.getByRole('button', { name: /^JLCs · \d+$/ }).click();
    await expect(list.getByRole('listitem').first()).toContainText('Junior Local Committee');
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await expect(section.locator('.map-pin').first()).toBeAttached();
  });

  test('has no serious accessibility violations (map and list)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    const { section } = await openMap(page);
    await expect(section.getByRole('dialog')).toBeVisible();
    await settled(section);
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'List view' }).click();
    await expect(section.getByRole('region', { name: 'All committees' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('phones get a card under the map instead of a popup (Home-Mobile)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the phone layout');
    const { section } = await openMap(page);
    await expect(section.getByRole('dialog')).toHaveCount(0);
    const card = section.getByRole('region', { name: 'Selected committee' });
    await expect(card).toContainText('LC Skopje');
    await expect(card).toContainText('Skopje, North Macedonia · Local Committee');
    await expect(section.getByRole('button', { name: /^LCs · \d+$/ })).toBeVisible();
    // Tap a pin: the card follows.
    await section
      .getByRole('button', { name: 'LC Zagreb — Croatia, Local Committee' })
      .dispatchEvent('click');
    await expect(card).toContainText('LC Zagreb');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('Macedonian is the default language', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    const { section } = await openMap(page, '/design-system');
    await expect(page.getByRole('button', { name: /^Сите · \d+$/ })).toBeVisible();
    await expect(
      section.getByRole('button', { name: 'LC Belgrade — Србија, Локален комитет' }),
    ).toBeAttached();
    await expect(section.getByRole('dialog')).toContainText('Skopje, Северна Македонија');
    await page.getByRole('button', { name: 'Список' }).click();
    await expect(section.getByRole('region', { name: 'Сите комитети' })).toBeVisible();
  });

  test('"Skip the map" jumps past the pins', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard on desktop');
    const { section } = await openMap(page);
    await page.getByRole('button', { name: 'List view' }).focus();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip the map' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#committee-map')).toBeVisible();
    expect(await section.locator('.map-pin:focus').count()).toBe(0);
  });
});
