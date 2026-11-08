import { expect, type Page, test } from '@playwright/test';

import { SAMPLE_PASSWORD } from '../src/features/auth/data/fixtures/personas';
import { seriousViolations, settled } from './support/axe';
import { MEMBER_PASSWORD, signUpPendingMember } from './support/members';
import { PORT } from './support/servers';

// Admin › Approvals › Member registrations (M14d). The two sample registrations (Elena, Daniel) are
// only looked at: other tests use them. Every test that decides something signs up members of its
// own (through the real form and the mock mailbox), so nothing needs putting back.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const queue = (page: Page) => page.getByRole('list', { name: 'Submissions' });
const preview = (page: Page) => page.getByRole('region', { name: 'Preview of the selected submission' });
const unique = () => crypto.randomUUID().slice(0, 6);

async function mailKinds(page: Page, email: string) {
  const response = await page.request.get(`/api/dev-mailbox?to=${encodeURIComponent(email)}`);
  const { mail } = (await response.json()) as { mail: { kind: string; reason: string | null }[] };
  return mail;
}

async function logInAs(page: Page, email: string, password = MEMBER_PASSWORD) {
  await page.goto('/en/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

test.describe('approvals: member registrations (M14d)', () => {
  test('the queue: tab with its count, the sample registrations oldest first, nothing selected', async ({
    page,
    isMobile,
  }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await expect(page.getByRole('heading', { level: 1, name: 'Approvals' })).toBeVisible();
    await expect(
      page
        .getByRole('tab', { name: /Member registrations/ })
        .or(page.getByRole('link', { name: /Member registrations/ })),
    ).toBeVisible();
    await expect(queue(page)).toBeVisible();
    const names = await queue(page).getByRole('listitem').locator('strong').allInnerTexts();
    expect(names).toContain('Elena Petrovska');
    expect(names).toContain('Daniel Ristov');
    // The sample order: Daniel (2 Oct) waited longer than Elena (4 Oct).
    expect(names.indexOf('Daniel Ristov')).toBeLessThan(names.indexOf('Elena Petrovska'));
    // (On phones the queue stands alone until one is opened.)
    if (!isMobile) await expect(page.getByText('Pick a registration to see it.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve selected' })).toBeDisabled();
  });

  test('sort: "Newest first" turns the order around, and lives in the URL', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals?sort=newest');
    await expect(queue(page)).toBeVisible();
    await expect(page.getByLabel('Sort')).toHaveValue('newest');
    const names = await queue(page).getByRole('listitem').locator('strong').allInnerTexts();
    expect(names.indexOf('Elena Petrovska')).toBeLessThan(names.indexOf('Daniel Ristov'));
    await page.getByLabel('Sort').selectOption('oldest');
    await expect(page).not.toHaveURL(/sort=/);
  });

  test('opening one shows what was entered, the checks and the decision bar; the address keeps it', async ({
    page,
  }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await queue(page)
      .getByRole('link', { name: /Elena Petrovska/ })
      .click();
    await expect(page).toHaveURL(/open=u-elena/);
    const open = preview(page);
    await expect(open.getByRole('heading', { name: 'Elena Petrovska' })).toBeVisible();
    await expect(open).toContainText('elena.p@students.finki.ukim.mk');
    await expect(open).toContainText('FINKI');
    await expect(open).toContainText('1st year');
    await expect(open).toContainText('Members only');
    await expect(open).toContainText('Waiting ·');
    await expect(open.getByRole('region', { name: 'Checks' })).toContainText('E-mail is from a UKIM faculty');
    await expect(open.getByRole('region', { name: 'Checks' })).toContainText('No profile photo');
    await expect(open.getByRole('button', { name: 'Reject…' })).toBeVisible();
    await expect(open.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
    // Next / previous walk the queue.
    await expect(open.getByText(/^\d of \d+$/)).toBeVisible();
    await page.reload();
    await expect(preview(page).getByRole('heading', { name: 'Elena Petrovska' })).toBeVisible();
  });

  test('approving: the registration leaves the queue, and the member can log in as a full member', async ({
    page,
    browser,
  }) => {
    const name = `Approve ${unique()}`;
    const email = await signUpPendingMember(browser, name);
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await queue(page)
      .getByRole('link', { name: new RegExp(name) })
      .click();
    await preview(page).getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(toast(page, '1 registration approved')).toBeVisible();
    await expect(queue(page).getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
    expect((await mailKinds(page, email)).map((mail) => mail.kind)).toContain('approved');

    const member = await browser.newContext({ baseURL: `http://localhost:${PORT}` });
    const memberPage = await member.newPage();
    await logInAs(memberPage, email);
    // Approved: no waiting page, straight to the site.
    await expect(memberPage).toHaveURL(/\/en\/?$/);
    await member.close();
  });

  test('rejecting: quick reasons and a text are e-mailed and shown when the person logs in', async ({
    page,
    browser,
  }) => {
    const name = `Reject ${unique()}`;
    const email = await signUpPendingMember(browser, name);
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await queue(page)
      .getByRole('link', { name: new RegExp(name) })
      .click();
    await preview(page).getByRole('button', { name: 'Reject…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reject this registration?' });
    await expect(dialog).toContainText(email);
    await dialog.getByRole('button', { name: 'Not on our member list' }).click();
    await dialog.getByRole('textbox').fill('Write to us with your member number.');
    await dialog.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(toast(page, 'Registration rejected')).toBeVisible();
    await expect(queue(page).getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
    const mail = (await mailKinds(page, email)).find((item) => item.kind === 'rejected');
    expect(mail?.reason).toBe('Not on our member list. Write to us with your member number.');

    const member = await browser.newContext({ baseURL: `http://localhost:${PORT}` });
    const memberPage = await member.newPage();
    await logInAs(memberPage, email);
    await expect(memberPage.getByRole('main').getByRole('alert')).toContainText(
      'This account was not approved',
    );
    await expect(memberPage.getByRole('main').getByRole('alert')).toContainText(
      'Not on our member list. Write to us with your member number.',
    );
    await member.close();
  });

  test('"E-mail the reason" off: the person is told nothing', async ({ page, browser }) => {
    const name = `Quiet ${unique()}`;
    const email = await signUpPendingMember(browser, name);
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await queue(page)
      .getByRole('link', { name: new RegExp(name) })
      .click();
    await preview(page).getByRole('button', { name: 'Reject…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reject this registration?' });
    await dialog.getByRole('switch').click();
    await dialog.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(toast(page, 'Registration rejected')).toBeVisible();
    expect((await mailKinds(page, email)).map((mail) => mail.kind)).not.toContain('rejected');
  });

  test('"Approve selected" decides every ticked registration at once', async ({ page, browser }) => {
    const first = `Bulk ${unique()}`;
    const second = `Bulk ${unique()}`;
    const emails = [await signUpPendingMember(browser, first), await signUpPendingMember(browser, second)];
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await queue(page)
      .getByRole('checkbox', { name: `Select ${first}` })
      .check();
    await queue(page)
      .getByRole('checkbox', { name: `Select ${second}` })
      .check();
    await page.getByRole('button', { name: 'Approve selected' }).click();
    await expect(toast(page, '2 registrations approved')).toBeVisible();
    await expect(queue(page).getByRole('link', { name: new RegExp(first) })).toHaveCount(0);
    await expect(queue(page).getByRole('link', { name: new RegExp(second) })).toHaveCount(0);
    for (const email of emails)
      expect((await mailKinds(page, email)).map((mail) => mail.kind)).toContain('approved');
  });

  test('"Select all" ticks every row', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await page.getByRole('checkbox', { name: 'Select all' }).check();
    const boxes = queue(page).getByRole('checkbox');
    for (const box of await boxes.all()) await expect(box).toBeChecked();
    await expect(page.getByRole('button', { name: 'Approve selected' })).toBeEnabled();
  });

  test('an editor decides too; an event manager is sent away', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/approvals');
    await expect(page.getByRole('heading', { level: 1, name: 'Approvals' })).toBeVisible();
    await queue(page)
      .getByRole('link', { name: /Elena Petrovska/ })
      .click();
    await expect(preview(page).getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
    await page.context().clearCookies();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/approvals');
    await expect(page).toHaveURL(/\/admin\?forbidden=1$/);
  });

  test('the dashboard and the sidebar count the same registrations as the tab', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    const tab = page
      .getByRole('link', { name: /Member registrations/ })
      .or(page.getByRole('tab', { name: /Member registrations/ }));
    const count = Number(/(\d+)/.exec((await tab.first().innerText()) ?? '')?.[1]);
    expect(count).toBeGreaterThanOrEqual(2);
    await page.goto('/admin');
    const panel = page
      .getByRole('region', { name: 'Pending approvals' })
      .or(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Pending approvals' }) }));
    await expect(panel.first()).toContainText('Elena Petrovska');
    await expect(panel.first()).toContainText('FINKI, 1st year');
  });

  test('phones: the queue, then the registration with a way back and the decision bar at the bottom', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'phone layout');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    await expect(preview(page)).toBeHidden();
    await queue(page)
      .getByRole('link', { name: /Elena Petrovska/ })
      .click();
    await expect(page.getByRole('link', { name: 'Back to the list' })).toBeVisible();
    await expect(queue(page)).toBeHidden();
    const bar = preview(page).getByRole('button', { name: 'Approve', exact: true });
    await expect(bar).toBeInViewport();
    await page.getByRole('link', { name: 'Back to the list' }).click();
    await expect(queue(page)).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('passes axe: the queue, an open registration and the reject dialog', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/approvals');
    expect(await seriousViolations(page)).toEqual([]);
    await queue(page)
      .getByRole('link', { name: /Elena Petrovska/ })
      .click();
    await expect(preview(page).getByRole('heading', { name: 'Elena Petrovska' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await preview(page).getByRole('button', { name: 'Reject…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reject this registration?' });
    await settled(dialog);
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
  });
});

// The sample password is only for the sample members; members made in the tests use their own.
void SAMPLE_PASSWORD;
