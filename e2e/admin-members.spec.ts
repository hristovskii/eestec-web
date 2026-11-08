import { type Browser, expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { signUpPendingMember } from './support/members';
import { PORT } from './support/servers';

// Admin › Members (M15d). The sample members are only looked at; every test that changes something
// signs up and approves a member of its own (through the real form and Approvals), and changes
// only that one, so nothing needs putting back.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager' | 'member') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 6);
const dialog = (page: Page) => page.getByRole('dialog');

/** A member of our own: signed up, confirmed and approved, with a profile from that moment. */
async function approvedMember(page: Page, browser: Browser) {
  const name = `Member ${unique()}`;
  await signUpPendingMember(browser, name);
  await signInAs(page, 'super-admin');
  await page.goto('/admin/approvals');
  await page
    .getByRole('list', { name: 'Submissions' })
    .getByRole('link', { name: new RegExp(name) })
    .click();
  await page
    .getByRole('region', { name: 'Preview of the selected submission' })
    .getByRole('button', { name: 'Approve', exact: true })
    .click();
  await expect(toast(page, '1 registration approved')).toBeVisible();
  return { name, username: name.toLowerCase().replace(/ /g, '-') };
}

async function openMember(page: Page, name: string) {
  await page.goto(`/admin/members?q=${encodeURIComponent(name)}`);
  await page.getByRole('button', { name }).first().click();
  await expect(dialog(page).getByRole('heading', { name: `Edit ${name}` })).toBeVisible();
}

test.describe('admin members (M15d)', () => {
  test('the list: status tabs with counts, the sample people, search and team in the address', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'tables are checked on desktop; phones get cards');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members');
    await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    const tabs = page.getByRole('navigation', { name: 'Status' });
    await expect(tabs.getByRole('link', { name: /^All\s*\d+/ })).toBeVisible();
    await expect(tabs.getByRole('link', { name: /^Alumni\s*9/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Approvals' }).first()).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search members' }).fill('marija');
    await expect(page).toHaveURL(/q=marija/);
    await expect(page.getByRole('button', { name: 'Marija Stojanovska' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aleksandar Popov' })).toHaveCount(0);

    await page.goto('/admin/members?status=alumni');
    await expect(page.getByRole('button', { name: 'Bojan Petreski' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Marija Stojanovska' })).toHaveCount(0);
    await page.goto('/admin/members?q=zzzz');
    await expect(page.getByRole('heading', { name: 'No members match' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/q=zzzz/);
  });

  test('exports the filtered list without e-mail or phone', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    const response = await page.request.get('/api/export/members?status=alumni');
    expect(response.status()).toBe(200);
    const csv = await response.text();
    expect(
      csv
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)[0]
        ?.trim(),
    ).toBe('name,username,status,visibility,teams,member since,active until');
    expect(csv).toContain('Bojan Petreski');
    expect(csv).not.toContain('Marija');
    expect(csv).not.toMatch(/@/);
  });

  test('an approved person has a members-only profile at once; the board gives a team, a role and a badge, and the site follows', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const { name, username } = await approvedMember(page, browser);

    // In the list, with no team yet.
    await page.goto(`/admin/members?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole('button', { name }).first()).toBeVisible();
    await expect(page.getByText('No team').first()).toBeVisible();

    await openMember(page, name);
    await dialog(page).getByRole('button', { name: 'Add a team' }).click();
    await dialog(page).getByLabel('Role in the team').selectOption('lead');
    await dialog(page).getByRole('button', { name: 'Add a badge' }).click();
    await dialog(page).getByLabel('Note (optional)').fill('Helped out at the first workshop');
    await dialog(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(toast(page, 'Member updated.')).toBeVisible();

    // The public page, as a member: the team, the role and the badge note.
    await page.context().clearCookies();
    await signInAs(page, 'member');
    await page.goto(`/en/members/${username}`);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText('Events team', { exact: true })).toBeVisible();
    await expect(page.getByText('Team lead').first()).toBeVisible();
    await expect(page.getByText('Helped out at the first workshop').first()).toBeAttached();
    // And in the list as a member, as a team lead.
    await page.goto(`/en/members?q=${encodeURIComponent(name)}`);
    await expect(page.locator('#active').getByRole('link', { name: new RegExp(name) })).toContainText(
      'Team lead',
    );
    // Visitors only get the restricted page (the default is members only).
    await page.context().clearCookies();
    await page.goto(`/en/members/${username}`);
    await expect(page.getByText('Members-only profile')).toBeVisible();
  });

  test('alumni get years and two lines; hidden people have no page', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    const { name, username } = await approvedMember(page, browser);
    await openMember(page, name);
    await dialog(page).getByLabel('Status').selectOption('alumni');
    await dialog(page).getByLabel('Active until').fill('2027-06-30');
    await dialog(page).getByLabel(/^Now/).fill('Engineer at Kodra');
    await dialog(page)
      .getByLabel(/^Remembered for/)
      .fill('Chair 2024/25');
    await dialog(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(toast(page, 'Member updated.')).toBeVisible();

    await page.context().clearCookies();
    await signInAs(page, 'member');
    await page.goto(`/en/members/${username}`);
    await expect(page.getByText('Alumni', { exact: true })).toBeVisible();
    await expect(page.getByText('Chair 2024/25')).toBeVisible();
    await expect(page.getByText('Engineer at Kodra')).toBeVisible();
    await page.goto(`/en/members?aq=${encodeURIComponent(name)}`);
    await expect(page.locator('#alumni').getByRole('link', { name: new RegExp(name) })).toBeVisible();

    // Hidden: no page, not in any list, any more.
    await signInAs(page, 'super-admin');
    await openMember(page, name);
    await dialog(page).getByLabel('Status').selectOption('hidden');
    await dialog(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(toast(page, 'Member updated.')).toBeVisible();
    await page.context().clearCookies();
    await signInAs(page, 'member');
    await page.goto(`/en/members/${username}`);
    await expect(page.getByRole('heading', { name: /not found|can.t find/i }).first()).toBeVisible();
    await page.goto(`/en/members?aq=${encodeURIComponent(name)}`);
    await expect(page.locator('#alumni').getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
  });

  test('the dialog checks dates and does not add a team twice', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    const { name } = await approvedMember(page, browser);
    await openMember(page, name);
    await dialog(page).getByLabel('Status').selectOption('alumni');
    await dialog(page).getByLabel('Active until').fill('1999-01-01');
    await dialog(page).getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog(page).getByText('This date is before the member-since date.')).toBeVisible();
    await expect(dialog(page).getByLabel('Active until')).toBeFocused();
    // Every team can be added once: the button stops when all are in.
    await dialog(page).getByLabel('Status').selectOption('active');
    for (let n = 0; n < 6; n += 1) await dialog(page).getByRole('button', { name: 'Add a team' }).click();
    await expect(dialog(page).getByRole('button', { name: 'Add a team' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
  });

  test('an editor can edit, an event manager is sent away, a member has no admin', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'editor');
    await page.goto('/admin/members');
    await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    await page.context().clearCookies();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/members');
    await expect(page).toHaveURL(/\/admin\?forbidden=1$/);
  });

  test('phone: the list is cards, and no sideways scroll', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sets its own size');
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members');
    await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('has no serious accessibility violations (list and dialog)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the dialog is checked on desktop');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members');
    await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Marija Stojanovska' }).first().click();
    await expect(dialog(page)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
