import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';
import { PORT } from './support/servers';

// Admin › Admin users & roles (M4c). Tests that change data use people no other test reads
// (Ivana, and people invited by the test itself), so parallel runs don't affect each other.

async function signInAs(page: Page, persona: string) {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const row = (page: Page, name: string) =>
  page.getByRole('table', { name: 'Admin users' }).getByRole('row').filter({ hasText: name });

test.describe('admin users (M4c)', () => {
  test('lists admins with role, access, 2-step and last active (AdminUsers)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'table columns are checked on desktop; phones get cards');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { level: 1, name: 'Admin users & roles' })).toBeVisible();

    const ana = row(page, 'Ana Trajkovska');
    await expect(ana).toContainText('Everything');
    await expect(ana).toContainText('Now');
    await expect(ana.getByRole('combobox', { name: 'Role for Ana Trajkovska' })).toBeDisabled();
    await expect(ana.getByRole('button', { name: /More actions/ })).toHaveCount(0);

    const daniel = row(page, 'Daniel Ristov');
    await expect(daniel).toContainText('Soft Skills Training: Leading Teams, Hands-on: FPGA Basics');
    await expect(daniel).toContainText('Off');
    // Other tests sign Daniel in ("Now"); nobody signs in as Ivana.
    await expect(row(page, 'Ivana Kostova')).toContainText('Wed 30 Sep, 12:40');

    const petar = row(page, 'Petar Kolev');
    await expect(petar).toContainText('Not set up yet');
    await expect(petar).toContainText('Invited 2 days ago');
    await petar.getByRole('button', { name: 'Resend invite' }).click();
    await expect(page.getByText('Invite sent again to petar.k@students.feit.ukim.edu.mk')).toBeVisible();
  });

  test('the matrix is the D18 permissions', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/users');
    const matrix = page.getByRole('table', { name: 'Roles & permissions' });
    await expect(matrix.getByRole('row')).toHaveCount(16); // header + 15 areas
    const cells = (area: string) =>
      matrix.getByRole('row').filter({ has: page.getByRole('rowheader', { name: area }) });
    await expect(cells('Media library')).toContainText('Own uploads');
    await expect(cells('Activity log')).toContainText('Read-only');
    await expect(cells('Ideas & Feedback')).toContainText('Own events, read-only');
    await expect(cells('Settings').getByLabel('No access')).toHaveCount(3); // editor, event manager, member
    await expect(cells('Inbox & CSV export').getByLabel('No access')).toHaveCount(2);
  });

  test('editors and event managers have no access (D18)', async ({ page }) => {
    for (const persona of ['editor', 'event-manager']) {
      await signInAs(page, persona);
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/admin\?forbidden=1$/);
    }
  });

  test('invite an event manager, then withdraw the invite', async ({ page }, testInfo) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/users');
    const name = `Test Invite ${testInfo.project.name}`;
    const email = `invite-${testInfo.project.name}@eestec.mk`;

    await page.getByRole('button', { name: 'Invite admin' }).click();
    const dialog = page.getByRole('dialog', { name: 'Invite an admin' });
    await expect(dialog.getByLabel('Name')).toBeFocused();
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('E-mail').fill(email);
    await dialog.getByRole('button', { name: 'Send invite' }).click();
    await expect(dialog.getByText('Pick at least one event.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Add event' }).click();
    await page.getByRole('menuitem', { name: 'New Year Social 2026' }).click();
    await expect(dialog.getByText('Pick at least one event.')).toBeHidden();
    await dialog.getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByText(`Invite sent to ${email}`)).toBeVisible();

    // The table on desktop, the cards list on phones (not the toasts, which are list items too).
    const card = (
      testInfo.project.name === 'mobile'
        ? page.getByRole('list', { name: 'Admin users' }).getByRole('listitem')
        : page.getByRole('table', { name: 'Admin users' }).getByRole('row')
    ).filter({ hasText: name });
    await expect(card).toContainText('Invited now');
    await expect(card).toContainText('New Year Social 2026');

    // The same e-mail can't be invited twice.
    await page.getByRole('button', { name: 'Invite admin' }).click();
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('E-mail').fill(email);
    await dialog.getByLabel('Role').selectOption('editor');
    await dialog.getByRole('button', { name: 'Send invite' }).click();
    await expect(dialog.getByText('This person already has admin access.')).toBeVisible();
    await page.keyboard.press('Escape');

    await card.getByRole('button', { name: `More actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Remove admin access' }).click();
    const remove = page.getByRole('alertdialog', { name: `Remove admin access for ${name}?` });
    await expect(remove.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await remove.getByRole('button', { name: 'Remove access' }).click();
    await expect(page.getByText(`${name} no longer has admin access`)).toBeVisible();
    await expect(card).toHaveCount(0);
  });

  test('a role change applies to that person right away', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes shared sample data: run once');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/users');
    await row(page, 'Ivana Kostova')
      .getByRole('combobox', { name: 'Role for Ivana Kostova' })
      .selectOption('event_manager');
    const dialog = page.getByRole('dialog', { name: 'Make Ivana Kostova an event manager?' });
    await dialog.getByRole('button', { name: 'Change role' }).click();
    await expect(dialog.getByText('Pick at least one event.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add event' }).click();
    await page.getByRole('menuitem', { name: 'Workshop: AI at the Edge' }).click();
    await dialog.getByRole('button', { name: 'Change role' }).click();
    await expect(page.getByText('Ivana Kostova is now an event manager')).toBeVisible();
    await expect(row(page, 'Ivana Kostova')).toContainText('Workshop: AI at the Edge');

    // Ivana now sees the event-manager admin: no Inbox, no Settings.
    await signInAs(page, 'editor-ivana');
    await page.goto('/admin');
    const nav = page.getByRole('navigation', { name: 'Admin sections' }).first();
    await expect(nav.getByRole('link', { name: 'Events' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Inbox' })).toHaveCount(0);

    await signInAs(page, 'super-admin');
    await page.goto('/admin/activity?area=users');
    await expect(page.getByRole('table', { name: 'Activity log' })).toContainText(
      'Ana Trajkovska edited role of Ivana Kostova → Event manager',
    );
  });

  test('no serious accessibility violations', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/users');
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Invite admin' }).click();
    const dialog = page.getByRole('dialog', { name: 'Invite an admin' });
    await expect(dialog).toBeVisible();
    await settled(dialog);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
