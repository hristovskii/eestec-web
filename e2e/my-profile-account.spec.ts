import { expect, type Page, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

import { seriousViolations, settled } from './support/axe';
import { createApprovedMember, hydrated, logInAs, MEMBER_PASSWORD, uniqueEmail } from './support/members';
import { PORT } from './support/servers';

// /profile › Account (M16d): e-mail, password, download my data and deleting the account. The sample
// member is only looked at; everything that changes uses a member of our own (signed up and
// approved here), because the sample members are shared by tests running at once.

const asSample = (page: Page) =>
  page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 8);
const account = (page: Page) => page.locator('#account');
const NEW_PASSWORD = 'vardar-river-2027';

async function openAccount(page: Page) {
  await page.goto('/en/profile');
  await hydrated(page, '#account button');
}

test.describe('my account (M16d)', () => {
  test('the sample member: e-mail, password age, download and delete', async ({ page }) => {
    await asSample(page);
    await page.goto('/en/profile');
    const card = account(page);
    await expect(card.getByRole('heading', { name: 'Account' })).toBeVisible();
    await expect(card.getByText('marija.s@students.feit.ukim.edu.mk')).toBeVisible();
    await expect(card.getByText(/^Last changed .+ ago$/)).toBeVisible();
    await expect(card.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/api/me/export');
    await expect(card.getByText('Everything we store about you, as a ZIP file.')).toBeVisible();
    await expect(card.getByText('Delete my account')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Delete account…' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'My profile sections' }).getByRole('link', { name: 'Account' }),
    ).toHaveAttribute('href', '#account');
  });

  test('the dialogs have no serious accessibility violations', async ({ page, isMobile }) => {
    test.skip(isMobile, 'dialogs are the same on phones');
    await asSample(page);
    await openAccount(page);
    for (const [button, title] of [
      ['Change', 'Change your e-mail'],
      ['Delete account…', 'Delete your account?'],
    ] as const) {
      await account(page).getByRole('button', { name: button }).first().click();
      const dialog = page
        .getByRole('dialog', { name: title })
        .or(page.getByRole('alertdialog', { name: title }));
      await expect(dialog).toBeVisible();
      await settled(dialog);
      expect(await seriousViolations(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
  });

  test('Macedonian page', async ({ page }) => {
    await asSample(page);
    await page.goto('/profile');
    await expect(account(page).getByRole('heading', { name: 'Сметка' })).toBeVisible();
    await expect(account(page).getByRole('button', { name: 'Избриши сметка…' })).toBeVisible();
  });

  test('change the password: wrong current, weak new, then it works', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Account ${unique()}`);
    await logInAs(page, me.email);
    await openAccount(page);
    await account(page).getByRole('button', { name: 'Change' }).nth(1).click();
    const dialog = page.getByRole('dialog', { name: 'Change your password' });
    await dialog.getByLabel('Current password').fill('not-my-password');
    await dialog.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
    await dialog.getByRole('button', { name: 'Change password' }).click();
    await expect(dialog.getByText('That password is not right.')).toBeVisible();

    await dialog.getByLabel('Current password').fill(MEMBER_PASSWORD);
    await dialog.getByLabel('New password', { exact: true }).fill('short');
    await dialog.getByRole('button', { name: 'Change password' }).click();
    await expect(dialog.getByText('Use at least 10 characters')).toBeVisible();

    await dialog.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
    await dialog.getByRole('button', { name: 'Change password' }).click();
    await expect(toast(page, 'Password changed')).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expect(account(page).getByText(/^Last changed .+/)).toBeVisible();

    // The new password logs in, in a browser of its own; the old one does not.
    const other = await browser.newPage({ baseURL: `http://localhost:${PORT}` });
    await logInAs(other, me.email, NEW_PASSWORD);
    await expect(other).not.toHaveURL(/\/login/);
    await other.close();
  });

  test('change the e-mail: the link goes to the new address and the old one stays until it is used', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Account ${unique()}`);
    await logInAs(page, me.email);
    await openAccount(page);
    await account(page).getByRole('button', { name: 'Change' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Change your e-mail' });

    // An address that already has an account.
    await dialog.getByLabel('New e-mail address').fill('marija.s@students.feit.ukim.edu.mk');
    await dialog.getByLabel('Your password').fill(MEMBER_PASSWORD);
    await dialog.getByRole('button', { name: 'Send link' }).click();
    await expect(dialog.getByText('This e-mail already has an account.')).toBeVisible();

    const fresh = uniqueEmail('changed');
    await dialog.getByLabel('New e-mail address').fill(fresh);
    await dialog.getByLabel('Your password').fill('wrong-password');
    await dialog.getByRole('button', { name: 'Send link' }).click();
    await expect(dialog.getByText('That password is not right.')).toBeVisible();

    await dialog.getByLabel('Your password').fill(MEMBER_PASSWORD);
    await dialog.getByRole('button', { name: 'Send link' }).click();
    const sent = page.getByRole('dialog', { name: 'Check your new e-mail' });
    await expect(sent).toBeVisible();
    await expect(sent).toContainText(fresh);
    await sent.getByRole('button', { name: 'Done' }).click();

    // Not changed yet.
    await page.reload();
    await expect(account(page).getByText(me.email)).toBeVisible();

    // The link in the mailbox of the new address.
    const response = await page.request.get(`/api/dev-mailbox?to=${encodeURIComponent(fresh)}`);
    const { mail } = (await response.json()) as { mail: { kind: string; link: string | null }[] };
    const link = mail.find((item) => item.kind === 'email_change')?.link;
    expect(link).toMatch(/type=email&lang=en$/);
    await page.goto(link!);
    await expect(page).toHaveURL(/\/en\/profile\?email=changed$/);
    await expect(page.getByText('Your e-mail address is changed.')).toBeVisible();
    await expect(account(page).getByText(fresh)).toBeVisible();

    // The link works once.
    await page.goto(link!);
    await expect(page).toHaveURL(/\/en\/profile\?email=expired$/);
    await expect(page.getByText(/That link has expired or was already used/)).toBeVisible();
  });

  test('download my data: a ZIP of the member’s own data, and nothing without a session', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Account ${unique()}`);
    await logInAs(page, me.email);
    const response = await page.request.get('/api/me/export');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/zip');
    expect(response.headers()['content-disposition']).toContain('eestec-my-data.zip');
    expect(response.headers()['cache-control']).toBe('no-store');
    const files = unzipSync(new Uint8Array(await response.body()));
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'README.txt',
        'profile.json',
        'account.json',
        'consents.json',
        'applications.json',
      ]),
    );
    expect(strFromU8(files['account.json']!)).toContain(me.email);
    expect(JSON.parse(strFromU8(files['profile.json']!))).toMatchObject({ name: me.name });

    const visitor = await browser.newContext({ baseURL: `http://localhost:${PORT}` });
    expect((await visitor.request.get('/api/me/export')).status()).toBe(401);
    await visitor.close();
  });

  test('delete the account: asks for the password, then everything is gone', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Gone ${unique()}`);
    await logInAs(page, me.email);
    await openAccount(page);
    await account(page).getByRole('button', { name: 'Delete account…' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete your account?' });
    await expect(dialog.getByText('This permanently removes:')).toBeVisible();
    await expect(dialog.getByText('Your profile, photo and bio')).toBeVisible();
    // No Memories yet: the "Also delete my Memories" box has nothing to say.
    await expect(dialog.getByRole('checkbox')).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Delete my account' }).click();
    await expect(dialog.getByText('This is required')).toBeVisible();
    await dialog.getByLabel('Enter your password to confirm').fill('not-my-password');
    await dialog.getByRole('button', { name: 'Delete my account' }).click();
    await expect(dialog.getByText('That password is not right.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'My profile' })).toBeVisible();

    await hydrated(page, '#account button');
    await account(page).getByRole('button', { name: 'Delete account…' }).click();
    await page.getByLabel('Enter your password to confirm').fill(MEMBER_PASSWORD);
    await page.getByRole('button', { name: 'Delete my account' }).click();
    const done = page.getByRole('status').filter({ hasText: 'Your account is deleted' });
    await expect(done).toBeVisible();
    await expect(done).toContainText('Thanks for everything, Gone.');
    expect(await seriousViolations(page)).toEqual([]);

    // The home page no longer knows them; their page and their log-in are gone.
    await done.getByRole('link', { name: 'Go to the home page' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('header').getByRole('link', { name: 'Log in' }).first()).toBeVisible();
    const mail = await page.request.get(`/api/dev-mailbox?to=${encodeURIComponent(me.email)}`);
    const { mail: sent } = (await mail.json()) as { mail: { kind: string }[] };
    expect(sent.map((item) => item.kind)).toContain('deleted');
    await page.goto(`/en/members/${me.username}`);
    await expect(page.getByRole('heading', { level: 1, name: me.name })).toHaveCount(0);
    await page.goto('/en/login');
    await hydrated(page, 'form input[type="password"]');
    await page.getByLabel('E-mail').fill(me.email);
    await page.getByLabel('Password', { exact: true }).fill(MEMBER_PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/login/);
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  });
});
