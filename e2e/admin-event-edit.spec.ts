import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Events › edit form (M5b). Tests that change data create their own events, so parallel
// runs (and the list tests) never see each other's changes.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

// A 2 × 1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGN4qmUARAAKKgJ/Mt7YcQAAAABJRU5ErkJggg==',
  'base64',
);

/** A field of the form on screen, by value path ("cover.alt"): ids are e-<event id or new>-<path>. */
const field = (page: Page, path: string) => {
  const id = /\/admin\/events\/(ev-[\w-]+)/.exec(page.url())?.[1] ?? 'new';
  return page.locator(`#e-${id}-${path.replaceAll('.', '-')}`);
};

const saveBar = (page: Page) => page.getByRole('region', { name: 'Save' });
const toast = (page: Page, text: string | RegExp) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text });

test.describe('event edit form (M5b)', () => {
  test('shows every field of AI at the Edge (AdminEventEdit)', async ({ page, isMobile }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events/ev-ai-at-the-edge');
    await expect(page.getByRole('heading', { level: 1, name: 'Workshop: AI at the Edge' })).toBeVisible();
    await expect(saveBar(page)).toContainText('Published');
    await expect(saveBar(page)).toContainText('Upcoming event · last saved 2 hours ago by Ana Trajkovska');
    // Phones show the logo instead of breadcrumbs.
    if (!isMobile)
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(
        'Workshop: AI at the Edge',
      );

    await expect(field(page, 'title')).toHaveValue('Workshop: AI at the Edge');
    await expect(page.getByText('24 / 90')).toBeVisible();
    await expect(field(page, 'slug')).toHaveValue('ai-at-the-edge');
    await expect(page.getByText('eestec.mk/upcoming/', { exact: true })).toBeVisible();
    await expect(field(page, 'startsAt')).toHaveValue('2026-11-07');
    await expect(field(page, 'startsAt.time')).toHaveValue('10:00');
    await expect(page.getByRole('textbox', { name: 'Description (Macedonian)', exact: true })).toContainText(
      'small models that run on a €10 board',
    );
    await expect(page.getByRole('button', { name: 'Hardware', pressed: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Software', pressed: false })).toBeVisible();
    await expect(field(page, 'cover.alt')).toHaveValue(/^Two students at a lab bench/);
    await expect(page.getByText('cover-ai-edge.jpg · 1920 × 1200 · 284 KB')).toBeVisible();
    await expect(page.getByText('8 photos · drag to reorder')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add alt text/ })).toHaveCount(1);
    await expect(page.getByText('AI-at-the-Edge-info-pack.pdf')).toBeVisible();
    await expect(page.getByText('1.8 MB · uploaded 2 Oct by Ana Trajkovska')).toBeVisible();
    await expect(page.getByRole('button', { name: 'International', pressed: true })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Accept applications' })).toBeChecked();
    await expect(page.getByLabel('Deadline')).toHaveValue('2026-10-18T23:59');

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('a live event with a photo missing alt text cannot update its page', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events/ev-ai-at-the-edge');
    await field(page, 'location').fill('Skopje & Ohrid');
    await expect(saveBar(page)).toContainText('Unsaved changes · the live page still shows the old version');
    await saveBar(page).getByRole('button', { name: 'Update live page' }).click();
    const summary = page.getByRole('alert').filter({ hasText: "Can't publish yet: fix 1 field" });
    await expect(summary).toBeVisible();
    await expect(summary.getByRole('link', { name: 'Photo gallery › photo 3' })).toHaveAttribute(
      'href',
      '#e-ev-ai-at-the-edge-gallery-2-alt',
    );
    await saveBar(page).getByRole('button', { name: 'Discard' }).click();
    await expect(field(page, 'location')).toHaveValue('Skopje & Ohrid, North Macedonia');
  });

  test('creates an event: draft first, publish checks the fields, no cover is only a warning', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'creates sample data: run once');
    await signInAs(page, 'editor');
    await page.goto('/admin/events/new');
    await expect(page.getByRole('heading', { level: 1, name: 'New event' })).toBeVisible();
    await expect(saveBar(page)).toContainText('New event · not saved yet');

    const title = `Работилница: Роботика ${testInfo.workerIndex}-${Date.now() % 100_000}`;
    await field(page, 'title').fill(title);
    // The address follows the title (transliterated) until it's edited by hand.
    await expect(field(page, 'slug')).toHaveValue(/^rabotilnica-robotika-/);
    await saveBar(page).getByRole('button', { name: 'Save draft' }).click();
    await expect(toast(page, 'Event created as a draft')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/events\/ev-[\w-]+$/);
    await expect(saveBar(page)).toContainText('Draft');

    await saveBar(page).getByRole('button', { name: 'Publish' }).click();
    const summary = page.getByRole('alert').filter({ hasText: "Can't publish yet: fix 2 fields" });
    await expect(summary).toContainText('Short description');
    await expect(summary).toContainText('Location');
    await summary.getByRole('link', { name: 'Short description' }).click();
    await expect(field(page, 'shortDescription')).toBeFocused();

    await field(page, 'shortDescription').fill('Build a line-follower robot in one weekend.');
    await field(page, 'location').fill('Lab 215, FEEIT');
    await expect(
      page
        .getByRole('region', { name: 'Cover image' })
        .getByText('No cover image: this event will use the default red cover.'),
    ).toBeVisible();

    // Rich text: bold from the toolbar.
    const description = page.getByRole('textbox', { name: 'Description (Macedonian)', exact: true });
    await description.click();
    await page.keyboard.type('Bring a laptop. ');
    await page.getByRole('region', { name: 'Description' }).getByRole('button', { name: 'Bold' }).click();
    await page.keyboard.type('No experience needed.');
    await expect(page.getByRole('region', { name: 'Description' }).getByText('6 words')).toBeVisible();

    // A gallery photo uploads with progress and then needs alt text before publishing.
    await page
      .getByRole('region', { name: 'Photo gallery' })
      .locator('input[type=file]')
      .setInputFiles({
        name: `robot-${testInfo.workerIndex}.png`,
        mimeType: 'image/png',
        buffer: PNG,
      });
    await expect(toast(page, 'Photo uploaded')).toBeVisible();
    await page
      .getByRole('region', { name: 'Photo gallery' })
      .getByRole('button', { name: /Add alt text/ })
      .click();
    const altDialog = page.getByRole('dialog', { name: 'Alt text for photo 1' });
    await altDialog.getByRole('textbox').fill('A small robot following a black line');
    await altDialog.getByRole('button', { name: 'Save' }).click();

    await saveBar(page).getByRole('button', { name: 'Publish' }).click();
    const published = toast(page, "Published. It's live on eestec.mk.");
    await expect(published).toBeVisible();
    await expect(published).toContainText('This event will use the default red cover.');
    await expect(saveBar(page)).toContainText('Published');
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: 'Description (Macedonian)', exact: true }).locator('strong'),
    ).toHaveText('No experience needed.');
    await expect(page.getByRole('region', { name: 'Photo gallery' })).toContainText(
      '1 photo · drag to reorder',
    );

    // Leaving with unsaved changes asks first.
    await field(page, 'location').fill('Lab 216, FEEIT');
    await page.getByRole('link', { name: 'Back to events' }).click();
    const leave = page.getByRole('alertdialog', { name: 'Leave without saving?' });
    await expect(leave).toBeVisible();
    await leave.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin\/events$/);
    await page.goto(`/admin/events?q=${encodeURIComponent(title.toLowerCase())}`);
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test('deletes an event from its edit page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'creates sample data: run once');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events/new');
    const title = `Delete me ${Date.now() % 100_000}`;
    await field(page, 'title').fill(title);
    await saveBar(page).getByRole('button', { name: 'Save draft' }).click();
    await expect(page).toHaveURL(/\/admin\/events\/ev-/);
    await page.getByRole('button', { name: 'Delete event…' }).click();
    const dialog = page.getByRole('alertdialog', { name: `Delete “${title}”?` });
    await dialog.getByLabel(/Type DELETE/).fill('DELETE');
    await dialog.getByRole('button', { name: 'Delete event' }).click();
    await expect(page).toHaveURL(/\/admin\/events$/);
    await expect(toast(page, 'Event deleted')).toBeVisible();
  });

  test('event managers edit only their events and cannot delete or create (D18)', async ({ page }) => {
    await signInAs(page, 'event-manager');
    await page.goto('/admin/events/ev-leading-teams');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Soft Skills Training: Leading Teams' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete event…' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New topic' })).toHaveCount(0);

    await page.goto('/admin/events/ev-ai-at-the-edge');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
    await page.goto('/admin/events/new');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });

  test('an unknown event is a 404', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events/ev-does-not-exist');
    await expect(page.getByRole('heading', { name: /not found|doesn't exist/i })).toBeVisible();
  });
});
