import { expect, type Page, test } from '@playwright/test';

import {
  SAMPLE_BACKUP_CODE,
  SAMPLE_PASSWORD,
  SAMPLE_TOTP_CODE,
} from '../src/features/auth/data/fixtures/personas';
import { seriousViolations } from './support/axe';

async function signIn(page: Page, email: string, password = SAMPLE_PASSWORD) {
  await page.goto('/admin/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Admin sections' }).first();

test.describe('admin foundation (M3)', () => {
  test('visitors are sent to sign-in with a real redirect', async ({ request }) => {
    const response = await request.get('/admin/events', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toMatch(/\/admin\/login$/);
  });

  test('wrong password shows attempts left and never says which field was wrong', async ({ page }) => {
    await signIn(page, 'pr@eestec.mk', 'wrong-password');
    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toContainText('E-mail or password is wrong');
    await expect(alert).toContainText('4 more tries, then sign-in pauses for 15 minutes.');
    await expect(page.getByText('Type your password again')).toBeVisible();
  });

  test('five wrong passwords pause sign-in', async ({ page }) => {
    const email = `lockout-${test.info().project.name}@example.com`;
    await signIn(page, email, 'nope');
    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toContainText('4 more tries');
    for (const left of ['3 more tries', '2 more tries', '1 more try']) {
      await page.getByPlaceholder('Password').fill('nope');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(alert).toContainText(left);
    }
    await page.getByPlaceholder('Password').fill('nope');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Sign-in is paused');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('members are told they have no admin access', async ({ page }) => {
    await signIn(page, 'marija.s@students.feit.ukim.edu.mk');
    await expect(page.getByRole('main').getByRole('alert')).toContainText('This account has no admin access');
  });

  test('super admins always get the 2-step step', async ({ page }) => {
    await signIn(page, 'ana.t@eestec.mk');
    await expect(page.getByRole('heading', { name: '2-step login' })).toBeVisible();
    await expect(page.getByText('Trust this device')).toHaveCount(0); // D12
    await page.keyboard.type('000000');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText("That code didn't work.")).toBeVisible();
    await page.keyboard.type(SAMPLE_TOTP_CODE);
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good evening, Ana');
  });

  test('a backup code works instead of the authenticator', async ({ page }) => {
    await signIn(page, 'ana.t@eestec.mk');
    await page.getByRole('button', { name: 'Use a backup code instead' }).click();
    await page.getByLabel('Backup code').fill(SAMPLE_BACKUP_CODE);
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('forgot password always confirms (no account enumeration)', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByLabel('E-mail').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Resend link in 0:4\d/ })).toBeDisabled();
  });

  test('editor: everything except Settings and Admin users', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sidebar is a drawer on mobile');
    await signIn(page, 'pr@eestec.mk');
    await expect(page).toHaveURL(/\/admin$/);
    const nav = sidebar(page);
    for (const label of [
      'Dashboard',
      'Approvals',
      'Inbox',
      'Events',
      'Applications',
      'Ideas & Feedback',
      'Home page',
      'Media library',
    ]) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Admin users' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Activity log' })).toBeVisible();
  });

  test('event manager: own events only (D18)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sidebar is a drawer on mobile');
    await signIn(page, 'daniel.r@eestec.mk');
    await expect(page).toHaveURL(/\/admin$/);
    const nav = sidebar(page);
    for (const label of ['Dashboard', 'Events', 'Applications', 'Ideas & Feedback', 'Media library']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    for (const label of ['Approvals', 'Inbox', 'Members', 'Home page', 'Settings', 'Admin users']) {
      await expect(nav.getByRole('link', { name: label })).toHaveCount(0);
    }
    await expect(page.getByRole('link', { name: 'Add event' })).toHaveCount(0);
    const table = page.getByRole('table');
    // Daniel manages Leading Teams and FPGA Basics (AdminUsers).
    await expect(table.getByRole('rowheader', { name: 'Soft Skills Training: Leading Teams' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'Hands-on: FPGA Basics' })).toBeVisible();
    await expect(table.getByRole('rowheader')).toHaveCount(2);
  });

  test('tablet shows the icon rail, mobile the drawer', async ({ page, isMobile }) => {
    await signIn(page, 'pr@eestec.mk');
    await expect(page).toHaveURL(/\/admin$/);
    if (isMobile) {
      await page.getByRole('button', { name: 'Open admin menu' }).click();
      const drawer = page.getByRole('dialog', { name: 'Admin menu' });
      await expect(drawer.getByRole('link', { name: 'Events' })).toBeVisible();
      await drawer.getByRole('link', { name: 'Inbox' }).click();
      await expect(drawer).toBeHidden();
    } else {
      await page.setViewportSize({ width: 1024, height: 800 });
      const events = sidebar(page).getByRole('link', { name: 'Events' });
      await expect(events).toBeVisible();
      expect((await events.boundingBox())?.width ?? 999).toBeLessThan(60);
    }
  });

  test('sign out returns to sign-in', async ({ page }) => {
    await signIn(page, 'pr@eestec.mk');
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole('button', { name: /^Account: Stefan Nikolovski/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('no serious accessibility violations on sign-in and dashboard', async ({ page }) => {
    await page.goto('/admin/login');
    expect(await seriousViolations(page)).toEqual([]);
    await signIn(page, 'pr@eestec.mk');
    await expect(page).toHaveURL(/\/admin$/);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
