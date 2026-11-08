import { expect, type Page, test } from '@playwright/test';

import { SAMPLE_PASSWORD } from '../src/features/auth/data/fixtures/personas';
import { seriousViolations } from './support/axe';

// Member sign-up (M14c): the form, its errors, "Confirm your e-mail", the confirmation link, "waiting
// for board approval", and the whole life of an account made here. The e-mails are read from the mock
// mailbox. Every account gets an address of its own (the sample members are shared with other tests).

const unique = () => crypto.randomUUID().slice(0, 8);
const newEmail = () => `new.${unique()}@students.feit.ukim.edu.mk`;
const PASSWORD = 'lake-ohrid-2026';

const form = (page: Page) => page.getByRole('form', { name: 'Create your member account' });

/** React has taken over the form (before that, events on it do nothing). */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const element = document.querySelector('form[aria-label]');
    return !!element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
  });
}

async function openForm(page: Page, path = '/en/register') {
  await page.goto(path);
  await expect(form(page)).toBeVisible();
  await hydrated(page);
  // The spam guard wants a few seconds between showing the form and sending it (real time).
  await page.waitForTimeout(3200);
}

async function fillValid(page: Page, email: string, name = 'Ivo Dimitrov') {
  const f = form(page);
  await f.getByLabel(/^Full name/).fill(name);
  await f.getByLabel(/^E-mail/).fill(email);
  await f
    .getByLabel(/^Password/, { exact: false })
    .first()
    .fill(PASSWORD);
  await f.getByLabel(/^Faculty/).selectOption({ index: 1 });
  await f.getByText('2nd', { exact: true }).click();
  await f.getByRole('checkbox', { name: /I agree that/ }).check();
}

const submit = (page: Page) => form(page).getByRole('button', { name: 'Create account' });

async function mailTo(page: Page, email: string, kind: string) {
  const response = await page.request.get(`/api/dev-mailbox?to=${encodeURIComponent(email)}`);
  const { mail } = (await response.json()) as { mail: { kind: string; link: string | null }[] };
  return mail.find((item) => item.kind === kind)?.link ?? null;
}

