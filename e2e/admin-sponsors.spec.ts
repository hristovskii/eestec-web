import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Pages › Sponsors (M11a). The tests that change content put it back, and run one after
// the other on the desktop project (the mock store is shared by everything running at once). New
// sponsors are created switched off, so no public page ever shows them.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const save = (page: Page) => page.getByRole('button', { name: 'Save changes' });
const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => Math.random().toString(36).slice(2, 8);
const SPONSORS = '/admin/pages/sponsors?tab=sponsors';
const TIERS = '/admin/pages/sponsors?tab=tiers';

/** Adds a switched-off sponsor to the (empty) Silver tier. */
async function addHiddenSponsor(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add sponsor to Silver partners' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add sponsor' });
  await dialog.getByRole('textbox', { name: /^Name/ }).fill(name);
  await dialog.getByRole('textbox', { name: /^Website/ }).fill('https://temp.example.com');
  await dialog.getByRole('switch', { name: 'Show on the site' }).click();
  await dialog.getByRole('button', { name: 'Save sponsor' }).click();
  await expect(toast(page, 'Sponsor added.').last()).toBeVisible();
  await expect(dialog).toBeHidden();
}

async function deleteSponsor(page: Page, name: string) {
  await page.getByRole('button', { name: `Delete ${name}` }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('textbox').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete sponsor' }).click();
  await expect(toast(page, 'Sponsor deleted.').last()).toBeVisible();
  await expect(page.getByRole('button', { name: `Delete ${name}` })).toHaveCount(0);
}

test.describe('sponsors admin (M11a)', () => {
  test('shows the sample page content, sponsors and tiers, and passes axe on every tab', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/sponsors');
    await expect(page.getByRole('heading', { level: 1, name: 'Sponsors' })).toBeVisible();
    await expect(page.locator('#pt-hero-title')).toHaveValue('Meet the engineers of tomorrow');
    await expect(page.locator('#pt-packages-items-1-name')).toHaveValue('Gold partner');
    await expect(page.getByRole('switch', { name: /Most chosen/ })).toHaveCount(3);
    await expect(page.locator('#pt-contact-person-email')).toHaveValue('partners@eestec.mk');
    await expect(save(page)).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto(SPONSORS);
    await expect(page.getByRole('heading', { level: 2, name: 'Main partner' })).toBeVisible();
    await expect(page.locator('#tier-tier-gold').getByText('3 sponsors · 3 shown')).toBeVisible();
    // Silver is the canvas's empty tier; past partners are marked.
    await expect(page.getByText('No sponsors in this tier.')).toBeVisible();
    await expect(page.getByText('Past partner', { exact: true })).toHaveCount(4);
    await expect(page.getByText('FEEIT')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto(TIERS);
    await expect(page.locator('#tier-name-0')).toHaveValue('Main partner');
    await expect(
      page.getByRole('button', { name: /Main partner can’t be removed|Main partner can't be removed/ }),
    ).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test.describe('changes', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'editing is a desktop flow');
    });

    test('edits the title, saves, and keeps it after a reload', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/sponsors');
      const original = await page.locator('#pt-hero-title').inputValue();
      const text = `Partner ${unique()}`;
      try {
        await page.locator('#pt-hero-title').fill(text);
        await expect(page.getByText('Unsaved changes')).toBeVisible();
        await save(page).click();
        await expect(toast(page, 'For Companies page saved')).toBeVisible();
        await page.reload();
        await expect(page.locator('#pt-hero-title')).toHaveValue(text);
      } finally {
        await page.locator('#pt-hero-title').fill(original);
        await save(page).click();
        await expect(toast(page, 'For Companies page saved').last()).toBeVisible();
      }
    });

    test('will not save an empty title, an empty package name or a bad e-mail, and says where', async ({
      page,
    }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/sponsors');
      await page.locator('#pt-hero-title').fill('');
      await page.locator('#pt-packages-items-1-name').fill('');
      await page.locator('#pt-contact-person-email').fill('not-an-email');
      await save(page).click();
      const summary = page.getByRole('alert').filter({ hasText: "Can't save yet: fix 3 fields" });
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link', { name: 'Title' })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Package 2 › Name/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: 'E-mail' })).toBeVisible();
      await page.reload();
      await expect(page.locator('#pt-packages-items-1-name')).toHaveValue('Gold partner');
    });

    test('only one package can be “Most chosen”', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/sponsors');
      const chosen = page.getByRole('switch', { name: /Most chosen/ });
      await expect(chosen.nth(1)).toBeChecked();
      await chosen.nth(0).click();
      await expect(chosen.nth(0)).toBeChecked();
      await expect(chosen.nth(1)).not.toBeChecked();
      // Nothing was saved.
      await page.reload();
      await expect(chosen.nth(1)).toBeChecked();
    });

    test('adds a package line and a number, saves, and removes them again', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/sponsors');
      const lines = page.locator('[id^="pt-packages-items-0-items-"][id$="-text"]');
      const numbers = page.locator('[id^="pt-reach-stats-"][id$="-value"]');
      await expect(lines).toHaveCount(3);
      await expect(numbers).toHaveCount(4);
      try {
        await page.getByRole('button', { name: 'Add line' }).first().click();
        await expect(lines.nth(3)).toBeFocused();
        await lines.nth(3).fill('A new benefit');
        await save(page).click();
        await expect(toast(page, 'For Companies page saved')).toBeVisible();
        await page.reload();
        await expect(lines).toHaveCount(4);
      } finally {
        await page.getByRole('button', { name: 'Remove line 4' }).first().click();
        await save(page).click();
        await expect(page.getByText('All changes saved')).toBeVisible();
        await expect(lines).toHaveCount(3);
      }
    });

    test('adds, edits, reorders and deletes sponsors; the new ones stay hidden', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto(SPONSORS);
      const first = `Temp A ${unique()}`;
      const second = `Temp B ${unique()}`;
      const names = () =>
        page
          .locator('#tier-tier-silver')
          .getByRole('button', { name: /^Reorder / })
          .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')?.replace('Reorder ', '')));
      try {
        await addHiddenSponsor(page, first);
        await addHiddenSponsor(page, second);
        const silver = page.locator('#tier-tier-silver');
        await expect(silver.getByText('Hidden', { exact: true })).toHaveCount(2);
        await expect(page.getByText('2 sponsors · 0 shown')).toBeVisible();
        await expect.poll(names).toEqual([first, second]);

        // Move the second one up with the keyboard; the order is stored.
        const handle = page.getByRole('button', { name: `Reorder ${second}` });
        await handle.focus();
        const announced = (text: string) =>
          expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();
        await page.keyboard.press('Space');
        await announced(`${second} is now at position 2 of 2.`);
        await page.keyboard.press('ArrowUp');
        await announced(`${second} is now at position 1 of 2.`);
        await page.keyboard.press('Space');
        await announced(`${second} dropped at position 1 of 2.`);
        await expect.poll(names).toEqual([second, first]);
        await page.reload();
        await expect.poll(names).toEqual([second, first]);

        // Edit: validation first, then a new name.
        await page.getByRole('button', { name: `Edit ${first}` }).click();
        const dialog = page.getByRole('dialog', { name: `Edit ${first}` });
        await dialog.getByRole('textbox', { name: /^Name/ }).fill('');
        await dialog.getByRole('textbox', { name: /^Website/ }).fill('http://not-secure.example.com');
        await dialog.getByRole('button', { name: 'Save sponsor' }).click();
        await expect(dialog.getByText('This is required.')).toBeVisible();
        await expect(dialog.getByText('Enter a full address that starts with https://')).toBeVisible();
        await expect(dialog.getByRole('textbox', { name: /^Name/ })).toBeFocused();
        await dialog.getByRole('textbox', { name: /^Name/ }).fill(`${first} renamed`);
        await dialog.getByRole('textbox', { name: /^Website/ }).fill('https://renamed.example.com');
        await dialog.getByRole('button', { name: 'Save sponsor' }).click();
        await expect(toast(page, 'Sponsor saved.').last()).toBeVisible();
        await expect(page.getByRole('button', { name: `Edit ${first} renamed` })).toBeVisible();
        await expect(silver.getByText('renamed.example.com')).toBeVisible();
      } finally {
        for (const name of [`${first} renamed`, first, second]) {
          if ((await page.getByRole('button', { name: `Delete ${name}` }).count()) > 0)
            await deleteSponsor(page, name);
        }
      }
      await expect(page.getByText('No sponsors in this tier.')).toBeVisible();
    });

    test('renames a tier and puts it back; a tier with sponsors cannot be removed', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto(TIERS);
      const name = page.locator('#tier-name-2');
      await expect(name).toHaveValue('Silver partners');
      const saveTiers = page.getByRole('button', { name: 'Save tiers' });
      await expect(saveTiers).toBeDisabled();
      try {
        await name.fill('Platinum partners');
        await expect(saveTiers).toBeEnabled();
        await saveTiers.click();
        await expect(toast(page, 'Tiers saved.').last()).toBeVisible();
        await page.reload();
        await expect(page.locator('#tier-name-2')).toHaveValue('Platinum partners');
      } finally {
        await page.goto(TIERS);
        await page.locator('#tier-name-2').fill('Silver partners');
        await page.getByRole('button', { name: 'Save tiers' }).click();
        await expect(toast(page, 'Tiers saved.').last()).toBeVisible();
      }
      // An empty tier can be removed from the list (nothing is saved here).
      await expect(page.getByRole('button', { name: 'Remove Silver partners' })).toBeEnabled();
      await expect(page.getByText("3 sponsors in this tier. It can't be removed.").first()).toBeVisible();
    });
  });

  test('editors may change the Sponsors page; event managers may not even open it', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/pages/sponsors');
    await expect(page.locator('#pt-hero-title')).toBeEnabled();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/pages/sponsors');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });
});
