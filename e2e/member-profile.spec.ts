import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// /members/<username> (M15c): a public profile, the restricted view of a members-only one, alumni,
// and the pages that do not exist. Read-only, like members-page.spec.ts.

const asMember = (page: Page) =>
  page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);

test.describe('member profile (M15c)', () => {
  test('a public profile: hero, facts, about, events, badges', async ({ page }) => {
    await page.goto('/en/members/daniel-ristov');
    await expect(page.getByRole('heading', { level: 1, name: 'Daniel Ristov' })).toBeVisible();
    await expect(page.getByText('Member since October 2024')).toBeVisible();
    await expect(page.getByText('Events team', { exact: true })).toBeVisible();
    await expect(page.getByText('IT team', { exact: true })).toBeVisible();
    // Nothing is written for him: no About, no Events, no Badges (optional sections hide).
    await expect(page.getByRole('heading', { level: 2, name: 'About' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Events' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Badges' })).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('link', { name: /LinkedIn/ })).toHaveCount(0);
    // Public: search engines may list it.
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page).toHaveTitle(/Daniel Ristov · Members/);
  });

  test('a visitor opening a members-only profile sees the name, the team and a log-in card only', async ({
    page,
  }) => {
    await page.goto('/en/members/marija-stojanovska');
    await expect(page.getByRole('heading', { level: 1, name: 'Marija Stojanovska' })).toBeVisible();
    await expect(page.getByText('Members-only profile')).toBeVisible();
    await expect(page.getByText('Events team', { exact: true })).toBeVisible();
    await expect(page.getByText('Member since October 2023')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Marija shares their profile with members only' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in' }).last()).toHaveAttribute(
      'href',
      '/en/login?next=/members/marija-stojanovska',
    );
    // None of what is private reaches the page, not even hidden.
    const html = await page.content();
    for (const secret of ['burek', 'linkedin.com/in', 'AI at the Edge', 'Helped organize']) {
      expect(html).not.toContain(secret);
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('a member sees the whole profile: bio, links, events, badges', async ({ page }) => {
    await asMember(page);
    await page.goto('/en/members/marija-stojanovska');
    await expect(page.getByText('Members-only profile')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'About' })).toBeVisible();
    await expect(page.getByText(/best burek near the faculty/)).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/marija-stojanovska',
    );
    await expect(page.getByRole('main').getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'target',
      '_blank',
    );
    await expect(page.getByRole('main').getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/marijas',
    );
    await expect(page.getByRole('heading', { level: 2, name: 'Badges' }).first()).toBeVisible();
    await expect(page.getByText('Helped organize 3 events').first()).toBeAttached();
    await expect(page.getByRole('button', { name: 'Copy profile link' })).toBeVisible();
    // The three Events tabs count what is on the profile.
    const tabs = page.getByRole('navigation', { name: 'Events' });
    await expect(tabs.getByRole('link', { name: /^All\s*4/ })).toBeVisible();
    await expect(tabs.getByRole('link', { name: /^Organized\s*3/ })).toBeVisible();
    await expect(tabs.getByRole('link', { name: /^Attended\s*1/ })).toBeVisible();
  });

  test('events: tabs in the address, each row links to its event page', async ({ page }) => {
    await asMember(page);
    await page.goto('/en/members/marija-stojanovska');
    const events = page.locator('#events');
    await expect(events.getByRole('link', { name: /Workshop: AI at the Edge/ })).toHaveAttribute(
      'href',
      '/en/upcoming/ai-at-the-edge',
    );
    await expect(events.getByRole('link', { name: /EESTech Challenge 2025/ })).toHaveAttribute(
      'href',
      '/en/events/eestech-challenge-2025',
    );
    await events.getByRole('link', { name: /^Attended/ }).click();
    await expect(page).toHaveURL(/events=attended/);
    await expect(events.getByRole('link', { name: /EESTech Challenge 2025/ })).toBeVisible();
    await expect(events.getByRole('link', { name: /AI at the Edge/ })).toHaveCount(0);
    await expect(events.getByText('Participant')).toBeVisible();
    await page.goto('/en/members/marija-stojanovska?events=organized');
    await expect(events.getByText('Organizer')).toHaveCount(3);
  });

  test('copy profile link says so', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: `http://localhost:${PORT}`,
    });
    await asMember(page);
    await page.goto('/en/members/marija-stojanovska');
    await page.getByRole('button', { name: 'Copy profile link' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeAttached();
  });

  test('an alumnus: years and the board-written lines', async ({ page }) => {
    await page.goto('/en/members/bojan-petreski');
    await expect(page.getByRole('heading', { level: 1, name: 'Bojan Petreski' })).toBeVisible();
    await expect(page.getByText('Active 2018–2023', { exact: true })).toBeVisible();
    await expect(page.getByText('Alumni', { exact: true })).toBeVisible();
    await expect(page.getByText('Chair 2021/22')).toBeVisible();
    await expect(page.getByText('Embedded engineer at Gridnova')).toBeVisible();
  });

  test('no such person, a pending member and a made-up address are a 404', async ({ page }) => {
    for (const username of ['nobody-here', 'elena-petrovska']) {
      await page.goto(`/en/members/${username}`);
      await expect(page.getByRole('heading', { name: /not found|can.t find/i }).first()).toBeVisible();
    }
  });

  test('the board and the member cards link here', async ({ page }) => {
    await page.goto('/en/members');
    await page.locator('#board').getByRole('link', { name: 'Ana Trajkovska' }).first().click();
    await expect(page).toHaveURL(/\/en\/members\/ana-trajkovska$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Trajkovska' })).toBeVisible();
  });

  test('is in the sitemap only when public', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/members/daniel-ristov');
    expect(sitemap).toContain('/members/bojan-petreski');
    expect(sitemap).not.toContain('/members/marija-stojanovska');
    expect(sitemap).not.toContain('/members/elena-petrovska');
  });

  test('Macedonian profile', async ({ page }) => {
    await asMember(page);
    await page.goto('/members/marija-stojanovska');
    await expect(page.getByRole('heading', { level: 1, name: 'Marija Stojanovska' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'За мене' })).toBeVisible();
    await expect(page.getByText('Тим Events')).toBeVisible();
  });

  test('phone: portrait, back link, About → Badges → Events, no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await asMember(page);
    await page.goto('/en/members/marija-stojanovska');
    await expect(page.getByRole('link', { name: '← Members' })).toBeVisible();
    const top = (name: string) =>
      page.getByRole('heading', { level: 2, name }).filter({ visible: true }).first().boundingBox();
    const [about, badges, events] = await Promise.all([top('About'), top('Badges'), top('Events')]);
    expect(about!.y).toBeLessThan(badges!.y);
    expect(badges!.y).toBeLessThan(events!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('has no serious accessibility violations (public, restricted, member, alumnus)', async ({ page }) => {
    for (const path of [
      '/en/members/daniel-ristov',
      '/en/members/marija-stojanovska',
      '/en/members/bojan-petreski',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await seriousViolations(page), path).toEqual([]);
    }
    await asMember(page);
    await page.goto('/en/members/marija-stojanovska');
    await expect(page.getByText(/best burek/)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
