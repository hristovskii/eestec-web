import { expect, type Browser, type Page } from '@playwright/test';

import { PORT } from './servers';

/** Another address for every test: the sample members are shared by tests running at once. */
export const uniqueEmail = (prefix = 'new') =>
  `${prefix}.${crypto.randomUUID().slice(0, 8)}@students.feit.ukim.edu.mk`;

export const MEMBER_PASSWORD = 'lake-ohrid-2026';

/**
 * A member who signed up and confirmed the e-mail (so they wait in Approvals › Member registrations):
 * through the real form and the real link from the mock mailbox, in a browser of their own.
 */
export async function signUpPendingMember(browser: Browser, name: string): Promise<string> {
  const email = uniqueEmail();
  const context = await browser.newContext({ baseURL: `http://localhost:${PORT}` });
  const page = await context.newPage();
  try {
    await page.goto('/en/register');
    const form = page.getByRole('form', { name: 'Create your member account' });
    await expect(form).toBeVisible();
    await page.waitForFunction(() => {
      const element = document.querySelector('form[aria-label]');
      return !!element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
    });
    await page.waitForTimeout(3200);
    await form.getByLabel(/^Full name/).fill(name);
    await form.getByLabel(/^E-mail/).fill(email);
    await form
      .getByLabel(/^Password/)
      .first()
      .fill(MEMBER_PASSWORD);
    await form.getByLabel(/^Faculty/).selectOption({ index: 1 });
    await form.getByText('3rd', { exact: true }).click();
    await form.getByRole('checkbox', { name: /I agree that/ }).check();
    await form.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Confirm your e-mail' })).toBeVisible();
    const response = await page.request.get(`/api/dev-mailbox?to=${encodeURIComponent(email)}`);
    const { mail } = (await response.json()) as { mail: { kind: string; link: string | null }[] };
    const link = mail.find((item) => item.kind === 'confirm')?.link;
    expect(link).toBeTruthy();
    await page.goto(link!);
    await expect(page).toHaveURL(/\/en\/register\/pending$/);
  } finally {
    await context.close();
  }
  return email;
}

/** React has taken over the first element that matches (before that, typing and clicking do nothing). */
export async function hydrated(page: Page, selector: string) {
  await page.waitForFunction((css) => {
    const element = document.querySelector(css);
    return !!element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
  }, selector);
}

/** Logs in through the real form (a member who chose their own password at sign-up). */
export async function logInAs(page: Page, email: string, password = MEMBER_PASSWORD) {
  await page.goto('/en/login');
  await hydrated(page, 'form input[type="password"]');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** The board approves a registration (in a browser of its own, so the caller's session stays). */
export async function approveMember(browser: Browser, name: string) {
  const context = await browser.newContext({ baseURL: `http://localhost:${PORT}` });
  await context.addCookies([
    { name: 'eestec_mock_persona', value: 'super-admin', url: `http://localhost:${PORT}` },
  ]);
  const page = await context.newPage();
  try {
    await page.goto('/admin/approvals');
    await page
      .getByRole('list', { name: 'Submissions' })
      .getByRole('link', { name: new RegExp(name) })
      .click();
    await page
      .getByRole('region', { name: 'Preview of the selected submission' })
      .getByRole('button', { name: 'Approve', exact: true })
      .click();
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: '1 registration approved' }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
}

/** A member of our own, approved by the board: name, e-mail (password: MEMBER_PASSWORD) and profile address. */
export async function createApprovedMember(browser: Browser, name: string) {
  const email = await signUpPendingMember(browser, name);
  await approveMember(browser, name);
  return { name, email, username: name.toLowerCase().replace(/ /g, '-') };
}
