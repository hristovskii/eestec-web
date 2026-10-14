import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// The For Companies page and the Home partner strip (M11b). The admin tests change the page's text
// for a moment and add switched-off sponsors, so these tests check what stays the same: English
// texts, the logos and the tiers.

async function open(page: Page, path = '/en/partners') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/);
}

/** Lazy images and the faded rows settle before axe looks at colours. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

test.describe('for companies (M11b)', () => {
  test('red top: title, the "Get in touch" button, the offer and who you reach', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meet the engineers of tomorrow');
    await expect(page.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '#contact');
    // The sample offer has no file yet: the button is there, but it can't be used.
    await expect(page.getByRole('button', { name: /Partnership offer \(PDF, 2\.4 MB\)/ })).toBeDisabled();
    const reach = page.getByRole('heading', { level: 2, name: 'Who you reach' }).locator('xpath=..');
    await expect(reach.getByRole('listitem')).toHaveCount(4);
    await expect(reach).toContainText('1,200+');
    await expect(reach).toContainText('students in the EESTEC network');
  });

  test('why partner: four cards', async ({ page }) => {
    await open(page);
    const why = page.getByRole('region', { name: 'What your company gets' });
    await expect(why.getByRole('listitem')).toHaveCount(4);
    await expect(why.getByRole('heading', { level: 3, name: 'Employer branding' })).toBeVisible();
  });

  test('three packages, one marked "Most chosen", single collaborations and the offer', async ({ page }) => {
    await open(page);
    const ways = page.getByRole('region', { name: 'Ways to work together' });
    const gold = ways
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Gold partner' }) });
    await expect(gold).toContainText('Most chosen');
    await expect(gold.getByRole('listitem')).toHaveCount(5);
    await expect(gold.getByRole('link', { name: 'Ask about Gold' })).toHaveAttribute('href', '#contact');
    await expect(ways.getByText('Most chosen')).toHaveCount(1);
    await expect(ways.getByRole('heading', { level: 3, name: 'Main partner' })).toBeVisible();
    await expect(
      ways.getByRole('heading', { level: 3, name: 'Or pick a single collaboration' }),
    ).toBeVisible();
    await expect(ways.getByText('Tech talk', { exact: true })).toBeVisible();
    await expect(ways).toContainText('Partnership offer 2026/27');
    await expect(ways).toContainText('PDF · 2.4 MB · 14 pages');
    // No file in the sample library: no download link, and it says so.
    await expect(ways.getByRole('link', { name: 'Download PDF' })).toHaveCount(0);
    await expect(ways.getByText('sample file, no download yet')).toBeVisible();
  });

  test('the logo wall: tiers in the board’s order, an empty tier left out, logos open in a new tab', async ({
    page,
  }) => {
    await open(page);
    const wall = page.getByRole('region', { name: 'Companies that already work with us' });
    const tiers = await wall.getByRole('heading', { level: 3 }).allInnerTexts();
    expect(tiers.map((name) => name.toLowerCase())).toEqual([
      'main partner',
      'gold partners',
      'partners',
      'media partners',
      'academic partners',
      'past partners',
    ]);
    // Silver has no active partner, so it has no heading.
    await expect(wall.getByRole('heading', { name: 'Silver partners' })).toHaveCount(0);

    const voltline = wall.getByRole('link', { name: 'Voltline (opens in a new tab)' });
    await expect(voltline).toHaveAttribute('href', 'https://voltline.example.com');
    await expect(voltline).toHaveAttribute('target', '_blank');
    await expect(voltline).toHaveAttribute('rel', /noopener/);
    await expect(voltline.getByRole('img', { name: 'Voltline logo' })).toBeVisible();
    // FEEIT and UKIM have no logo and no website: their names, not links.
    await expect(wall.getByRole('list', { name: 'Academic partners' }).getByRole('link')).toHaveCount(0);
    await expect(wall.getByRole('list', { name: 'Academic partners' })).toContainText('FEEIT');
    // On /partners every tier is a plain grid: nothing scrolls by itself.
    await expect(wall.getByRole('button', { name: /scrolling logos/ })).toHaveCount(0);
  });

  test('wide, square and tall logos are sized by area, not by height', async ({ page }) => {
    await open(page);
    const box = async (name: string) => {
      const image = page
        .getByRole('region', { name: 'Companies that already work with us' })
        .getByRole('img', { name });
      await image.scrollIntoViewIfNeeded();
      const rect = await image.boundingBox();
      return { width: rect!.width, height: rect!.height };
    };
    const wide = await box('Gridnova logo');
    const square = await box('Kodra logo');
    const tall = await box('Amperix Systems logo');
    expect(wide.width).toBeGreaterThan(square.width);
    expect(wide.height).toBeLessThan(square.height);
    expect(tall.height).toBeGreaterThanOrEqual(tall.width);
    // The same visual area within the cap of the cell height.
    const area = (rect: { width: number; height: number }) => rect.width * rect.height;
    expect(
      Math.max(area(wide), area(square), area(tall)) / Math.min(area(wide), area(square), area(tall)),
    ).toBeLessThan(1.8);
  });

  test('past partners show the years they were with us', async ({ page }) => {
    await open(page);
    const past = page.getByRole('list', { name: 'Past partners' });
    await expect(past.getByRole('listitem')).toHaveCount(4);
    await expect(past).toContainText('2018–2022');
    await expect(past).toContainText('2019–2024');
    await expect(past.getByRole('link', { name: 'Orbitel (opens in a new tab)' })).toBeVisible();
  });

  test('contact: the person and the address', async ({ page }) => {
    await open(page);
    const contact = page.locator('#contact');
    await expect(contact.getByRole('heading', { level: 2, name: 'Let’s talk' })).toBeVisible();
    await expect(contact).toContainText('Ivana Kostova');
    await expect(contact.getByRole('link', { name: 'partners@eestec.mk' })).toHaveAttribute(
      'href',
      'mailto:partners@eestec.mk',
    );
  });

  test('nothing scrolls sideways, in English and Macedonian', async ({ page }) => {
    for (const path of ['/en/partners', '/partners']) {
      await open(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await expect(page.locator('html')).toHaveAttribute('lang', 'mk');
  });

  test('has no serious accessibility violations (English and Macedonian)', async ({ page }) => {
    await open(page, '/en/partners');
    await settle(page);
    expect(await seriousViolations(page)).toEqual([]);
    await open(page, '/partners');
    await settle(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('Home partner strip (M11b)', () => {
  const strip = (page: Page) => page.getByRole('region', { name: 'Our Partners' });

  test('is the last section: tiers, logos and the link to For Companies', async ({ page }) => {
    await open(page, '/en');
    const section = strip(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('heading', { level: 3, name: 'Main partner' })).toBeVisible();
    await expect(section.getByRole('heading', { level: 3, name: 'Gold partners' })).toBeVisible();
    // Past partners and empty tiers do not show on Home.
    await expect(section.getByRole('heading', { name: /Past partners|Silver/ })).toHaveCount(0);
    await expect(section.getByRole('link', { name: 'Voltline (opens in a new tab)' })).toBeVisible();
    await section.getByRole('link', { name: 'Become a partner' }).click();
    await expect(page).toHaveURL(/\/en\/partners$/);
  });

  test('a tier that does not fit in one row scrolls slowly and has a pause button', async ({
    page,
    isMobile,
  }) => {
    await open(page, '/en');
    const section = strip(page);
    await section.scrollIntoViewIfNeeded();
    // Seven partners: a row that scrolls. Phones scroll anything over two logos.
    const pause = section.getByRole('button', { name: 'Pause scrolling logos' });
    await expect(pause).toHaveCount(isMobile ? 3 : 1);
    const track = section.getByRole('group', { name: 'Partners', exact: true }).locator('ul');
    await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('running');
    // The pause button of the "Partners" row sits next to its heading.
    const own = section.getByRole('heading', { name: 'Partners', exact: true }).locator('xpath=..');
    await own.getByRole('button', { name: 'Pause scrolling logos' }).click();
    await expect(own.getByRole('button', { name: 'Resume scrolling logos' })).toBeVisible();
    await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
    // The second copy of the logos is for the loop only: hidden from screen readers and the tab key.
    const copies = track.locator('li[aria-hidden="true"] a');
    expect(await copies.count()).toBeGreaterThan(0);
    for (const link of await copies.all()) await expect(link).toHaveAttribute('tabindex', '-1');
    // Gold has three logos: a plain row on desktop.
    if (!isMobile) await expect(section.getByRole('group', { name: 'Gold partners' })).toHaveCount(0);
  });

  test('"reduce motion" stops the row and takes the pause button away', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await open(page, '/en');
    const section = strip(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('button', { name: /scrolling logos/ })).toBeHidden();
    const track = section.getByRole('group', { name: 'Partners', exact: true }).locator('ul');
    await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await context.close();
  });

  test('Macedonian Home has the strip too', async ({ page }) => {
    await open(page, '/');
    const section = page.getByRole('region', { name: 'Нашите партнери' });
    await expect(section).toBeVisible();
    await expect(section.getByRole('link', { name: 'Стани партнер' })).toHaveAttribute('href', '/partners');
    await expect(section.getByRole('link', { name: /Voltline \(се отвора во нов таб\)/ })).toBeVisible();
  });
});
