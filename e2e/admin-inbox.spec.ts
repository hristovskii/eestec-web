import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';
import { PORT } from './support/servers';

// Admin › Inbox (M12d): the three lists, the open item, status, read marks, notes and CSV. The
// tests that change something put it back, and run one after the other on the desktop project
// (the mock store is shared by everything running at once). Contact messages are also created by
// the contact form's tests, so counts are read from the page, never assumed.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => Math.random().toString(36).slice(2, 8);
const list = (page: Page, name = 'Messages') => page.getByRole('list', { name });
const row = (page: Page, text: string | RegExp, name = 'Messages') =>
  list(page, name).getByRole('link', { name: text });
const detail = (page: Page) => page.getByRole('region', { name: 'Selected item' });

/** The number in a segment: "New · 5" → 5. */
const segmentCount = async (page: Page, label: string) =>
  Number(
    /(\d+)\s*$/.exec(
      (await page.getByRole('button', { name: new RegExp(`^${label} · \\d+$`) }).textContent()) ?? '',
    )?.[1],
  );

test.describe('admin inbox (M12d)', () => {
  test('lists contact messages with the new count, unread dots, time and subject', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the filter bar is a sheet on phones');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/inbox');
    await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible();
    const tabs = page.getByRole('navigation', { name: 'Form' });
    await expect(tabs.getByRole('link', { name: /^Contact messages\s*\d+ new$/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(tabs.getByRole('link', { name: /^Partner inquiries/ })).toBeVisible();
    await expect(tabs.getByRole('link', { name: /^Membership applications/ })).toBeVisible();
    const elena = row(page, /Elena Petrovska/);
    await expect(elena).toContainText('Membership');
    await expect(elena).toContainText("Hi! I'm a first-year student at FINKI");
    await expect(row(page, /Aleksandar P\./)).toContainText('General question');
    // Right side: nothing chosen yet.
    await expect(page.getByText('Choose an item on the left to read it.')).toBeVisible();
    expect(await segmentCount(page, 'All')).toBeGreaterThanOrEqual(7);
  });

  test('search, status and subject filters live in the URL, and an empty result is designed', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the filter bar is a sheet on phones');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/inbox?q=belgrade');
    await expect(row(page, /LC Belgrade/)).toBeVisible();
    await expect(row(page, /Elena Petrovska/)).toHaveCount(0);

    await page.goto('/admin/inbox?status=answered');
    await expect(row(page, /Aleksandar P\./)).toBeVisible();
    await expect(row(page, /Elena Petrovska/)).toHaveCount(0);

    await page.goto('/admin/inbox');
    await page.getByRole('combobox', { name: 'Subject' }).selectOption({ label: 'Media' });
    await expect(page).toHaveURL(/subject=subject-media/);
    await expect(row(page, /Jana Kostovska/)).toBeVisible();
    await expect(row(page, /Elena Petrovska/)).toHaveCount(0);

    await page.goto('/admin/inbox?q=zzzz-nothing');
    await expect(page.getByText('No messages match these filters')).toBeVisible();
    await page.getByRole('link', { name: 'Clear filters' }).click();
    await expect(row(page, /Elena Petrovska/)).toBeVisible();
  });

  test('the other two tabs have their own lists and statuses', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the filter bar is a sheet on phones');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/inbox?tab=partners');
    await expect(row(page, /Polaris Instruments/, 'Inquiries')).toContainText('Workshop');
    await expect(row(page, /Hexacore/, 'Inquiries')).toContainText('Sponsorship · Job fair');
    await expect(page.getByRole('button', { name: /^In progress$/ })).toBeVisible();
    await page.goto('/admin/inbox?tab=membership');
    await expect(row(page, /Sample Applicant One/, 'Applications')).toContainText('FEEIT');
    await expect(page.getByRole('button', { name: /^Contacted$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Accepted$/ })).toBeVisible();
  });

  test('a partner inquiry and a membership application open with their details', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/inbox?tab=partners&open=pi-1');
    await expect(detail(page).getByRole('heading', { name: 'Nikola Petrov' })).toBeVisible();
    await expect(detail(page)).toContainText('Polaris Instruments');
    await expect(detail(page)).toContainText('PRT-2026-0014');
    await expect(detail(page).getByRole('link', { name: 'Reply by e-mail' })).toHaveAttribute(
      'href',
      /^mailto:nikola\.petrov@example\.org\?subject=Re%3A%20Partnership%20inquiry%20PRT-2026-0014$/,
    );
    await page.goto('/admin/inbox?tab=membership&open=ma-sample-3');
    await expect(detail(page)).toContainText('Power Systems');
    await expect(detail(page)).toContainText("Master's");
    await expect(detail(page)).toContainText('Info stand at FEEIT');
  });

  test.describe('changes', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'editing is a desktop flow');
    });

    test('opening a message marks it read, "Mark as unread" puts the dot back', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/inbox?open=cm-5');
      try {
        await expect(detail(page).getByRole('heading', { name: 'Teodora Mitreva' })).toBeVisible();
        await expect(detail(page)).toContainText('MSG-2026-0226');
        await expect(detail(page)).toContainText('sent to members@eestec.mk');
        // Read: the dot of that row goes away (after the page refreshes).
        await expect(row(page, /Teodora Mitreva/).getByText('Unread')).toHaveCount(0);
        await page.reload();
        await expect(row(page, /Teodora Mitreva/).getByText('Unread')).toHaveCount(0);
      } finally {
        await detail(page).getByRole('button', { name: 'Mark as unread' }).click();
        await expect(row(page, /Teodora Mitreva/).getByText('Unread')).toHaveCount(1);
      }
    });

    test('changes the status, which moves the "New" count, and puts it back', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/inbox?open=cm-4');
      const before = await segmentCount(page, 'New');
      try {
        await detail(page).getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Answered' });
        await expect(toast(page, 'Status changed to “Answered”.')).toBeVisible();
        await expect.poll(() => segmentCount(page, 'New')).toBe(before - 1);
        await expect(detail(page).getByRole('button', { name: 'Mark as answered' })).toHaveCount(0);
      } finally {
        await detail(page).getByRole('combobox', { name: 'Status' }).selectOption({ label: 'New' });
        await expect.poll(() => segmentCount(page, 'New')).toBe(before);
      }
    });

    test('"Mark as answered" and "Archive" are quick ways to change the status', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/inbox?open=cm-3');
      try {
        await detail(page).getByRole('button', { name: 'Mark as answered' }).click();
        await expect(detail(page).getByRole('combobox', { name: 'Status' })).toHaveValue('answered');
        await detail(page).getByRole('button', { name: 'Archive' }).click();
        await expect(detail(page).getByRole('combobox', { name: 'Status' })).toHaveValue('archived');
        await expect(detail(page).getByRole('button', { name: 'Archive' })).toHaveCount(0);
      } finally {
        await detail(page).getByRole('combobox', { name: 'Status' }).selectOption({ label: 'New' });
        await expect(detail(page).getByRole('combobox', { name: 'Status' })).toHaveValue('new');
      }
    });

    test('adds an internal note under your name', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/inbox?open=cm-1');
      const notes = detail(page).getByRole('region', { name: /Internal notes/ });
      await expect(notes).toContainText('Daniel Ristov');
      await expect(notes).toContainText("I'll answer and invite her to Wednesday's meeting.");
      const text = `Called her ${unique()}`;
      await notes.getByRole('textbox', { name: 'Add a note' }).fill(text);
      await notes.getByRole('button', { name: 'Add' }).click();
      await expect(notes).toContainText(text);
      await expect(notes.getByRole('textbox', { name: 'Add a note' })).toHaveValue('');
      // An empty note is refused.
      await notes.getByRole('button', { name: 'Add' }).click();
      await expect(notes.getByRole('alert')).toHaveText('Write a note first.');
    });

    test('"Mark all as read" marks everything in the tab (and the test puts the dots back)', async ({
      page,
    }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/inbox?tab=partners');
      await expect(list(page, 'Inquiries')).toBeVisible();
      const unread = await list(page, 'Inquiries')
        .getByRole('link')
        .filter({ has: page.getByText('Unread') })
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      expect(unread.length).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Mark all as read' }).click();
      await expect(toast(page, 'marked as read')).toBeVisible();
      await expect(list(page, 'Inquiries').getByText('Unread')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
      // Put them back: open each (opening reads it), then mark it unread.
      for (const href of unread) {
        await page.goto(href);
        await detail(page).getByRole('button', { name: 'Mark as unread' }).click();
        await expect(list(page, 'Inquiries').getByText('Unread')).not.toHaveCount(0);
      }
    });

    test('a status change of a partner inquiry and an application is saved', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/inbox?tab=partners&open=pi-2');
      try {
        await detail(page).getByRole('button', { name: 'Mark in progress' }).click();
        await expect(detail(page).getByRole('combobox', { name: 'Status' })).toHaveValue('in_progress');
      } finally {
        await detail(page).getByRole('combobox', { name: 'Status' }).selectOption({ label: 'New' });
        await expect(detail(page).getByRole('combobox', { name: 'Status' })).toHaveValue('new');
      }
      await page.goto('/admin/inbox?tab=membership&open=ma-sample-1');
      try {
        await detail(page).getByRole('button', { name: 'Mark as contacted' }).click();
        await expect(detail(page).getByRole('combobox', { name: 'Status' })).toHaveValue('contacted');
      } finally {
        await detail(page).getByRole('combobox', { name: 'Status' }).selectOption({ label: 'New' });
        await expect(detail(page).getByRole('combobox', { name: 'Status' })).toHaveValue('new');
      }
    });
  });

  test('Export CSV: the panel shows how many rows, and the file has the messages', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/inbox');
    await page.getByRole('button', { name: /Export CSV/ }).click();
    const panel = page.getByRole('dialog', { name: 'Export to CSV' });
    await expect(panel).toContainText('Export contact messages');
    await expect(panel.getByRole('status')).toContainText(/\d+ messages? · opens in Excel or Google Sheets/);
    await panel.getByRole('combobox', { name: 'Date range' }).selectOption({ label: 'Custom…' });
    await expect(panel.getByLabel('From')).toBeVisible();
    await panel.getByRole('combobox', { name: 'Date range' }).selectOption({ label: 'All time' });
    await expect(panel.getByRole('link', { name: 'Download CSV' })).toHaveAttribute(
      'href',
      '/api/export/inbox-contact?range=all&closed=1',
    );
    // "Only the current filter" needs a filter.
    await expect(panel.getByRole('checkbox', { name: /no filter set/ })).toBeDisabled();
  });

  test('the CSV downloads: contact, partners, membership, ranges and the count', async ({ page }) => {
    await signInAs(page, 'super-admin');
    const contact = await page.request.get('/api/export/inbox-contact?range=all');
    expect(contact.status()).toBe(200);
    expect(contact.headers()['content-type']).toContain('text/csv');
    expect(contact.headers()['content-disposition']).toContain('contact-messages.csv');
    const text = await contact.text();
    expect(text.split('\r\n')[0]).toContain('Reference,Received,Name,E-mail,Subject,Sent to,Status,Read');
    expect(text).toContain('Elena Petrovska');
    expect(text).toContain('Sara Dimova');

    // Without archived messages, Sara (archived) is not in it.
    const open = await (await page.request.get('/api/export/inbox-contact?range=all&closed=0')).text();
    expect(open).not.toContain('Sara Dimova');
    // The count, and a custom range around one day.
    const count = await page.request.get(
      '/api/export/inbox-contact?range=custom&from=2026-09-28&to=2026-09-28&count=1',
    );
    expect(await count.json()).toEqual({ count: 1 });
    // Only what the list is filtered by.
    const filtered = await (
      await page.request.get('/api/export/inbox-contact?range=all&current=1&q=belgrade')
    ).text();
    expect(filtered).toContain('LC Belgrade');
    expect(filtered).not.toContain('Elena Petrovska');

    const partners = await page.request.get('/api/export/inbox-partners?range=all');
    expect(partners.headers()['content-disposition']).toContain('partner-inquiries.csv');
    expect(await partners.text()).toContain('Polaris Instruments');
    const membership = await page.request.get('/api/export/inbox-membership?range=all');
    expect(membership.headers()['content-disposition']).toContain('membership-applications.csv');
    expect(await membership.text()).toContain('Sample Applicant One');
  });

  test('editors work in the Inbox; event managers are sent away and get no CSV', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/inbox?open=cm-6');
    await expect(detail(page).getByRole('combobox', { name: 'Status' })).toBeEnabled();
    expect((await page.request.get('/api/export/inbox-contact?range=all')).status()).toBe(200);
    await signInAs(page, 'event-manager');
    await page.goto('/admin/inbox');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
    expect((await page.request.get('/api/export/inbox-contact?range=all')).status()).toBe(403);
    expect((await page.request.get('/api/export/inbox-partners?range=all')).status()).toBe(403);
  });

  test('phones: the list, then the open message with a way back', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the phone layout');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/inbox');
    await expect(detail(page)).toBeHidden();
    await row(page, /Aleksandar P\./).click();
    await expect(detail(page).getByRole('heading', { name: 'Aleksandar P.' })).toBeVisible();
    await expect(list(page)).toBeHidden();
    await detail(page).getByRole('link', { name: 'Back to the list' }).click();
    await expect(row(page, /Aleksandar P\./)).toBeVisible();
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1]!);
  });

  test('passes axe: the list, an open message and the export panel', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/inbox?open=cm-6');
    await expect(detail(page).getByRole('heading', { name: 'Aleksandar P.' })).toBeVisible();
    await settled(page.locator('body'));
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto('/admin/inbox?tab=partners&open=pi-1');
    await expect(detail(page).getByRole('heading', { name: 'Nikola Petrov' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto('/admin/inbox?tab=membership&open=ma-sample-2');
    await expect(detail(page).getByRole('heading', { name: 'Sample Applicant Two' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: /Export CSV/ }).click();
    await expect(page.getByRole('dialog', { name: 'Export to CSV' })).toBeVisible();
    await settled(page.getByRole('dialog', { name: 'Export to CSV' }));
    expect(await seriousViolations(page)).toEqual([]);
  });
});
