import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { createApprovedMember, logInAs } from './support/members';
import { PORT } from './support/servers';

// The Memory editor and My Memories (M17c). Tests that write use a member of their own (signed up
// and approved); the sample member Marija is only read, because she is shared by tests running at once.

const asSample = (page: Page) =>
  page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 8);
// A 1 × 1 PNG: the browser reads it, makes it a JPEG and the server stores it.
const PNG = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
});

const editorReady = async (page: Page) => {
  await expect(page.locator('#me-title')).toBeVisible();
  await expect(page.locator('#me-text')).toBeVisible();
};

test.describe('writing a Memory (M17c)', () => {
  test('a member writes a Memory, saves a draft, previews it and sends it to the board', async ({
    browser,
    page,
  }) => {
    test.slow();
    const author = await createApprovedMember(browser, `Writer ${unique()}`);
    await logInAs(page, author.email);
    await page.goto('/en/memories/new');
    await editorReady(page);
    const title = `A story about Ohrid ${unique()}`;

    await page.locator('#me-title').fill(title);
    const powerUp = await page
      .locator('#me-event option', { hasText: 'Power Up' })
      .first()
      .getAttribute('value');
    await page.locator('#me-event').selectOption(powerUp);
    // City, country and date follow the event.
    await expect(page.locator('#me-city')).not.toHaveValue('');
    await expect(page.locator('#me-country')).not.toHaveValue('');
    await page.locator('#me-text').click();
    await page.keyboard.type('We took the bus to Ohrid and nobody wanted to get off.');
    await page.locator('#me-photos-cover-file').setInputFiles(PNG('cover.png'));
    await expect(page.locator('#me-photos-cover-alt')).toBeVisible();
    await page.locator('#me-photos-cover-alt').fill('The group on the lakeside');
    await page.locator('#me-photos-gallery-file').setInputFiles([PNG('one.png'), PNG('two.png')]);
    const galleryAlts = page.locator('input[id^="me-photos-alt-"]');
    await expect(galleryAlts).toHaveCount(2);
    await expect(page.getByText('2 photos need alt text')).toBeVisible();
    await galleryAlts.nth(0).fill('Lakeside');
    await galleryAlts.nth(1).fill('The old town');

    // Save draft: the page remembers the draft by its id, and the save line says when.
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(toast(page, 'Draft saved')).toBeVisible();
    await expect(page).toHaveURL(/\/en\/memories\/new\?draft=/);
    await expect(page.getByRole('status').filter({ hasText: /Draft saved at/ })).toBeVisible();

    // Preview: only the author sees it, with the way back.
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(
      page.getByText('Only you can see this. It goes live after the board approves it.'),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Back to editing' }).click();
    await editorReady(page);
    await expect(page.locator('#me-title')).toHaveValue(title);

    // Submit.
    await page.getByRole('button', { name: 'Submit for review' }).first().click();
    await expect(page.getByRole('heading', { name: 'Sent to the board' })).toBeVisible();
    await expect(page.getByText(`“${title}” is waiting for approval`)).toBeVisible();

    // My Memories shows it as waiting; a waiting Memory can't be edited (it opens as a preview).
    await page.goto('/en/profile');
    const row = page.locator('#memories').getByRole('listitem').filter({ hasText: title });
    await expect(row).toContainText('Waiting for approval');
    await row.getByRole('link', { name: 'View' }).click();
    await expect(page.getByText('Waiting for the board')).toBeVisible();
    // The board is told (mock mailbox).
    const mailbox = await page.request.get('/api/dev-mailbox');
    const { mail } = (await mailbox.json()) as { mail: { kind: string; subject: string }[] };
    expect(mail.some((item) => item.kind === 'board_memory' && item.subject.includes(title))).toBe(true);
  });

  test('sending with things missing shows what to fix and takes you to the first one', async ({
    browser,
    page,
    isMobile,
  }) => {
    const author = await createApprovedMember(browser, `Empty ${unique()}`);
    await logInAs(page, author.email);
    await page.goto('/en/memories/new');
    await editorReady(page);
    await page.getByRole('button', { name: 'Submit for review' }).first().click();
    const summary = page.getByRole('alert').filter({ hasText: 'Almost there' });
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Title is empty');
    await expect(summary).toContainText('Cover photo is missing');
    await expect(summary).toBeFocused();
    await summary.getByRole('link', { name: 'Title' }).click();
    await expect(page.locator('#me-title')).toBeFocused();
    // The checklist beside the form says the same (it is left out on phones).
    if (!isMobile)
      await expect(page.getByRole('complementary', { name: 'Help with this Memory' })).toContainText(
        'Cover photo with alt text',
      );
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('a person who closes the page keeps their words on this device', async ({ browser, page }) => {
    const author = await createApprovedMember(browser, `Keeper ${unique()}`);
    await logInAs(page, author.email);
    await page.goto('/en/memories/new');
    await editorReady(page);
    await page.locator('#me-title').fill('Written but never saved');
    await expect(page.getByRole('status').filter({ hasText: 'Unsaved changes' })).toBeVisible();
    // The copy on the device is written shortly after typing.
    await page.waitForFunction(() => window.localStorage.getItem('memory-draft:new') !== null);
    await page.goto('/en/memories/new');
    await editorReady(page);
    await expect(page.locator('#me-title')).toHaveValue('Written but never saved');
    await expect(page.getByText('We restored changes from this device')).toBeVisible();
  });
});

test.describe('editing and My Memories (M17c, the sample member)', () => {
  test("a Memory that was not approved shows the board's reason and can be resubmitted", async ({ page }) => {
    await asSample(page);
    await page.goto('/en/memories/krakow-in-the-snow-part-two/edit');
    await editorReady(page);
    await expect(page.getByText('Not approved yet: the board asked for changes')).toBeVisible();
    await expect(page.getByText(/Please add a description to each photo/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Edit Memory' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resubmit for review' }).first()).toBeVisible();
    // Sending it again says what is still missing: the alt texts the board asked for.
    await page.getByRole('button', { name: 'Resubmit for review' }).first().click();
    await expect(page.getByRole('alert').filter({ hasText: 'Almost there' })).toContainText('need alt text');
  });

  test('a published Memory is edited as changes: no draft, the live version stays', async ({ page }) => {
    await asSample(page);
    await page.goto('/en/memories/five-days-in-delft-zero-days-of-sun/edit');
    await editorReady(page);
    await expect(page.getByText('This Memory is live')).toBeVisible();
    await expect(page.getByText('Your earlier changes are still waiting')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit changes' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save draft' })).toHaveCount(0);
    // The editor opens with the waiting version of the text.
    await expect(page.locator('#me-text')).toContainText('A note for anyone going next year');
  });

  test("a waiting Memory opens as a preview, someone else's Memory is a 404", async ({ page }) => {
    await asSample(page);
    await page.goto('/en/memories/seven-days-28-nationalities-and-one-very-long-bus-ride-to-ohrid/edit');
    await expect(page).toHaveURL(
      /\/en\/memories\/seven-days-28-nationalities-and-one-very-long-bus-ride-to-ohrid$/,
    );
    await page.goto('/en/memories/power-up-the-lab-day-i-did-not-expect/edit');
    await expect(page.getByRole('heading', { name: /not found|can.t find/i }).first()).toBeVisible();
  });

  test('a visitor is sent to log in', async ({ page }) => {
    await page.goto('/en/memories/new');
    await expect(page).toHaveURL(/\/en\/login\?next=%2Fmemories%2Fnew/);
  });

  test("My Memories lists every status with its next step and the board's note", async ({ page }) => {
    await asSample(page);
    await page.goto('/en/profile');
    const section = page.locator('#memories');
    await expect(section.getByRole('heading', { name: 'My Memories' })).toBeVisible();
    const row = (title: string) => section.getByRole('listitem').filter({ hasText: title });
    await expect(row('Notes from the RoboMac jury table')).toContainText('Draft');
    await expect(
      row('Notes from the RoboMac jury table').getByRole('link', { name: 'Continue writing' }),
    ).toHaveAttribute('href', /\/en\/memories\/new\?draft=/);
    await expect(row('Seven days, 28 nationalities')).toContainText('Waiting for approval');
    await expect(row('Kraków in the snow')).toContainText('Not approved');
    await expect(row('Kraków in the snow')).toContainText('Note from the board:');
    await expect(row('Kraków in the snow').getByRole('link', { name: 'Edit and resubmit' })).toBeVisible();
    await expect(row('Five days in Delft')).toContainText('Published');
    await expect(row('Five days in Delft')).toContainText('Changes waiting');
    // The chips filter the list.
    await section.getByRole('button', { name: /Drafts/ }).click();
    await expect(section.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Create a Memory' }).first()).toHaveAttribute(
      'href',
      '/en/memories/new',
    );
  });
});
