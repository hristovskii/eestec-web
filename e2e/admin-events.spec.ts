import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Events list and Event types & topics (M5a). The mock store is shared by parallel tests:
// tests that change data use events and names no other test reads.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const table = (page: Page) => page.getByRole('table', { name: 'Events' });
const row = (page: Page, title: string) => table(page).getByRole('row').filter({ hasText: title });

test.describe('events list (M5a)', () => {
  test('lists every event with dates, type, status and applications (AdminEvents)', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'table columns are checked on desktop; phones get cards');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events');
    await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Upcoming \d+$/ })).toBeVisible();

    const ai = row(page, 'Workshop: AI at the Edge');
    await expect(ai).toContainText('/upcoming/ai-at-the-edge');
    await expect(ai).toContainText('7–13 Nov 2026');
    await expect(ai).toContainText('International');
    await expect(ai).toContainText('Published');
    await expect(ai).toContainText('Today, 16:02');
    await expect(row(page, 'Hands-on: FPGA Basics')).toContainText('27 · full');
    await expect(row(page, 'Exchange: Kraków Winter Edition')).toContainText('External');
    await expect(row(page, 'New Year Social 2026')).toContainText('Draft');
    await expect(row(page, 'FEEIT Career Day 2026')).toContainText('Hidden');
    await expect(page.getByText(/Showing 1–10 of \d+/)).toBeVisible();

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('tabs, filters and pages live in the URL, with a designed empty state', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events?tab=past&scope=international');
    await expect(
      page.getByText('Workshop: Power Up — Renewable Grids').filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('Workshop: AI at the Edge')).toHaveCount(0);

    await page.goto('/admin/events?q=robotics&status=hidden&type=type-competition&year=2026');
    await expect(page.getByRole('heading', { name: 'No events match these filters' })).toBeVisible();
    await expect(
      page.getByText('Nothing found for “robotics” in Hidden · Competition · 2026.', { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).last().click();
    await expect(page).toHaveURL(/\/admin\/events$/);
    await expect(page.getByText('Workshop: AI at the Edge').filter({ visible: true }).first()).toBeVisible();
  });

  test('bulk publish checks each event; draft and publish change the status', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes shared sample data: run once (bulk actions are desktop)');
    await signInAs(page, 'super-admin');
    const bulk = page.getByRole('region', { name: 'Bulk actions' });

    await page.goto('/admin/events?q=power-grid-lecture');
    const lecture = row(page, 'Lecture evening');
    await lecture.getByRole('checkbox').check();
    await bulk.getByRole('button', { name: 'Move to draft' }).click();
    await expect(page.getByText('Event moved to draft')).toBeVisible();
    await expect(lecture).toContainText('Draft');
    await lecture.getByRole('checkbox').check();
    await bulk.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Event published')).toBeVisible();
    await expect(lecture).toContainText('Published');

    // No short description: it can't go live (published or hidden) yet.
    await page.goto('/admin/events?q=arduino');
    const arduino = row(page, 'Local workshop: Arduino for Beginners');
    await arduino.getByRole('checkbox').check();
    await bulk.getByRole('button', { name: 'Hide' }).click();
    await expect(page.getByText("“Local workshop: Arduino for Beginners” can't go live yet")).toBeVisible();
    await expect(arduino).toContainText('Published');
  });

  test('deletes an event after typing DELETE', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes shared sample data: run once');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events?q=embedded-rust');
    await row(page, 'Intro to Embedded Rust')
      .getByRole('button', { name: /More actions/ })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete “Intro to Embedded Rust”?' });
    const confirm = dialog.getByRole('button', { name: 'Delete event' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Type DELETE/).fill('DELETE');
    await confirm.click();
    await expect(page.getByText('Event deleted')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No events match these filters' })).toBeVisible();
  });

  test('exports the filtered rows as CSV', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events?tab=upcoming&scope=local');
    const link = page.getByRole('link', { name: 'Export CSV' });
    await expect(link).toHaveAttribute('href', '/api/export/events?tab=upcoming&scope=local');
    const response = await page.request.get((await link.getAttribute('href'))!);
    expect(response.headers()['content-disposition']).toBe('attachment; filename="events-2026-10-04.csv"');
    const text = await response.text();
    expect(text).toContain('Title,Address,Starts,Ends,Type,Category,Status');
    expect(text).toContain(
      'Soft Skills Training: Leading Teams,/upcoming/leading-teams,14 Nov 2026,14 Nov 2026',
    );
    expect(text).not.toContain('AI at the Edge');
  });

  test('event managers see only their events and cannot add, delete or edit types (D18)', async ({
    page,
  }) => {
    await signInAs(page, 'event-manager');
    await page.goto('/admin/events');
    await expect(page.getByText('The events you manage.', { exact: false })).toBeVisible();
    await expect(
      page.getByText('Soft Skills Training: Leading Teams').filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('Hands-on: FPGA Basics').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Workshop: AI at the Edge')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Add event' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Event types' })).toHaveCount(0);

    await page.goto('/admin/events/types');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
    const csv = await page.request.get('/api/export/events');
    expect(await csv.text()).not.toContain('AI at the Edge');
  });
});

test.describe('event types & topics (M5a)', () => {
  test('adds, renames and deletes a topic', async ({ page }, testInfo) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/events/types');
    await expect(page.getByRole('heading', { level: 1, name: 'Event types & topics' })).toBeVisible();
    const topics = page.getByRole('list', { name: 'Topics' });
    await expect(topics.getByText('AI & data')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    const name = `Quantum ${testInfo.project.name}`;
    await page.getByRole('button', { name: 'Add topic' }).click();
    const add = page.getByRole('dialog', { name: 'Add a topic' });
    await add.getByRole('button', { name: 'Save' }).click();
    await expect(add.getByText('Enter a name')).toBeVisible();
    await add.getByLabel(/^Name/).fill(name);
    await add.getByRole('button', { name: 'Save' }).click();
    await expect(topics.getByText(name)).toBeVisible();

    await page.getByRole('button', { name: `More actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const rename = page.getByRole('dialog', { name: 'Rename topic' });
    await rename.getByLabel(/^Name/).fill(`${name} computing`);
    await rename.getByRole('button', { name: 'Save' }).click();
    await expect(topics.getByText(`${name} computing`)).toBeVisible();

    await page.getByRole('button', { name: `More actions for ${name} computing` }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const remove = page.getByRole('alertdialog', { name: `Delete “${name} computing”?` });
    await expect(remove).toContainText('No event uses it.');
    await remove.getByRole('button', { name: 'Delete' }).click();
    await expect(topics.getByText(`${name} computing`)).toHaveCount(0);
  });

  test('a type in use needs a replacement before it is deleted', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events/types');
    await page.getByRole('button', { name: 'More actions for Workshop' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete “Workshop”?' });
    await expect(dialog).toContainText('events have this type. Choose the type they get instead.');
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(dialog.getByText('Choose the type for its events')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('list', { name: 'Event types' }).getByText('Workshop')).toBeVisible();
  });
});