test.describe('sign-up form (M14c)', () => {
  test('the card: fields, rules under the password, visibility defaults to "Members only"', async ({
    page,
  }) => {
    await page.goto('/en/register');
    await expect(page.getByRole('heading', { level: 1, name: 'Create your member account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apply on Join Us' })).toHaveAttribute('href', '/en/join');
    const f = form(page);
    await expect(f.getByLabel(/^Faculty/).locator('option')).not.toHaveCount(1);
    await expect(f.getByLabel(/^Phone/)).toBeVisible();
    for (const rule of ['At least 10 characters', 'Not your e-mail or name', 'Not a common password'])
      await expect(f.getByText(rule)).toBeVisible();
    await expect(f.getByRole('radio', { name: /Members only/ })).toBeChecked();
    await expect(f.getByRole('radio', { name: /Public/ })).not.toBeChecked();
    await expect(f.getByText('You can change this any time in My profile.')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('the rules are ticked as you type', async ({ page }) => {
    await page.goto('/en/register');
    const f = form(page);
    const rule = (name: string) => f.getByRole('listitem').filter({ hasText: name });
    await expect(rule('At least 10 characters')).toContainText('✗');
    await f
      .getByLabel(/^Password/)
      .first()
      .fill('lake-ohrid-2026');
    await expect(rule('At least 10 characters')).toContainText('✓');
    await expect(rule('Not a common password')).toContainText('✓');
    await f
      .getByLabel(/^Password/)
      .first()
      .fill('password123');
    await expect(rule('Not a common password')).toContainText('✗');
  });

  test('an empty form shows the summary with focus, and each field its own error', async ({ page }) => {
    await openForm(page);
    await submit(page).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix' });
    await expect(summary).toBeFocused();
    for (const name of ['Full name', 'E-mail', 'Password', 'Faculty', 'Year of study', 'Consent'])
      await expect(summary.getByRole('link', { name })).toBeVisible();
    await expect(page.locator('#reg-name-error')).toContainText('This is required');
    await expect(page.locator('#reg-consent-error')).toContainText('Please agree');
    await summary.getByRole('link', { name: 'Full name' }).click();
    await expect(page.locator('#reg-name')).toBeFocused();
  });

  test('a registered e-mail is named, and the error offers to log in', async ({ page }) => {
    await openForm(page);
    await fillValid(page, 'marija.s@students.feit.ukim.edu.mk');
    await submit(page).click();
    await expect(page.locator('#reg-email-error')).toContainText('Already registered.');
    await expect(page.locator('#reg-email-error').getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/en/login',
    );
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 1 field' });
    await expect(summary).toContainText('E-mail is already registered');
    await expect(summary).toBeFocused();
  });

  test('a short password is named, before anything is sent', async ({ page }) => {
    await openForm(page);
    await fillValid(page, newEmail());
    await form(page)
      .getByLabel(/^Password/)
      .first()
      .fill('elena123');
    await submit(page).click();
    await expect(page.locator('#reg-password-error')).toContainText('Use at least 10 characters');
    await expect(page.getByRole('alert').filter({ hasText: 'Please fix 1 field' })).toContainText(
      'Password is too short',
    );
  });

  test('a password made of the name is refused with its own message', async ({ page }) => {
    await openForm(page);
    await fillValid(page, newEmail(), 'Ivo Dimitrov');
    await form(page)
      .getByLabel(/^Password/)
      .first()
      .fill('ivodimitrov12');
    await submit(page).click();
    await expect(page.locator('#reg-password-error')).toContainText('Don’t use your e-mail or name');
  });

  test('a photo: a PNG shows as a preview, a GIF is refused', async ({ page }) => {
    await page.goto('/en/register');
    await hydrated(page);
    const input = page.locator('#reg-photo');
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    await input.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('img', { name: 'Your chosen photo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove photo' }).click();
    await expect(page.getByRole('img', { name: 'Your chosen photo' })).toHaveCount(0);
    await input.setInputFiles({ name: 'me.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
    await expect(page.locator('#reg-photo-error')).toContainText('Use a JPG or PNG photo');
  });

  test('a bot that fills the hidden field is refused', async ({ page }) => {
    await openForm(page);
    await fillValid(page, newEmail());
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[name="website"]');
      if (input) input.value = 'http://spam.example';
    });
    await submit(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'couldn’t create the account' })).toBeVisible();
  });

  test('Macedonian: the labels and the rules are translated', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1, name: 'Направи своја членска сметка' })).toBeVisible();
    await expect(page.getByText('Најмалку 10 знаци')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Само членови/ })).toBeChecked();
  });

  test('phones: nothing scrolls sideways, and the form passes axe in every state', async ({ page }) => {
    await page.goto('/en/register');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await seriousViolations(page)).toEqual([]);
    await page.waitForTimeout(3200);
    await submit(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Please fix' })).toBeFocused();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('sign-up, e-mail link and approval (M14c)', () => {
  test('the whole life of an account: sign up, confirm, wait, forgot password, reset, log in', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'creates an account: run once');
    const email = newEmail();

    // 1. Sign up → "Confirm your e-mail" with the three steps.
    await openForm(page);
    await fillValid(page, email);
    await submit(page).click();
    const confirm = page.getByRole('status').filter({ hasText: 'Confirm your e-mail' });
    await expect(confirm.getByRole('heading', { name: 'Confirm your e-mail' })).toBeFocused();
    await expect(confirm).toContainText(email);
    await expect(confirm).toContainText('The link works for 24 hours.');
    await expect(page.getByRole('listitem').filter({ hasText: 'Board approval' })).toContainText(
      'Usually within 3 days',
    );
    expect(await seriousViolations(page)).toEqual([]);

    // 2. Logging in before confirming says so.
    const link = await mailTo(page, email, 'confirm');
    expect(link).toMatch(/^\/auth\/confirm\?token=/);
    await page.context().clearCookies();
    await page.goto('/en/login');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Confirm your e-mail first');
    await page.getByRole('button', { name: 'Resend e-mail' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('We sent a new link');

    // 3. The (newest) link activates the account and lands on "waiting for approval".
    const newest = await mailTo(page, email, 'confirm');
    await page.goto(newest!);
    await expect(page).toHaveURL(/\/en\/register\/pending$/);
    await expect(
      page.getByRole('heading', { name: 'E-mail confirmed. Waiting for board approval.' }),
    ).toBeVisible();
    await expect(page.getByText('Thanks, Ivo!')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Finish my profile' })).toHaveAttribute(
      'href',
      '/en/profile',
    );
    expect(await seriousViolations(page)).toEqual([]);
    // The first link is used up.
    await page.goto(link!);
    await expect(page).toHaveURL(/\/auth\/expired\?type=confirm$/);

    // 4. A pending member who opens /login sees the waiting notice instead of being sent away.
    await page.goto('/en/login');
    await expect(page.getByText('Your account is waiting for board approval')).toBeVisible();
    await expect(page.getByRole('main').getByRole('form', { name: 'Log in' })).toBeVisible();

    // 5. Forgot password → the link → a new password → signed in → the old password no longer works.
    await page.context().clearCookies();
    await page.goto('/en/forgot-password');
    await page.getByLabel('E-mail').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    const reset = await mailTo(page, email, 'reset');
    expect(reset).toMatch(/^\/en\/reset-password\?token=/);
    await page.goto(reset!);
    await expect(page.getByText(`For ${email}`)).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill('lake-ohrid-2027-new');
    await page.getByRole('button', { name: 'Save and log in' }).click();
    await expect(page).toHaveURL(/\/en\/?$/);
    // The link works once.
    await page.goto(reset!);
    await expect(page).toHaveURL(/\/en\/auth\/expired\?type=reset$/);
    await page.context().clearCookies();
    await page.goto('/en/login');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('E-mail or password is wrong');
    await page.getByLabel('Password', { exact: true }).fill('lake-ohrid-2027-new');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    // A pending member lands on the waiting page.
    await expect(page).toHaveURL(/\/en\/register\/pending$/);
  });

  test('"Wrong e-mail? Change it" comes back to the form with what was typed, and a new link goes to the new address', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'creates an account: run once');
    const wrong = newEmail();
    const right = newEmail();
    await openForm(page);
    await fillValid(page, wrong, 'Ana Ilieva');
    await submit(page).click();
    await expect(page.getByRole('heading', { name: 'Confirm your e-mail' })).toBeVisible();
    await page.getByRole('button', { name: 'Wrong e-mail? Change it' }).click();
    await expect(form(page).getByLabel(/^Full name/)).toHaveValue('Ana Ilieva');
    await expect(form(page).getByLabel(/^E-mail/)).toHaveValue(wrong);
    await form(page)
      .getByLabel(/^E-mail/)
      .fill(right);
    await form(page)
      .getByLabel(/^Password/)
      .first()
      .fill(PASSWORD);
    await form(page)
      .getByLabel(/^Faculty/)
      .selectOption({ index: 1 });
    await form(page)
      .getByRole('checkbox', { name: /I agree that/ })
      .check();
    await page.waitForTimeout(3200);
    await submit(page).click();
    await expect(page.getByRole('heading', { name: 'Confirm your e-mail' })).toBeVisible();
    expect(await mailTo(page, right, 'confirm')).toMatch(/^\/auth\/confirm\?token=/);
  });

  test('an old or made-up confirmation link goes to "This link has expired"', async ({ page }) => {
    for (const token of ['sample-expired-confirm', 'made-up', '']) {
      await page.goto(`/auth/confirm${token ? `?token=${token}` : ''}`);
      await expect(page).toHaveURL(/\/auth\/expired\?type=confirm$/);
      await expect(
        page
          .getByRole('heading', { level: 1, name: 'Този линк истече' })
          .or(page.getByRole('heading', { level: 1, name: 'Овој линк истече' })),
      ).toBeVisible();
    }
  });

  test('the sample pending member (Elena) logs in and lands on the waiting page', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel('E-mail').fill('elena.p@students.finki.ukim.mk');
    await page.getByLabel('Password', { exact: true }).fill(SAMPLE_PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/register\/pending$/);
    await expect(page.getByText('Thanks, Elena!')).toBeVisible();
    await expect(page.getByText('Pending since')).toBeVisible();
  });

  test('the waiting page is for pending members only', async ({ page }) => {
    await page.goto('/en/register/pending');
    await expect(page).toHaveURL(/\/en\/login$/);
    await page.goto('/en/login');
    await page.getByLabel('E-mail').fill('marija.s@students.feit.ukim.edu.mk');
    await page.getByLabel('Password', { exact: true }).fill(SAMPLE_PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.goto('/en/register/pending');
    await expect(page).toHaveURL(/\/en\/?$/);
    // A member who is signed in has no use for the sign-up form either.
    await page.goto('/en/register');
    await expect(page).toHaveURL(/\/en\/?$/);
  });
});
