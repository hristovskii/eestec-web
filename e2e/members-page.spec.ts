import { expect, type Page, test } from '@playwright/test';

import { PORT } from './support/servers';
import { seriousViolations } from './support/axe';

// /members (M15b): board, active members, alumni, and who sees which profile. The sample people are
// read-only here (nothing is edited), so these tests can run next to the others.

const asMember = (page: Page) =>
  page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);

const active = (page: Page) => page.locator('#active');
const names = async (page: Page) => await active(page).getByRole('heading', { level: 3 }).allTextContents();
const isMobile = () => test.info().project.name === 'mobile';

test.describe('members page (M15b)', () => {
  test('a visitor sees the board, public members, alumni, and the log-in card', async ({ page }) => {
    await page.goto('/en/members');
    await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    await expect(page.getByText('Are you a member?')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in', exact: true }).last()).toHaveAttribute(
      'href',
      /\/en\/login\?next=\/members/,
    );
    const board = page.locator('#board');
    await expect(board.getByRole('heading', { level: 2, name: 'Board 2026/2027' })).toBeVisible();
    await expect(board.getByRole('link', { name: 'chair@eestec.mk' })).toHaveAttribute(
      'href',
      'mailto:chair@eestec.mk',
    );
    // The board names come from the profiles, in the board's order.
    await expect(board.getByRole('heading', { level: 3 })).toHaveText([
      'Ana Trajkovska',
      'Ivana Kostova',
      'Marko Iliev',
      'Elena Dimitrova',
      'Stefan Nikolovski',
    ]);
    // Members-only people are not listed, only counted, without a name.
    const list = await names(page);
    expect(list).toContain('Daniel Ristov');
    expect(list).not.toContain('Marija Stojanovska');
    await expect(active(page).getByText(/more members? show their profile to members only/)).toBeVisible();
    await expect(active(page).getByRole('link', { name: 'Log in to see them' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Want to see yourself on this page?' })).toBeVisible();
    // Phones show the first four of the nine.
    await expect(page.locator('#alumni').getByRole('heading', { level: 3 })).toHaveCount(isMobile() ? 4 : 9);
  });

  test('a member also sees members-only profiles, with the lock, and no join band', async ({ page }) => {
    await asMember(page);
    await page.goto('/en/members');
    await expect(page.getByText('Hi, Marija')).toBeVisible();
    await expect(page.getByText('Your profile is visible to members only.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit my profile →' })).toHaveAttribute(
      'href',
      '/en/profile',
    );
    await active(page).getByRole('searchbox').fill('Marija');
    const card = active(page).getByRole('link', { name: /Marija Stojanovska/ });
    await expect(card).toBeVisible();
    await expect(card.getByText('Members only')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Want to see yourself on this page?' })).toHaveCount(0);
    await expect(active(page).getByText(/show their profile to members only/)).toHaveCount(0);
  });

  test('search, team, year and sort live in the address and filter the list', async ({ page }) => {
    await asMember(page);
    await page.goto('/en/members');
    const search = active(page).getByRole('searchbox');
    await search.fill('ristov');
    await expect(page).toHaveURL(/q=ristov/);
    await expect.poll(() => names(page)).toEqual(['Biljana Ristovska', 'Daniel Ristov']);
    await search.fill('');
    await expect(page).not.toHaveURL(/q=/);

    await active(page)
      .getByRole('link', { name: /^IT\s*\d/ })
      .click();
    await expect(page).toHaveURL(/team=it/);
    await expect(active(page).getByRole('link', { name: /^IT\s*\d/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    const itTeam = await names(page);
    expect(itTeam).toContain('Nikola Jovanovski');
    expect(itTeam).not.toContain('Marija Stojanovska');

    await page.goto('/en/members?year=2026');
    await expect.poll(async () => (await names(page)).sort()).toEqual(['Damjan Velkov', 'Ivana Mitrevska']);
    await page.goto('/en/members?sort=longest');
    await expect.poll(async () => (await names(page))[0]).toBe('Aleksandar Popov');
    await page.goto('/en/members?sort=newest');
    await expect
      .poll(async () => ['Damjan Velkov', 'Ivana Mitrevska'].includes((await names(page))[0] ?? ''))
      .toBe(true);
  });

  test('pages of 15 keep the filters in the address', async ({ page }) => {
    await asMember(page);
    await page.goto('/en/members');
    await expect(active(page).getByRole('heading', { level: 3 })).toHaveCount(15);
    await expect(active(page).getByText(/Showing\s*1–15\s*of\s*\d+\s*members/)).toBeVisible();
    await active(page).getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(active(page).getByText(/Showing\s*16–/)).toBeVisible();
  });

  test('no match: removable tags, clear all, and the search in alumni', async ({ page }) => {
    await page.goto('/en/members?q=Bojan&team=fr');
    await expect(active(page).getByRole('heading', { name: 'No active members match' })).toBeVisible();
    await expect(active(page).getByText('0 members found')).toBeVisible();
    await expect(active(page).getByRole('link', { name: 'Remove filter: “Bojan”' })).toBeVisible();
    await expect(active(page).getByRole('link', { name: 'Remove filter: FR team' })).toBeVisible();
    await active(page).getByRole('link', { name: 'Search alumni for “Bojan”' }).click();
    await expect(page).toHaveURL(/aq=Bojan/);
    await expect(page.locator('#alumni').getByRole('heading', { level: 3 })).toHaveText(['Bojan Petreski']);
    await page.goto('/en/members?q=Bojan&team=fr');
    await active(page).getByRole('link', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/q=Bojan/);
    await expect(active(page).getByRole('heading', { level: 3 }).first()).toBeVisible();
  });

  test('a past board has no e-mails, the board select keeps the choice in the address', async ({ page }) => {
    await page.goto('/en/members');
    await page.getByLabel('Show board').selectOption('2025/2026');
    await expect(page).toHaveURL(/board=2025%2F2026/);
    const board = page.locator('#board');
    await expect(board.getByRole('heading', { level: 2, name: 'Board 2025/2026' })).toBeVisible();
    await expect(board.getByText('Position e-mails always reach the current board')).toBeVisible();
    await expect(board.getByRole('heading', { level: 3 }).first()).toHaveText('Bojan Petreski');
    await expect(board.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test('alumni: nine first, show all and search', async ({ page }) => {
    await page.goto('/en/members');
    const alumni = page.locator('#alumni');
    await expect(alumni.getByText('9 former members who built LC Skopje.')).toBeVisible();
    // The alumni search is drawn for large screens only.
    if (isMobile()) {
      await expect(alumni.getByRole('searchbox')).toBeHidden();
      return;
    }
    await alumni.getByRole('searchbox').fill('ilievska');
    await expect(page).toHaveURL(/aq=ilievska/);
    await expect(alumni.getByRole('heading', { level: 3 })).toHaveText(['Aleksandra Ilievska']);
    await expect(alumni.getByText('Active 2016–2021')).toBeVisible();
    await expect(alumni.getByText('Now: PhD student, TU Delft')).toBeVisible();
  });

  test('Macedonian page', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('heading', { level: 1, name: 'Членови' })).toBeVisible();
    await expect(
      page.locator('#board').getByRole('heading', { level: 2, name: 'Одбор 2026/2027' }),
    ).toBeVisible();
  });

  test('phone: board rows, two-column grid, no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await asMember(page);
    await page.goto('/en/members');
    const board = page.locator('#board');
    await expect(board.getByRole('heading', { level: 3 }).filter({ visible: true })).toHaveCount(5);
    const cards = active(page).locator('a[href*="/members/"]');
    const first = cards.nth(0);
    const second = cards.nth(1);
    const a = await first.boundingBox();
    const b = await second.boundingBox();
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Year and sort are drawn on large screens only.
    await expect(page.getByLabel('Year joined')).toBeHidden();
  });

  test('has no serious accessibility violations (visitor, member, empty)', async ({ page }) => {
    for (const path of ['/en/members', '/en/members?q=zzzz']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
      expect(await seriousViolations(page), path).toEqual([]);
    }
    await asMember(page);
    await page.goto('/en/members');
    await expect(page.getByText('Hi, Marija')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
