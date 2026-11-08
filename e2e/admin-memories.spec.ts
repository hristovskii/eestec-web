import { expect, type Page, test } from '@playwright/test';

import { createApprovedMember, logInAs } from './support/members';
import { boardPage, submitNewMemory } from './support/memories';

// Approvals › Memories and Admin › Memories (M17d). Tests that decide use a Memory of their own
// (written by a member of their own); the sample queue is only read.

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 8);

test.describe('Approvals › Memories (M17d)', () => {
  test('the queue lists waiting Memories and waiting changes; the open one shows what to check', async ({
    browser,
  }) => {
    const { context, page } = await boardPage(browser);
    try {
      await page.goto('/admin/approvals?type=memories');
      const list = page.getByRole('list', { name: 'Submissions' });
      await expect(list.getByRole('link', { name: /Seven days, 28 nationalities/ })).toBeVisible();
      await expect(list.getByRole('link', { name: /Five days in Delft/ })).toContainText('Changes');
      // A published Memory's waiting changes: what differs, then the same checks.
      await list.getByRole('link', { name: /Five days in Delft/ }).click();
      const preview = page.getByRole('region', { name: 'Preview of the selected submission' });
      await expect(preview.getByText('What changed')).toBeVisible();
      await expect(preview.getByText('Text', { exact: true })).toBeVisible();
      await expect(preview.getByText('Cover photo has alt text')).toBeVisible();
      await expect(preview.getByRole('link', { name: 'Edit before publishing' })).toHaveAttribute(
        'href',
        /\/admin\/memories\/mem-delft$/,
      );
      await expect(preview.getByRole('button', { name: 'Approve & publish changes' })).toBeVisible();
      await expect(preview.getByRole('button', { name: 'Reject…' })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('approving publishes the Memory, tells the author and puts it on the site', async ({
    browser,
    page,
  }) => {
    test.slow();
    const author = await createApprovedMember(browser, `Author ${unique()}`);
    await logInAs(page, author.email);
    const title = `Approved story ${unique()}`;
    await submitNewMemory(page, title);

    const { context, page: board } = await boardPage(browser);
    try {
      await board.goto('/admin/approvals?type=memories');
      await board
        .getByRole('list', { name: 'Submissions' })
        .getByRole('link', { name: new RegExp(title) })
        .click();
      const preview = board.getByRole('region', { name: 'Preview of the selected submission' });
      await expect(preview.getByRole('heading', { name: title })).toBeVisible();
      await preview.getByRole('button', { name: 'Approve & publish' }).click();
      await expect(toast(board, '1 Memory published')).toBeVisible();
    } finally {
      await context.close();
    }

    // Public now (the author sees the live post, without a preview bar), and it is in their list.
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await page.goto(`/en/memories/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText('Waiting for the board')).toHaveCount(0);
    await page.goto('/en/profile');
    await expect(page.locator('#memories').getByRole('listitem').filter({ hasText: title })).toContainText(
      'Published',
    );
    const mailbox = await page.request.get(`/api/dev-mailbox?to=${encodeURIComponent(author.email)}`);
    const { mail } = (await mailbox.json()) as { mail: { kind: string; subject: string }[] };
    expect(mail.some((item) => item.kind === 'memory_published' && item.subject.includes(title))).toBe(true);
  });

  test('rejecting sends it back with the reason, and the author can see why', async ({
    browser,
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      'The reject dialog is a desktop job here; the phone has the same bar (approve is checked).',
    );
    test.slow();
    const author = await createApprovedMember(browser, `Rejected ${unique()}`);
    await logInAs(page, author.email);
    const title = `Rejected story ${unique()}`;
    await submitNewMemory(page, title);

    const { context, page: board } = await boardPage(browser);
    try {
      await board.goto('/admin/approvals?type=memories');
      await board
        .getByRole('list', { name: 'Submissions' })
        .getByRole('link', { name: new RegExp(title) })
        .click();
      await board
        .getByRole('region', { name: 'Preview of the selected submission' })
        .getByRole('button', { name: 'Reject…' })
        .click();
      const dialog = board.getByRole('dialog', { name: 'Reject this Memory?' });
      await dialog.getByRole('button', { name: 'Photos need alt text' }).click();
      await dialog.getByLabel(/Reason/).fill('Please write a little more about the lab day');
      await dialog.getByRole('button', { name: 'Reject', exact: true }).click();
      await expect(toast(board, 'Sent back to the author')).toBeVisible();
    } finally {
      await context.close();
    }

    await page.goto('/en/profile');
    const row = page.locator('#memories').getByRole('listitem').filter({ hasText: title });
    await expect(row).toContainText('Not approved');
    await expect(row).toContainText('Photos need alt text');
    await expect(row).toContainText('Please write a little more about the lab day');
    await row.getByRole('link', { name: 'Edit and resubmit' }).click();
    await expect(page.getByText('Not approved yet: the board asked for changes')).toBeVisible();
    const mailbox = await page.request.get(`/api/dev-mailbox?to=${encodeURIComponent(author.email)}`);
    const { mail } = (await mailbox.json()) as { mail: { kind: string; reason: string | null }[] };
    expect(mail.some((item) => item.kind === 'memory_rejected' && item.reason?.includes('lab day'))).toBe(
      true,
    );
  });
});

test.describe('Admin › Memories (M17d)', () => {
  test('lists Memories with their status, edits one, unpublishes it and deletes it', async ({
    browser,
    page,
  }) => {
    test.slow();
    const author = await createApprovedMember(browser, `Listed ${unique()}`);
    await logInAs(page, author.email);
    const title = `Listed story ${unique()}`;
    await submitNewMemory(page, title);

    const { context, page: board } = await boardPage(browser);
    try {
      // Publish it from Approvals, then look at it in the list.
      await board.goto('/admin/approvals?type=memories');
      await board
        .getByRole('list', { name: 'Submissions' })
        .getByRole('link', { name: new RegExp(title) })
        .click();
      await board
        .getByRole('region', { name: 'Preview of the selected submission' })
        .getByRole('button', { name: 'Approve & publish' })
        .click();
      await expect(toast(board, '1 Memory published')).toBeVisible();

      await board.goto(`/admin/memories?q=${encodeURIComponent(title)}`);
      const row = board.getByRole('row').filter({ hasText: title });
      await expect(row).toContainText('Published');
      await expect(row).toContainText(author.name);

      // Edit: the form opens with the text; a new title is saved.
      await row.getByRole('link', { name: title }).click();
      await expect(board.getByRole('heading', { name: title })).toBeVisible();
      await board.locator('#am-title').fill(`${title} (edited)`);
      await board.getByRole('button', { name: 'Save changes' }).click();
      await expect(toast(board, 'Memory saved')).toBeVisible();

      // Unpublish: it leaves the site and is a draft again.
      await board.goto(`/admin/memories?q=${encodeURIComponent(title)}`);
      await board
        .getByRole('button', { name: /More actions for/ })
        .first()
        .click();
      await board.getByRole('menuitem', { name: 'Unpublish' }).click();
      await board.getByRole('button', { name: 'Unpublish', exact: true }).click();
      await expect(toast(board, 'Memory unpublished')).toBeVisible();
      await expect(board.getByRole('row').filter({ hasText: title })).toContainText('Draft');
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await page.goto(`/en/memories/${slug}`);
      await expect(page.getByText('Waiting for the board')).toHaveCount(0);

      // Delete: type DELETE; it is gone for the author too.
      await board
        .getByRole('button', { name: /More actions for/ })
        .first()
        .click();
      await board.getByRole('menuitem', { name: 'Delete' }).click();
      await board.getByRole('textbox').fill('DELETE');
      await board.getByRole('button', { name: 'Delete Memory' }).click();
      await expect(toast(board, 'Memory deleted')).toBeVisible();
    } finally {
      await context.close();
    }
    await page.goto('/en/profile');
    await expect(page.locator('#memories').getByRole('listitem').filter({ hasText: title })).toHaveCount(0);
  });

  test('an event manager has no Memories area', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: `http://localhost:3100` });
    await context.addCookies([
      { name: 'eestec_mock_persona', value: 'event-manager', url: 'http://localhost:3100' },
    ]);
    const page = await context.newPage();
    try {
      await page.goto('/admin/memories');
      await expect(page).toHaveURL(/\/admin\?forbidden=1/);
    } finally {
      await context.close();
    }
  });
});
