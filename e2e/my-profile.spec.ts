import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import {
  approveMember,
  createApprovedMember,
  hydrated,
  logInAs,
  signUpPendingMember,
} from './support/members';
import { PORT } from './support/servers';

// /profile (M16b): header, section menu, the Profile card with its save bar, photo and crop,
// Visibility, and the waiting-for-approval version. Tests that change data use a member of their own
// (signed up and approved here): the sample members are shared by tests running at once.

const asSample = (page: Page) =>
  page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 8);
const profileForm = (page: Page) => page.getByRole('form', { name: 'Profile', exact: true });
const FORM = 'form[aria-label="Profile"] input';

// A 1×1 PNG: enough for the crop dialog to open and cut a square from.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('my profile (M16b)', () => {
  test('a visitor is sent to log in and comes back to /profile', async ({ page }) => {
    await page.goto('/en/profile');
    await expect(page).toHaveURL(/\/en\/login\?next=%2Fprofile$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
  });

  test('the sample member: header, menu, her details and what the board set', async ({ page }) => {
    await asSample(page);
    await page.goto('/en/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'My profile' })).toBeVisible();
    await expect(page.locator('strong', { hasText: 'marija.s@students.feit.ukim.edu.mk' })).toBeVisible();
    await expect(page.getByTestId('visibility-chip')).toHaveText('Visible to members only');
    await expect(page.getByRole('link', { name: 'View my public profile' })).toHaveAttribute(
      'href',
      '/en/members/marija-stojanovska',
    );

    const menu = page.getByRole('navigation', { name: 'My profile sections' });
    await expect(menu.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'true');
    await expect(menu.getByRole('link', { name: 'Visibility' })).toHaveAttribute('href', '#visibility');

    const form = profileForm(page);
    await expect(form.getByLabel('Full name')).toHaveValue('Marija Stojanovska');
    await expect(form.getByLabel('Profile address')).toHaveValue('marija-stojanovska');
    await expect(form.getByLabel(/^Short bio/)).toHaveValue(/Third-year Computer Hardware student/);
    await expect(form.getByLabel(/^Faculty/)).toHaveValue('FEEIT');
    await expect(form.getByLabel(/^Year of study/)).toHaveValue('3');
    await expect(form.getByLabel(/^LinkedIn/)).toHaveValue('https://linkedin.com/in/marija-stojanovska');
    await expect(form.getByLabel(/^Phone/)).toHaveValue('070 123 456');
    // Set by the board: read-only facts.
    await expect(form.getByText('Set by the board')).toBeVisible();
    await expect(form.getByText('Team lead')).toBeVisible();
    await expect(form.getByText('Oct 2023')).toBeVisible();
    await expect(form.getByRole('link', { name: 'members@eestec.mk' })).toHaveAttribute(
      'href',
      'mailto:members@eestec.mk',
    );
    // Nothing to save yet: no save bar.
    await expect(form.getByText('Unsaved changes')).toHaveCount(0);
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await asSample(page);
    await page.goto('/en/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'My profile' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('Macedonian page', async ({ page }) => {
    await asSample(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'Мојот профил' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Кој го гледа мојот профил' })).toBeVisible();
  });

  test('phone: one column, a row of menu pills, no sideways scroll', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout');
    await asSample(page);
    await page.goto('/en/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'My profile' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'My profile sections' }).getByRole('link', { name: 'Visibility' }),
    ).toBeVisible();
    // The row of pills scrolls inside its own box: the box itself stays within the screen.
    const menu = await page
      .getByRole('navigation', { name: 'My profile sections' })
      .evaluate((element) => element.getBoundingClientRect().right - document.documentElement.clientWidth);
    expect(menu).toBeLessThanOrEqual(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('edits are kept until saved: save bar, discard, save, and the public page shows them', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Profile ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, FORM);
    const form = profileForm(page);

    const bio = form.getByLabel(/^Short bio/);
    await bio.fill('Hello from the test.');
    await expect(form.getByText('Unsaved changes')).toBeVisible();
    await expect(form.getByText('20 / 400')).toBeVisible();
    await form.getByRole('button', { name: 'Discard' }).click();
    await expect(bio).toHaveValue('');
    await expect(form.getByText('Unsaved changes')).toHaveCount(0);

    await bio.fill('Hello from the test.');
    await form.getByLabel(/^LinkedIn/).fill('https://www.linkedin.com/in/test-person');
    await form.getByLabel(/^Phone/).fill('070 555 111');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(toast(page, 'Profile saved')).toBeVisible();
    await expect(form.getByText('Unsaved changes')).toHaveCount(0);

    // Kept after a reload.
    await page.reload();
    await expect(profileForm(page).getByLabel(/^Short bio/)).toHaveValue('Hello from the test.');
    await expect(profileForm(page).getByLabel(/^Phone/)).toHaveValue('070 555 111');

    // The public page (as a member) shows the bio and the link.
    await page.goto(`/en/members/${me.username}`);
    await expect(page.getByText('Hello from the test.')).toBeVisible();
  });

  test('mistakes: an error summary, a taken address, a link on the wrong site', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Profile ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, FORM);
    const form = profileForm(page);

    await form.getByLabel(/^Short bio/).fill('x'.repeat(401));
    await form.getByLabel(/^GitHub/).fill('https://gitlab.com/someone');
    await form.getByLabel('Profile address').fill('marija-stojanovska');
    await form.getByRole('button', { name: 'Save changes' }).click();
    const summary = form.getByRole('alert').filter({ hasText: 'Please fix' });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Please fix 2 fields');
    await expect(form.locator('#mp-bio-error')).toHaveText('Keep your bio to 400 characters.');
    await expect(form.locator('#mp-github-error')).toHaveText('This is not a GitHub address.');

    // The address is only found to be taken by the server.
    await form.getByLabel(/^Short bio/).fill('ok');
    await form.getByLabel(/^GitHub/).fill('');
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(form.locator('#mp-username-error')).toHaveText('Someone already uses this address.');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('a new profile address works at once and the old one is gone', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Profile ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, FORM);
    const next = `new-${unique()}`;
    await profileForm(page).getByLabel('Profile address').fill(next.toUpperCase());
    await profileForm(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(toast(page, 'Profile saved')).toBeVisible();

    await page.goto(`/en/members/${next}`);
    await expect(page.getByRole('heading', { level: 1, name: me.name })).toBeVisible();
    const old = await page.goto(`/en/members/${me.username}`);
    expect(old?.status()).toBe(200);
    await expect(page.getByText(/not found|couldn’t find|can’t find/i).first()).toBeVisible();
  });

  test('visibility is saved at once, and "See what visitors see" shows the visitor page', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Profile ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, 'input[name="visibility"]');
    await expect(page.getByTestId('visibility-chip')).toHaveText('Visible to members only');

    const visibility = page.getByRole('group', { name: 'Profile visibility' });
    await visibility.getByRole('radio', { name: /^Public/ }).check();
    await expect(toast(page, 'Visibility saved')).toBeVisible();
    await expect(page.getByTestId('visibility-chip')).toHaveText('Visible to everyone');

    // The preview: the member's own page as a visitor gets it, with the way back.
    await page.getByRole('link', { name: 'See what visitors see →' }).click();
    await expect(page).toHaveURL(new RegExp(`/en/members/${me.username}\\?preview=visitor$`));
    await expect(page.getByText('This is what visitors see')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: me.name })).toBeVisible();
    await page.getByRole('link', { name: 'Back to My profile' }).click();
    await expect(page).toHaveURL(/\/en\/profile$/);

    // Back to members only: visitors now get the restricted page.
    await hydrated(page, 'input[name="visibility"]');
    await page
      .getByRole('group', { name: 'Profile visibility' })
      .getByRole('radio', { name: /^Members only/ })
      .check();
    await expect(page.getByTestId('visibility-chip')).toHaveText('Visible to members only');
    await page.getByRole('link', { name: 'See what visitors see →' }).click();
    await expect(page.getByText('shares their profile with members only')).toBeVisible();
  });

  test('photo: pick, adjust in the dialog, use it, remove it; wrong files are refused', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Profile ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, FORM);
    const form = profileForm(page);
    const input = form.locator('input[type="file"]');

    await input.setInputFiles({ name: 'cv.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
    await expect(form.getByText('Use a JPG or PNG picture.')).toBeVisible();

    await input.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
    const dialog = page.getByRole('dialog', { name: 'Adjust your photo' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Drag the picture to move it.')).toBeVisible();
    await dialog.getByLabel('Zoom').fill('2');
    await dialog.getByTestId('crop-area').press('ArrowLeft');
    await expect(dialog.getByRole('button', { name: 'Use photo' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(form.getByRole('img', { name: /^Photo of/ })).toHaveCount(0);

    await input.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
    await dialog.getByRole('button', { name: 'Use photo' }).click();
    await expect(form.getByRole('img', { name: `Photo of ${me.name}` })).toBeVisible();
    await page.reload();
    await hydrated(page, FORM);
    await expect(profileForm(page).getByRole('img', { name: `Photo of ${me.name}` })).toBeVisible();

    await profileForm(page).getByRole('button', { name: 'Remove' }).click();
    await expect(profileForm(page).getByRole('img', { name: /^Photo of/ })).toHaveCount(0);
  });

  test('leaving with unsaved changes asks first', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'changes data: run once (the header links live in a menu on phones)');
    const me = await createApprovedMember(browser, `Profile ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, FORM);
    await profileForm(page)
      .getByLabel(/^Short bio/)
      .fill('Not saved yet');
    await page.locator('header').getByRole('link', { name: 'Events', exact: true }).first().click();
    const dialog = page.getByRole('alertdialog', { name: 'Leave without saving?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(page).toHaveURL(/\/en\/profile$/);
    await expect(profileForm(page).getByLabel(/^Short bio/)).toHaveValue('Not saved yet');
    await page.locator('header').getByRole('link', { name: 'Events', exact: true }).first().click();
    await page
      .getByRole('alertdialog', { name: 'Leave without saving?' })
      .getByRole('button', { name: 'Leave and discard' })
      .click();
    await expect(page).toHaveURL(/\/en\/events$/);
  });

  test('waiting for the board: a banner, no public page, a draft that is used at approval', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const name = `Waiting ${unique()}`;
    const email = await signUpPendingMember(browser, name);
    await logInAs(page, email);
    await page.goto('/en/profile');
    await hydrated(page, FORM);
    await expect(page.getByText('Your account is waiting for board approval')).toBeVisible();
    await expect(page.getByTestId('visibility-chip')).toHaveText('Not visible yet');
    await expect(page.getByRole('link', { name: 'View my public profile' })).toHaveCount(0);
    await expect(page.locator('#visibility').getByText('Available after approval')).toBeVisible();
    await expect(page.locator('#applications').getByText('Available after approval')).toBeVisible();

    await profileForm(page)
      .getByLabel(/^Short bio/)
      .fill('Written while waiting.');
    await profileForm(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(toast(page, 'Profile saved')).toBeVisible();

    // Nobody sees it yet.
    const username = name.toLowerCase().replace(/ /g, '-');
    await page
      .context()
      .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);
    const before = await page.goto(`/en/members/${username}`);
    expect(before?.status()).toBe(200);
    await expect(page.getByText('Written while waiting.')).toHaveCount(0);

    // Approved: the draft is the profile.
    await approveMember(browser, name);
    await page.goto(`/en/members/${username}`);
    await expect(page.getByText('Written while waiting.')).toBeVisible();
  });
});
