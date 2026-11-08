import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// /memories and /memories/<slug> (M17b): the list with its filters, a post with its photos, the
// former-member variant, the author's own previews, and the places Memories show up (Home, an event,
// a profile). Read-only: the sample Memories are shared by every test.

const asMember = (page: Page) =>
  page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);

const LAB_DAY = '/en/memories/power-up-the-lab-day-i-did-not-expect';

test.describe('memories list (M17b)', () => {
  test('lists the published Memories with the intro and the share card', async ({ page }) => {
    await page.goto('/en/memories');
    await expect(page.getByRole('heading', { level: 1, name: 'EESTEC Memories' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Been to an EESTEC event?' })).toBeVisible();
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { level: 2, name: 'Five days in Delft, zero days of sun' }),
    ).toBeVisible();
    // Drafts, waiting and not approved Memories are never listed.
    await expect(main.getByText('Notes from the RoboMac jury table')).toHaveCount(0);
    await expect(main.getByText('Seven days, 28 nationalities')).toHaveCount(0);
    await expect(main.getByText('Kraków in the snow')).toHaveCount(0);
  });

  test('a visitor who shares a memory is asked to log in or send an impression', async ({ page }) => {
    await page.goto('/en/memories');
    await expect(page.getByRole('button', { name: 'Share your memory' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Share your memory' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Memories are written by members' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Log in to write a Memory' })).toHaveAttribute(
      'href',
      '/en/login?next=/memories/new',
    );
    await expect(dialog.getByRole('link', { name: 'Send a quick impression' })).toHaveAttribute(
      'href',
      '/en/submit?tab=impression',
    );
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('a member goes straight to the editor', async ({ page }) => {
    await asMember(page);
    await page.goto('/en/memories');
    await expect(page.getByRole('link', { name: 'Share your memory' }).first()).toHaveAttribute(
      'href',
      '/en/memories/new',
    );
  });

  test('filters live in the URL, show removable tags and a designed empty state', async ({ page }) => {
    await page.goto('/en/memories?place=Tallinn%2C+Estonia');
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { level: 2, name: 'A week in Tallinn and a very good sauna' }),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { level: 2, name: 'Five days in Delft, zero days of sun' }),
    ).toHaveCount(0);

    await page.goto('/en/memories?q=zzzz-nothing');
    await expect(page.getByText('0 Memories found')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'No Memories match these filters' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Clear all' }).click();
    await expect(page).toHaveURL(/\/en\/memories$/);

    await page.goto('/en/memories?place=Atlantis%2C+Nowhere');
    await expect(
      page.getByRole('heading', { level: 2, name: 'No Memories from Atlantis, Nowhere yet' }),
    ).toBeVisible();
  });

  test('searching and choosing an event narrows the list', async ({ page }) => {
    await page.goto('/en/memories');
    await page.getByRole('searchbox').fill('sauna');
    await expect(page).toHaveURL(/q=sauna/);
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { level: 2, name: 'A week in Tallinn and a very good sauna' }),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { level: 2, name: 'Five days in Delft, zero days of sun' }),
    ).toHaveCount(0);

    await page.goto('/en/memories?event=power-up-2026&sort=oldest');
    await expect(page.locator('#memories-panel').getByRole('heading', { level: 2 })).toHaveCount(2);
    await expect(page.getByText(/oldest first/).first()).toBeVisible();
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await page.goto('/en/memories');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('memory post (M17b)', () => {
  test('shows the story, the photos, the event, the author and more from the event', async ({ page }) => {
    await page.goto(LAB_DAY);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Power Up: the lab day I did not expect' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Daniel Ristov' }).first()).toHaveAttribute(
      'href',
      '/en/members/daniel-ristov',
    );
    await expect(page.getByText('Happened 20 May 2026')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Photos' })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'More Memories from this event' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 3, name: 'What 24 students taught me about the power grid' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'About the event' })).toBeVisible();
    // Reads: a page for everyone is indexed; share links go out to the sharing pages.
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Share on LinkedIn' })).toHaveAttribute(
      'href',
      /linkedin\.com\/sharing\/share-offsite\/\?url=/,
    );
  });

  test('the photos open in the lightbox and close again', async ({ page }) => {
    await page.goto(LAB_DAY);
    await page
      .getByRole('button', { name: /Open photo/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/1 (of|\/) 7/).locator('visible=true')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByText(/2 (of|\/) 7/).locator('visible=true')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('a Memory by a deleted account is by "A former member", with no name, link or photo', async ({
    page,
  }) => {
    await page.goto('/en/memories/a-night-train-and-a-bakery-in-prague');
    await expect(
      page.getByRole('heading', { level: 1, name: 'A night train and a bakery in Prague' }),
    ).toBeVisible();
    await expect(page.getByText('A former member').first()).toBeVisible();
    await expect(page.getByText('Former member of LC Skopje')).toBeVisible();
    await expect(page.getByText(/has left and deleted their account/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'View profile →' })).toHaveCount(0);
  });

  test('a draft, a waiting Memory and an unknown address are not public', async ({ page }) => {
    for (const slug of [
      'seven-days-28-nationalities-and-one-very-long-bus-ride-to-ohrid',
      'krakow-in-the-snow-part-two',
      'does-not-exist',
    ]) {
      await page.goto(`/en/memories/${slug}`);
      await expect(page.getByRole('heading', { name: /not found|can.t find/i }).first()).toBeVisible();
    }
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await page.goto(LAB_DAY);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the author sees their own waiting Memory as a preview and changes waiting on a live one', async ({
    page,
  }) => {
    await asMember(page);
    // Marija's Memory waiting for the board: only she can open it.
    await page.goto('/en/memories/seven-days-28-nationalities-and-one-very-long-bus-ride-to-ohrid');
    await expect(page.getByText('Waiting for the board')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /Seven days, 28 nationalities/ })).toBeVisible();
    // Her published Memory has changes waiting: readers see the live text, she sees a note.
    await page.goto('/en/memories/five-days-in-delft-zero-days-of-sun');
    await expect(page.getByText('Changes waiting for review')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See my changes' })).toBeVisible();
    await expect(page.getByText('A note for anyone going next year')).toHaveCount(0);
  });
});

test.describe('where Memories show up (M17b)', () => {
  test('Home has a Memories row', async ({ page }) => {
    await page.goto('/en');
    const row = page.getByRole('region', { name: 'Memories', exact: true });
    await expect(row.getByRole('link', { name: /Read all/ }).first()).toHaveAttribute('href', '/en/memories');
    await expect(
      row.getByRole('heading', { level: 3, name: 'Power Up: the lab day I did not expect' }),
    ).toBeVisible();
  });

  test('an event page lists the Memories written about it', async ({ page }) => {
    await page.goto('/en/events/power-up-2026');
    const row = page.getByRole('region', { name: 'Memories from this event' });
    await expect(
      row.getByRole('heading', { level: 3, name: 'Power Up: the lab day I did not expect' }),
    ).toBeVisible();
    await expect(
      row.getByRole('heading', { level: 3, name: 'What 24 students taught me about the power grid' }),
    ).toBeVisible();
  });

  test('a profile lists the Memories its person wrote; a members-only profile hides them from visitors', async ({
    page,
  }) => {
    await page.goto('/en/members/daniel-ristov');
    const row = page.getByRole('region', { name: 'Memories by Daniel Ristov' });
    await expect(
      row.getByRole('heading', { level: 3, name: 'A week in Tallinn and a very good sauna' }),
    ).toBeVisible();
    // Marija's profile is members-only: a visitor sees the lock, not her Memories.
    await page.goto('/en/members/marija-stojanovska');
    await expect(page.getByText('Members-only profile')).toBeVisible();
    await expect(page.getByRole('region', { name: /Memories by/ })).toHaveCount(0);
  });

  test('the sitemap lists published Memories only', async ({ request }) => {
    const text = await (await request.get('/sitemap.xml')).text();
    expect(text).toContain('/memories/power-up-the-lab-day-i-did-not-expect');
    expect(text).not.toContain('krakow-in-the-snow-part-two');
  });
});
