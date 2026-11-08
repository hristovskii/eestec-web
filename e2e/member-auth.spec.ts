import { expect, type Page, test } from '@playwright/test';

import { SAMPLE_PASSWORD } from '../src/features/auth/data/fixtures/personas';
import { seriousViolations } from './support/axe';

// Member log in, forgot password, reset and expired links (M14b). The e-mails the flow would send are
// read from the mock mailbox. Reset links are looked at, not used up: the sample members share one
// store with other tests (the full sign-up → reset → log in path is in member-register.spec.ts).

const unique = () => crypto.randomUUID().slice(0, 8);

async function logIn(page: Page, email: string, password: string, path = '/en/login') {
  await page.goto(path);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

const notice = (page: Page) => page.getByRole('main').getByRole('alert');

test.describe('log in (M14b)', () => {
  test('the card: title, fields, "Keep me logged in" on, forgot link, create account, no SSO', async ({
    page,
  }) => {
    await page.goto('/en/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
    await expect(page.getByText('For EESTEC LC Skopje members.')).toBeVisible();
    await expect(page.getByLabel('E-mail')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
    await expect(page.getByRole('checkbox', { name: 'Keep me logged in' })).toBeChecked();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/en/forgot-password',
    );
    await expect(page.getByRole('link', { name: 'Create a member account' })).toHaveAttribute(
      'href',
      '/en/register',
    );
    // "Log in with eestec.net" is hidden (rules: only if EESTEC International offers SSO).
    await expect(page.getByRole('main').getByText(/eestec\.net/)).toHaveCount(0);
    // The page is for people, not search engines.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('the eye shows and hides the password', async ({ page }) => {
    await page.goto('/en/login');
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('secret-words');
    const eye = page.getByRole('button', { name: 'Show password' });
    await eye.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('empty fields are named, and nothing is sent', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('#login-email-error')).toContainText('This is required');
    await expect(page.locator('#login-password-error')).toContainText('This is required');
    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test('a wrong password gives one message that does not say which field was wrong, and takes focus', async ({
    page,
  }) => {
    const email = `nobody-${unique()}@example.com`;
    await logIn(page, email, 'wrong-password');
    await expect(notice(page)).toContainText('E-mail or password is wrong');
    await expect(notice(page).locator('xpath=..')).toBeFocused();
    await expect(page.getByLabel('E-mail')).toHaveValue(email);
    await notice(page).getByRole('link', { name: 'reset your password' }).click();
    await expect(page).toHaveURL(/\/en\/forgot-password$/);
  });

  test('five wrong tries pause logging in, even for the right password', async ({ page }) => {
    const email = `lock-${unique()}@example.com`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.goto('/en/login');
      await page.getByLabel('E-mail').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('nope');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await expect(notice(page)).toBeVisible();
    }
    await expect(notice(page)).toContainText('Too many attempts');
    await expect(notice(page)).toContainText('15 minutes');
  });

  test('a member logs in and lands on the page they came from', async ({ page }) => {
    await logIn(page, 'marija.s@students.feit.ukim.edu.mk', SAMPLE_PASSWORD, '/en/login?next=/en/events');
    await expect(page).toHaveURL(/\/en\/events$/);
    // The header knows her: no "Log in" any more.
    await expect(page.locator('header').getByRole('link', { name: 'Log in' })).toHaveCount(0);
  });

  test('"next" never leaves the site', async ({ page }) => {
    await logIn(page, 'marija.s@students.feit.ukim.edu.mk', SAMPLE_PASSWORD, '/en/login?next=//evil.example');
    await expect(page).toHaveURL(/\/en\/?$/);
  });

  test('a logged-in member who opens /login is sent on', async ({ page }) => {
    await logIn(page, 'marija.s@students.feit.ukim.edu.mk', SAMPLE_PASSWORD);
    await expect(page).toHaveURL(/\/en\/?$/);
    await page.goto('/en/login');
    await expect(page).toHaveURL(/\/en\/?$/);
  });

  test('a board account is sent to the admin log-in (the 2-step check cannot be skipped)', async ({
    page,
  }) => {
    await logIn(page, 'ana.t@eestec.mk', SAMPLE_PASSWORD);
    await expect(notice(page)).toContainText('This is a board account');
    await expect(notice(page).getByRole('link', { name: 'admin log-in' })).toHaveAttribute(
      'href',
      '/admin/login',
    );
    // No session was started.
    await page.goto('/admin/login');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('Macedonian: the labels are translated', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Најава' })).toBeVisible();
    await expect(page.getByLabel('Е-пошта')).toBeVisible();
    await expect(page.getByLabel('Лозинка', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Направи членска сметка' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  test('phones: nothing scrolls sideways', async ({ page }) => {
    await page.goto('/en/login');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('forgot password (M14b)', () => {
  test('asks for the e-mail, then says "Check your inbox" with a countdown for "Resend"', async ({
    page,
  }) => {
    await page.goto('/en/forgot-password');
    await expect(page.getByRole('heading', { level: 1, name: 'Forgot your password?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/en/login');
    await page.getByLabel('E-mail').fill(`nobody-${unique()}@example.com`);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const status = page.getByRole('status');
    await expect(status.getByRole('heading', { name: 'Check your inbox' })).toBeFocused();
    await expect(status).toContainText(
      'has an account, a reset link is on its way. It works for 30 minutes.',
    );
    await expect(page.getByRole('button', { name: /^Resend in 0:\d\d$/ })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Back to log in' })).toBeVisible();
  });

  test('an e-mail with an account gets a link, and gets the same answer as everybody', async ({
    page,
    request,
  }) => {
    await page.goto('/en/forgot-password');
    await page.getByLabel('E-mail').fill('elena.p@students.finki.ukim.mk');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('status')).toContainText('elena.p@students.finki.ukim.mk');
    const { mail } = (await (
      await request.get('/api/dev-mailbox?to=elena.p@students.finki.ukim.mk')
    ).json()) as {
      mail: { kind: string; link: string }[];
    };
    expect(mail.find((item) => item.kind === 'reset')?.link).toMatch(/^\/en\/reset-password\?token=/);
  });

  test('a wrong e-mail address is named, nothing is sent', async ({ page }) => {
    await page.goto('/en/forgot-password');
    await page.getByLabel('E-mail').fill('not-an-email');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.locator('#forgot-email-error')).toContainText('Enter a valid e-mail address');
  });
});

test.describe('reset password and expired links (M14b)', () => {
  test('a good link shows whose password it is, with strength bars, and checks the rules', async ({
    page,
  }) => {
    await page.goto('/en/reset-password?token=sample-valid-reset');
    await expect(page.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeVisible();
    await expect(page.getByText('For marija.s@students.feit.ukim.edu.mk')).toBeVisible();
    const field = page.getByLabel('New password', { exact: true });
    await field.fill('blue-river');
    await expect(page.getByText('Strength: Fair')).toBeVisible();
    await field.fill('lake-ohrid-2026');
    await expect(page.getByText('Strength: Good')).toBeVisible();
    await expect(page.getByText('This logs you out on your other devices.')).toBeVisible();
    // A weak one is refused with the reason, and the link is still good.
    await field.fill('short');
    await page.getByRole('button', { name: 'Save and log in' }).click();
    await expect(page.locator('#reset-password-error')).toContainText('Use at least 10 characters');
    await field.fill('marijastojanovska1');
    await page.getByRole('button', { name: 'Save and log in' }).click();
    await expect(page.locator('#reset-password-error')).toContainText('Don’t use your e-mail or name');
  });

  test('an expired or unknown link goes to "This link has expired"', async ({ page }) => {
    for (const token of ['sample-expired-reset', 'made-up', '']) {
      await page.goto(`/en/reset-password${token ? `?token=${token}` : ''}`);
      await expect(page).toHaveURL(/\/en\/auth\/expired\?type=reset$/);
      await expect(page.getByRole('heading', { level: 1, name: 'This link has expired' })).toBeVisible();
    }
  });

  test('"This link has expired" asks for a new link, and ends in "Check your inbox"', async ({ page }) => {
    await page.goto('/en/auth/expired?type=reset');
    await expect(
      page.getByText('Confirmation links work for 24 hours and reset links for 30 minutes.'),
    ).toBeVisible();
    await page.getByLabel('E-mail').fill(`nobody-${unique()}@example.com`);
    await page.getByRole('button', { name: 'Send a new link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  });

  test('a confirmation link that expired asks for a confirmation, not a password reset', async ({ page }) => {
    await page.goto('/en/auth/expired?type=confirm');
    await page.getByLabel('E-mail').fill(`nobody-${unique()}@example.com`);
    await page.getByRole('button', { name: 'Send a new link' }).click();
    await expect(page.getByRole('status')).toContainText(
      'Click it to activate your account. It works for 24 hours.',
    );
  });
});

test.describe('accessibility (M14b)', () => {
  test('log in, its error, forgot, sent, reset and expired have no serious violations', async ({ page }) => {
    await page.goto('/en/login');
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByLabel('E-mail').fill(`nobody-${unique()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(notice(page)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto('/en/forgot-password');
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByLabel('E-mail').fill(`nobody-${unique()}@example.com`);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto('/en/reset-password?token=sample-valid-reset');
    await page.getByLabel('New password', { exact: true }).fill('lake-ohrid-2026');
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto('/en/auth/expired?type=reset');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the component lab has the screens', async ({ page }) => {
    await page.goto('/en/design-system');
    const lab = page.locator('#auth-states');
    await lab.scrollIntoViewIfNeeded();
    await expect(lab.getByRole('form', { name: 'Log in' }).first()).toBeVisible();
    await expect(lab.getByText('Your account is waiting for board approval')).toBeVisible();
  });
});
