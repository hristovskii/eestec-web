import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Settings and the activity log (M4b). The mock store is shared by parallel tests: only
// the save test writes, and it changes a field no other test reads.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const save = (page: Page) => page.getByRole('button', { name: 'Save changes' });

test.describe('settings (M4b)', () => {
  test('super admins get all eight sections with the decided values', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings');
    const nav = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(nav.getByRole('link')).toHaveText([
      'Branding',
      'Events',
      'Contact & legal',
      'SEO',
      'E-mail notifications',
      'Languages',
      'Activity log',
      'Security & backups',
    ]);
    await expect(page.getByLabel('“Closing soon” badge and red countdown')).toHaveValue('72');
    await expect(page.getByRole('list', { name: 'Board roles & e-mails' }).getByRole('listitem')).toHaveCount(
      5,
    );
    await expect(page.getByText('5 wrong tries pause sign-in for 15 minutes.')).toBeVisible();
    await expect(save(page)).toBeDisabled();
  });

  test('editors and event managers have no access (D18)', async ({ page }) => {
    for (const persona of ['editor', 'event-manager'] as const) {
      await signInAs(page, persona);
      await page.goto('/admin/settings');
      await expect(page).toHaveURL(/\/admin\?forbidden=1$/);
    }
  });

  test('an invalid e-mail stops the save and is listed at the top', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings');
    await page.getByLabel('E-mail (Treasurer)').fill('treasurer-at-eestec');
    await save(page).click();
    const summary = page.getByRole('alert').filter({ hasText: "Can't save yet" });
    await expect(summary).toContainText("Can't save yet: fix 1 field");
    await summary.getByRole('link', { name: /Treasurer/ }).click();
    await expect(page.getByLabel('E-mail (Treasurer)')).toBeFocused();
  });

  test('saving records the change in the activity log', async ({ page, isMobile }) => {
    test.skip(isMobile, 'writes shared sample data: run once');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings');
    await page.getByLabel('“Just ended” badge in the archive').fill('10');
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await save(page).click();
    await expect(page.getByText('Settings saved.', { exact: false })).toBeVisible();
    await expect(page.getByText('All changes saved')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('“Just ended” badge in the archive')).toHaveValue('10');
    await page.goto('/admin/activity?area=settings');
    await expect(page.getByRole('table', { name: 'Activity log' })).toContainText(
      'Ana Trajkovska edited Settings › Events',
    );
  });

  test('board roles reorder with the keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard reordering is a desktop flow');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings');
    const roles = page
      .getByRole('list', { name: 'Board roles & e-mails' })
      .getByLabel('Role', { exact: true });
    await expect(roles.nth(3)).toHaveValue('Treasurer');
    // Each step waits for what a screen reader hears (dnd-kit's live region).
    const announced = (text: string) =>
      expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();
    const handle = page.getByRole('button', { name: 'Reorder Treasurer' });
    await handle.focus();
    await page.keyboard.press('Space');
    // Picked up ("Picked up" is replaced right away by the position announcement).
    await expect(handle).toHaveAttribute('aria-pressed', 'true');
    await announced('Treasurer is now at position 4 of 5.');
    await page.keyboard.press('ArrowUp');
    await announced('Treasurer is now at position 3 of 5.');
    await page.keyboard.press('Space');
    await announced('Treasurer dropped at position 3 of 5.');
    await expect(roles.nth(2)).toHaveValue('Treasurer');
    await expect(save(page)).toBeEnabled();
  });

  test('leaving with unsaved changes asks first', async ({ page, isMobile }) => {
    test.skip(isMobile, 'uses the desktop sidebar');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings');
    await page.getByLabel('Site name').fill('EESTEC LC Skopje (draft)');
    await page
      .getByRole('navigation', { name: 'Admin sections' })
      .first()
      .getByRole('link', { name: 'Dashboard' })
      .click();
    const dialog = page.getByRole('alertdialog', { name: 'Leave without saving?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('logos are picked from the Media library (images with alt text only)', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings');
    await page.getByRole('button', { name: 'Replace: White logo' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose an image' });
    await expect(picker.getByRole('radio', { name: /ohrid-group-selfie\.jpg/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // Newest first, 24 at a time: search for the older brand file.
    await picker.getByRole('searchbox').fill('eestecredsquare');
    await picker.getByRole('radio', { name: 'eestecredsquare.png' }).click();
    await picker.getByRole('button', { name: 'Use image' }).click();
    await expect(page.locator('#branding')).toContainText('eestecredsquare.png · 4167 × 4167');
    await expect(save(page)).toBeEnabled();
  });

  test('SEO shows what is missing per page', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings#seo');
    const seo = page.locator('#seo');
    const join = seo.getByRole('listitem').filter({ has: page.getByText('Join Us', { exact: true }) });
    await expect(join).toContainText('Missing description');
    await seo.getByRole('button', { name: 'Edit: Join Us' }).click();
    await expect(seo.getByLabel(/^Title/)).toHaveValue('Become an EESTECer');
  });

  test('the public site uses Settings › SEO for the page title', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle('EESTEC LC Skopje: engineering students across Europe');
  });

  test('no serious accessibility violations', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/settings');
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('activity log (M4b)', () => {
  test('editors can read it and filter by area; event managers cannot open it', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/activity');
    await expect(page.getByRole('heading', { level: 1, name: 'Activity log' })).toBeVisible();
    await page.goto('/admin/activity?area=media');
    const log = page
      .getByRole('table', { name: 'Activity log' })
      .or(page.getByRole('list', { name: 'Activity log' }));
    await expect(log).toContainText('uploaded ai-at-the-edge-lab.jpg');
    await expect(log).not.toContainText('published Workshop: AI at the Edge');
    expect(await seriousViolations(page)).toEqual([]);

    await signInAs(page, 'event-manager');
    await page.goto('/admin/activity');
    await expect(page).toHaveURL(/\/admin\?forbidden=1$/);
  });
});
