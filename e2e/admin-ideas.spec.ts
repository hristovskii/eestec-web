import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { ownDevice } from './support/devices';
import { sendIdea, sendImpression } from './support/ideas';
import { boardPage } from './support/memories';
import { PORT } from './support/servers';

// Admin › Ideas & Feedback (M18c). Tests that change something send an idea or an impression of
// their own through /submit first and handle that one; the sample rows are only read.

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 8);

async function asPersona(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const list = (page: Page, name: string) => page.getByRole('list', { name });
const detail = (page: Page) => page.getByRole('region', { name: 'Selected item' });

test.describe('Admin › Ideas (M18c)', () => {
  test('lists the ideas with what is new, and opens one with its attachment and notes', async ({ page }) => {
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas');
    await expect(page.getByRole('heading', { level: 1, name: 'Ideas & Feedback' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ideas.*new/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Event feedback/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ratings per event/ })).toBeVisible();
    const ideas = list(page, 'Ideas');
    await expect(ideas.getByRole('link', { name: /A beginner workshop on PCB design/ })).toBeVisible();
    await expect(ideas.getByRole('link', { name: /Hackathon with the Faculty of Design/ })).toContainText(
      'Anonymous',
    );
    await ideas.getByRole('link', { name: /A beginner workshop on PCB design/ }).click();
    const open = detail(page);
    await expect(open.getByText('Bojan Ilievski').first()).toBeVisible();
    await expect(open.getByRole('link', { name: 'bojan.i@example.org' })).toBeVisible();
    await expect(open.getByText('pcb-workshop-plan.pdf')).toBeVisible();
    await expect(open.getByRole('link', { name: 'Reply by e-mail' })).toHaveAttribute(
      'href',
      /^mailto:bojan\.i@example\.org/,
    );
    await expect(open.getByText('Daniel can teach KiCad')).toBeVisible();
  });

  test('filters by status, type and search; the filters live in the address', async ({ page }) => {
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas?status=accepted');
    const ideas = list(page, 'Ideas');
    await expect(ideas.getByRole('link', { name: /Robotics workshop for high-schoolers/ })).toBeVisible();
    await expect(ideas.getByRole('link', { name: /Hackathon with the Faculty of Design/ })).toHaveCount(0);
    await page.goto('/admin/ideas?q=dark%20mode');
    await expect(ideas.getByRole('link')).toHaveCount(1);
    await expect(ideas.getByRole('link', { name: /Dark mode for eestec\.mk/ })).toBeVisible();
    await page.goto('/admin/ideas?q=nothing-like-this');
    await expect(page.getByRole('heading', { name: 'No ideas match' })).toBeVisible();
  });

  test('an idea from /submit shows up, is handled, noted and given an owner', async ({
    browser,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    test.slow();
    await ownDevice(page);
    const title = `Admin flow idea ${unique()}`;
    const email = `sender.${unique()}@example.org`;
    await sendIdea(page, { title, name: 'Sender Person', email });

    const { context, page: board } = await boardPage(browser);
    try {
      await board.goto(`/admin/ideas?q=${encodeURIComponent(title)}`);
      await board
        .getByRole('list', { name: 'Ideas' })
        .getByRole('link', { name: new RegExp(title) })
        .click();
      const open = detail(board);
      await expect(open.getByRole('heading', { name: title })).toBeVisible();
      await expect(open.getByRole('link', { name: email })).toBeVisible();
      await expect(open.getByText('not a member')).toBeVisible();
      // Status
      await open.getByLabel('Status').selectOption({ label: 'Under review' });
      await expect(toast(board, 'Status changed to “Under review”')).toBeVisible();
      // Owner
      await open.getByLabel('Owner').selectOption({ label: 'Stefan Nikolovski' });
      await expect(toast(board, 'Owner changed')).toBeVisible();
      // Note
      await open.getByLabel('Add a note').fill('We could run this in November.');
      await open.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(open.getByText('We could run this in November.')).toBeVisible();
      // Archive
      await open.getByRole('button', { name: 'Archive' }).click();
      await expect(toast(board, 'Status changed to “Archive”')).toBeVisible();
      await board.reload();
      await expect(
        board.getByRole('list', { name: 'Ideas' }).getByRole('link', { name: new RegExp(title) }),
      ).toContainText('Archived');
    } finally {
      await context.close();
    }
  });

  test('an anonymous idea has no identity and nobody to reply to', async ({ browser, page, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    test.slow();
    await ownDevice(page);
    const title = `Anonymous idea ${unique()}`;
    await sendIdea(page, { title, anonymous: true });

    const { context, page: board } = await boardPage(browser);
    try {
      await board.goto(`/admin/ideas?q=${encodeURIComponent(title)}`);
      await board
        .getByRole('list', { name: 'Ideas' })
        .getByRole('link', { name: new RegExp(title) })
        .click();
      const open = detail(board);
      await expect(open.getByRole('heading', { name: 'Anonymous', exact: true })).toBeVisible();
      await expect(open.getByText(/Sent anonymously/)).toBeVisible();
      await expect(open.getByRole('link', { name: 'Reply by e-mail' })).toHaveCount(0);
      await expect(open.locator('a[href^="mailto:"]')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('accepting an idea makes a draft event the board can open', async ({ browser, page, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    test.slow();
    await ownDevice(page);
    const title = `Accepted idea ${unique()}`;
    await sendIdea(page, { title, name: 'Idea Person' });

    const { context, page: board } = await boardPage(browser);
    try {
      await board.goto(`/admin/ideas?q=${encodeURIComponent(title)}`);
      await board
        .getByRole('list', { name: 'Ideas' })
        .getByRole('link', { name: new RegExp(title) })
        .click();
      await detail(board).getByRole('button', { name: 'Accept and create event draft' }).click();
      await expect(toast(board, 'Accepted: the event draft is ready')).toBeVisible();
      const draft = detail(board).getByRole('link', { name: 'Open the event draft' });
      await expect(draft).toBeVisible();
      await expect(detail(board).getByLabel('Status')).toHaveValue('accepted');
      const href = await draft.getAttribute('href');
      expect(href).toMatch(/^\/admin\/events\/ev-/);
      // The draft is there, hidden from the site, and goes away again (the sample store is shared).
      await board.goto(href!);
      await expect(board.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await board.goto(`/admin/events?q=${encodeURIComponent(title)}`);
      await board
        .getByRole('button', { name: /More actions/ })
        .first()
        .click();
      await board.getByRole('menuitem', { name: 'Delete' }).click();
      const dialog = board.getByRole('alertdialog', { name: new RegExp(`Delete “${title}”\\?`) });
      await dialog.getByLabel(/Type DELETE/).fill('DELETE');
      await dialog.getByRole('button', { name: 'Delete event' }).click();
      await expect(toast(board, 'Event deleted')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('exports the ideas as CSV without an identity for anonymous ones', async ({ page }) => {
    await asPersona(page, 'super-admin');
    const response = await page.request.get('/api/export/ideas-ideas');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('text/csv');
    const csv = await response.text();
    expect(csv).toContain('Title');
    const hackathon = csv.split('\r\n').find((line) => line.includes('Hackathon with the Faculty of Design'));
    expect(hackathon).toBeTruthy();
    expect(hackathon).toContain(',Yes,,,,');
    expect(csv).toContain('bojan.i@example.org');
  });
});

test.describe('Admin › Event feedback (M18c)', () => {
  test('lists the feedback; the open one shows the stars, the text and the Memory banner', async ({
    page,
  }) => {
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas?tab=feedback');
    const feedback = list(page, 'Event feedback');
    await expect(
      feedback.getByRole('link', { name: /Workshop: Power Up — Renewable Grids/ }).first(),
    ).toBeVisible();
    await feedback.getByRole('link', { name: /Marija Stojanovska/ }).click();
    const open = detail(page);
    await expect(open.getByText('4 of 5')).toBeVisible();
    await expect(open.getByText('The lab day was the best part: real equipment')).toBeVisible();
    await expect(open.getByText('The author also asked to publish this as a Memory.')).toBeVisible();
    await expect(open.getByRole('link', { name: 'Open in Approvals' })).toHaveAttribute(
      'href',
      '/admin/approvals?type=memories',
    );
    await expect(open.getByRole('button', { name: 'Archive' })).toBeVisible();
  });

  test('filters by event and by status', async ({ page }) => {
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas?tab=feedback&event=ev-soft-skills-academy-2026');
    const feedback = list(page, 'Event feedback');
    await expect(
      feedback.getByRole('link', { name: /Soft Skills Academy Skopje 2026/ }).first(),
    ).toBeVisible();
    await expect(feedback.getByRole('link', { name: /Power Up/ })).toHaveCount(0);
    await page.goto('/admin/ideas?tab=feedback&status=archived&q=makstil');
    await expect(feedback.getByRole('link', { name: /Study visit to Makstil/ })).toBeVisible();
  });

  test('an impression from /submit is listed with its rating, never public', async ({
    browser,
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    test.slow();
    await ownDevice(page);
    const text = `Needle ${unique()} the bus was long but the lab day was great`;
    await sendImpression(page, {
      text,
      stars: 5,
      name: 'Guest Person',
      email: `guest.${unique()}@example.org`,
    });

    const { context, page: board } = await boardPage(browser);
    try {
      await board.goto(`/admin/ideas?tab=feedback&q=${encodeURIComponent(text.slice(0, 20))}`);
      const row = board.getByRole('list', { name: 'Event feedback' }).getByRole('link', { name: /Power Up/ });
      await expect(row).toContainText('★ 5');
      await row.click();
      await expect(detail(board).getByText(text)).toBeVisible();
      await expect(detail(board).getByText('not a member')).toBeVisible();
      await detail(board).getByLabel('Status').selectOption({ label: 'Accepted' });
      await expect(toast(board, 'Status changed to “Accepted”')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

test.describe('Admin › Ratings per event (M18c)', () => {
  test('shows the average, the spread and the latest comment per event, for an academic year or all time', async ({
    page,
  }) => {
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas?tab=ratings&year=all');
    const table = page.getByRole('table', { name: 'Ratings per event' });
    await expect(table.getByRole('columnheader')).toHaveText([
      'Event',
      'Responses',
      'Average',
      'Spread',
      'Latest comment',
    ]);
    const power = table.getByRole('row').filter({ hasText: 'Workshop: Power Up — Renewable Grids' });
    await expect(power).toBeVisible();
    await expect(power.getByRole('link', { name: /All \d+ comments/ })).toHaveAttribute(
      'href',
      /tab=feedback&event=ev-power-up-2026/,
    );
    await expect(page.getByText('Average of all ratings:')).toBeVisible();
    await expect(page.getByLabel('Academic year')).toHaveValue('all');
    // An academic year with ratings, from the sample (Sep 2025 – Aug 2026): New Year Social, Kraków, EESTech.
    await page.getByLabel('Academic year').selectOption({ label: 'Academic year 2025/26' });
    await expect(page).toHaveURL(/year=2025/);
    await expect(table.getByRole('row').filter({ hasText: 'New Year Social 2025' })).toBeVisible();
    await expect(table.getByRole('row').filter({ hasText: 'Exchange: Kraków Winter Edition' })).toBeVisible();
  });

  test('an academic year without ratings has a designed empty state', async ({ page }) => {
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas?tab=ratings&year=2010');
    await expect(page.getByRole('heading', { name: 'No ratings in this period' })).toBeVisible();
  });
});

test.describe('Admin › Form settings (M18c)', () => {
  test('adds an idea type, which the form offers, and a type in use cannot be removed', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    test.slow();
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas');
    await page.getByRole('button', { name: 'Form settings' }).click();
    const drawer = page.getByRole('dialog', { name: 'Form settings · /submit' });
    await expect(drawer.getByLabel(/^Intro text · Impression/)).toBeVisible();
    const name = `Temporary type ${unique()}`;
    await drawer.getByRole('button', { name: 'Add type' }).click();
    await drawer.getByLabel(/^Name of idea type 6/).fill(name);
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(toast(page, 'Form settings saved')).toBeVisible();

    // The public form offers it.
    await page.goto('/en/submit');
    await expect(
      page.getByRole('form', { name: 'Submit an idea' }).getByText(name, { exact: true }),
    ).toBeVisible();

    // Take it away again; and "Workshop topic" has ideas, so it stays.
    await page.goto('/admin/ideas');
    await page.getByRole('button', { name: 'Form settings' }).click();
    await drawer.getByRole('button', { name: `Remove ${name}` }).click();
    await drawer.getByRole('button', { name: 'Remove Workshop topic' }).click();
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      drawer.getByText("“Workshop topic” is used by ideas, so it can't be removed."),
    ).toBeVisible();
    // Put "Workshop topic" back by reopening (nothing was saved), then remove only the new one.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Form settings' }).click();
    await drawer.getByRole('button', { name: `Remove ${name}` }).click();
    await drawer.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(toast(page, 'Form settings saved')).toBeVisible();
    await page.goto('/en/submit');
    await expect(
      page.getByRole('form', { name: 'Submit an idea' }).getByText(name, { exact: true }),
    ).toHaveCount(0);
  });

  test('an editor can edit the form, but the notification switch is for super admins', async ({ page }) => {
    await asPersona(page, 'editor');
    await page.goto('/admin/ideas');
    await page.getByRole('button', { name: 'Form settings' }).click();
    const drawer = page.getByRole('dialog', { name: 'Form settings · /submit' });
    await expect(
      drawer.getByRole('switch', { name: 'E-mail the board on every new submission' }),
    ).toBeDisabled();
    await expect(drawer.getByText('Only super admins change this switch')).toBeVisible();
  });
});

test.describe('Admin › Ideas for an event manager (M18c)', () => {
  test('sees the feedback and ratings of their own events only, read-only', async ({ page }) => {
    await asPersona(page, 'event-manager');
    await page.goto('/admin/ideas');
    await expect(page.getByText('You can read the feedback and ratings of your own events.')).toBeVisible();
    const tabs = page.getByRole('navigation', { name: 'Show' });
    await expect(tabs.getByRole('link', { name: /^Ideas/ })).toHaveCount(0);
    await expect(tabs.getByRole('link', { name: /Event feedback/ })).toBeVisible();
    await expect(tabs.getByRole('link', { name: /Ratings per event/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Form settings' })).toHaveCount(0);
    // None of the sample feedback is about the events Daniel manages.
    await expect(page.getByRole('heading', { name: 'No feedback yet' })).toBeVisible();
    // Someone else's feedback does not open by its address.
    await page.goto('/admin/ideas?tab=feedback&open=fb-marija-powerup');
    await expect(page.getByText('Marija Stojanovska')).toHaveCount(0);
    // And the ideas export is not theirs.
    const response = await page.request.get('/api/export/ideas-ideas');
    expect(response.status()).toBe(403);
  });
});

test.describe('Admin › Ideas: accessibility and the phone (M18c)', () => {
  test('no serious accessibility problems on the three tabs', async ({ page }) => {
    await asPersona(page, 'super-admin');
    for (const path of [
      '/admin/ideas?open=idea-pcb',
      '/admin/ideas?tab=feedback&open=fb-marija-powerup',
      '/admin/ideas?tab=ratings&year=all',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: 'Ideas & Feedback' })).toBeVisible();
      await page.waitForTimeout(500);
      expect(await seriousViolations(page)).toEqual([]);
    }
  });

  test('on a phone the list and the open idea are one screen each', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone only');
    await asPersona(page, 'super-admin');
    await page.goto('/admin/ideas');
    await expect(list(page, 'Ideas')).toBeVisible();
    await page.goto('/admin/ideas?open=idea-pcb');
    await expect(list(page, 'Ideas')).toBeHidden();
    await expect(
      detail(page).getByRole('heading', { name: 'A beginner workshop on PCB design' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Back to the list' }).click();
    await expect(list(page, 'Ideas')).toBeVisible();
  });
});
