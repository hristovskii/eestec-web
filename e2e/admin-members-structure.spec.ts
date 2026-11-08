import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Members › Teams, Badges and Board (M15e). Every test creates what it changes, with a name
// of its own, and deletes it again; the sample teams, badges and boards are only looked at.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'member') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 6);
const dialog = (page: Page) => page.getByRole('dialog');
const announced = (page: Page, text: string) =>
  expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();

test.describe('admin members: teams, badges, board (M15e)', () => {
  test('the sections are tabs in the address', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members');
    const sections = page.getByRole('navigation', { name: 'Members sections' });
    await expect(sections.getByRole('link', { name: 'Members', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await sections.getByRole('link', { name: 'Teams' }).click();
    await expect(page).toHaveURL(/tab=teams/);
    await expect(page.getByRole('heading', { level: 2, name: 'Teams' })).toBeVisible();
    await sections.getByRole('link', { name: 'Badges' }).click();
    await expect(page).toHaveURL(/tab=badges/);
    await sections.getByRole('link', { name: 'Board' }).click();
    await expect(page).toHaveURL(/tab=board/);
    await expect(page.getByRole('heading', { level: 2, name: 'Board' })).toBeVisible();
    await sections.getByRole('link', { name: 'Members', exact: true }).click();
    await expect(page).not.toHaveURL(/tab=/);
  });

  test('teams: the sample teams with their people; one with people can not be deleted', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members?tab=teams');
    const list = page.getByRole('list', { name: 'Teams' });
    await expect(list.getByRole('listitem').first()).toContainText('Events');
    await expect(list.getByRole('listitem').first()).toContainText(/\d+ members/);
    await page.getByRole('button', { name: 'Delete Events' }).click();
    const blocked = page.getByRole('alertdialog', { name: 'Events still has members' });
    await expect(blocked).toContainText('Take them out of it in Members first');
    await blocked.getByRole('button', { name: 'Got it' }).click();
    await expect(blocked).toHaveCount(0);
    await expect(list.getByRole('listitem').first()).toContainText('Events');
  });

  test('teams: add, rename, reorder with the keyboard (the chips follow), delete', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const name = `Team ${unique()}`;
    const renamed = `${name} Plus`;
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members?tab=teams');
    await page.getByRole('button', { name: 'Add team' }).click();
    await dialog(page)
      .getByLabel(/^Team name/)
      .fill(name);
    await dialog(page).getByRole('button', { name: 'Save team' }).click();
    await expect(toast(page, 'Team added.')).toBeVisible();
    const list = page.getByRole('list', { name: 'Teams' });
    await expect(list.getByRole('listitem').last()).toContainText(name);
    await expect(list.getByRole('listitem').last()).toContainText('Nobody yet');

    // The same name again is refused.
    await page.getByRole('button', { name: 'Add team' }).click();
    await dialog(page)
      .getByLabel(/^Team name/)
      .fill(name.toUpperCase());
    await dialog(page).getByRole('button', { name: 'Save team' }).click();
    await expect(dialog(page).getByText('That already exists.')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: `Edit ${name}` }).click();
    await dialog(page)
      .getByLabel(/^Team name/)
      .fill(renamed);
    await dialog(page).getByRole('button', { name: 'Save team' }).click();
    await expect(toast(page, 'Team renamed.')).toBeVisible();

    // One step up with the keyboard.
    const handle = page.getByRole('button', { name: `Reorder ${renamed}` });
    await handle.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    await announced(page, `${renamed} is now at position 7 of 7.`);
    await page.keyboard.press('ArrowUp');
    await announced(page, `${renamed} is now at position 6 of 7.`);
    await page.keyboard.press('Space');
    await announced(page, `${renamed} dropped at position 6 of 7.`);
    await expect(toast(page, 'Order saved.')).toBeVisible();

    // The chips on the public page follow (members see all teams).
    await page.goto('/en/members');
    const chips = page.locator('#active').getByRole('group', { name: 'Filter by team' }).getByRole('link');
    // "All" is the first chip; Design was the last team, our team is now just before it.
    await expect(chips.nth(6)).toContainText(renamed);
    await expect(chips.nth(7)).toContainText('Design');

    await page.goto('/admin/members?tab=teams');
    await page.getByRole('button', { name: `Delete ${renamed}` }).click();
    const confirm = page.getByRole('alertdialog', { name: `Delete ${renamed}?` });
    await confirm.getByLabel(/Type DELETE/).fill('DELETE');
    await confirm.getByRole('button', { name: 'Delete team' }).click();
    await expect(toast(page, 'Team deleted.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Teams' })).not.toContainText(renamed);
  });

  test('badges: the sample badges; add, edit and delete one', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    const name = `Badge ${unique()}`;
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members?tab=badges');
    await expect(page.getByText('Organizer', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Given to \d+ member/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Add badge' }).click();
    await dialog(page)
      .getByLabel(/^Badge name/)
      .fill(name);
    await dialog(page)
      .getByLabel(/^What it means/)
      .fill('Because of tests');
    await dialog(page).getByLabel('Icon').selectOption('heart');
    await dialog(page).getByRole('button', { name: 'Save badge' }).click();
    await expect(toast(page, 'Badge added.')).toBeVisible();
    const item = page.getByRole('listitem').filter({ hasText: name });
    await expect(item).toContainText('Not given yet');
    await expect(item).toContainText('Because of tests');

    await page.getByRole('button', { name: `Edit ${name}` }).click();
    await dialog(page)
      .getByLabel(/^What it means/)
      .fill('Better words');
    await dialog(page).getByRole('button', { name: 'Save badge' }).click();
    await expect(toast(page, 'Badge updated.')).toBeVisible();
    await expect(item).toContainText('Better words');

    await page.getByRole('button', { name: `Delete ${name}` }).click();
    const confirm = page.getByRole('alertdialog', { name: `Delete ${name}?` });
    await expect(confirm).toContainText('Nobody has it.');
    await confirm.getByLabel(/Type DELETE/).fill('DELETE');
    await confirm.getByRole('button', { name: 'Delete badge' }).click();
    await expect(toast(page, 'Badge deleted.')).toBeVisible();
    await expect(item).toHaveCount(0);
  });

  test('board: the current board and its seats; the current board can not be deleted', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members?tab=board');
    await expect(page.locator('#board-pick')).toHaveValue('2026/2027');
    await expect(page.getByText('Current', { exact: true }).first()).toBeVisible();
    const seats = page.getByRole('list', { name: 'Seats' });
    await expect(seats.getByRole('listitem').first()).toContainText('Chairperson');
    await expect(seats.getByRole('listitem').first()).toContainText('Ana Trajkovska');
    await expect(seats.getByRole('listitem').first()).toContainText('chair@eestec.mk');
    await page.getByRole('button', { name: 'Delete board' }).click();
    await expect(page.getByRole('alertdialog', { name: '2026/2027 is the current board' })).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();

    // A past board shows no e-mails.
    await page.goto('/admin/members?tab=board&board=2025%2F2026');
    await expect(seats.getByRole('listitem').first()).toContainText('Bojan Petreski');
    await expect(seats.getByRole('listitem').first()).not.toContainText('@eestec.mk');
  });

  test('board: add a board with seats, the public page follows, then delete it', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const year = 2200 + Math.floor(Math.random() * 90);
    const label = `${year}/${year + 1}`;
    await signInAs(page, 'super-admin');
    await page.goto('/admin/members?tab=board');
    await page.getByRole('button', { name: 'New board' }).click();
    await dialog(page)
      .getByLabel(/^Years/)
      .fill('20x');
    await dialog(page).getByRole('button', { name: 'Save board' }).click();
    await expect(dialog(page).getByText('Write the years like 2026/2027.')).toBeVisible();
    await dialog(page)
      .getByLabel(/^Years/)
      .fill(label);
    await dialog(page)
      .getByLabel(/^Starts on/)
      .fill(`${year}-10-01`);
    await dialog(page)
      .getByLabel(/^Ends on/)
      .fill(`${year + 1}-09-30`);
    await dialog(page).getByRole('button', { name: 'Save board' }).click();
    await expect(toast(page, 'Board added.')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`board=${year}%2F${year + 1}`));
    await expect(page.getByText('No seats yet')).toBeVisible();

    await page.getByRole('button', { name: 'Add seat' }).click();
    await dialog(page).getByRole('button', { name: 'Save seat' }).click();
    await expect(dialog(page).getByText('Choose a person.')).toBeVisible();
    await dialog(page)
      .getByLabel(/^Person/)
      .selectOption({ label: 'Marija Stojanovska' });
    await dialog(page)
      .getByLabel(/^Title on the Members page/)
      .fill('Chair of tests');
    await dialog(page).getByRole('button', { name: 'Save seat' }).click();
    await expect(toast(page, 'Seat saved.')).toBeVisible();
    const seats = page.getByRole('list', { name: 'Seats' });
    await expect(seats.getByRole('listitem').first()).toContainText('Chair of tests');
    // Not the current board: no e-mail.
    await expect(seats.getByRole('listitem').first()).not.toContainText('@eestec.mk');

    // The Members page shows it, with a name from the profile (members see it even if members-only).
    await page.goto(`/en/members?board=${year}%2F${year + 1}`);
    const board = page.locator('#board');
    await expect(board.getByRole('heading', { level: 2, name: `Board ${label}` })).toBeVisible();
    await expect(board.getByRole('heading', { level: 3 }).first()).toContainText('Marija Stojanovska');
    await expect(board.getByText('Chair of tests').first()).toBeVisible();

    await page.goto(`/admin/members?tab=board&board=${year}%2F${year + 1}`);
    await page.getByRole('button', { name: 'Delete board' }).click();
    const confirm = page.getByRole('alertdialog', { name: `Delete board ${label}?` });
    await confirm.getByLabel(/Type DELETE/).fill('DELETE');
    await confirm.getByRole('button', { name: 'Delete board' }).click();
    await expect(toast(page, 'Board deleted.')).toBeVisible();
    await page.goto(`/en/members?board=${year}%2F${year + 1}`);
    // An unknown board falls back to the current one.
    await expect(
      page.locator('#board').getByRole('heading', { level: 2, name: 'Board 2026/2027' }),
    ).toBeVisible();
  });

  test('has no serious accessibility violations on the three sections', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    for (const tab of ['teams', 'badges', 'board']) {
      await page.goto(`/admin/members?tab=${tab}`);
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
      expect(await seriousViolations(page), tab).toEqual([]);
    }
    await page.getByRole('button', { name: 'Add seat' }).click();
    await expect(dialog(page)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
