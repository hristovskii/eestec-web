import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { PORT } from './support/servers';

// Admin › Pages › Contact (M12a). The tests that change the content put it back, and run one
// after the other on the desktop project (the mock store is shared by everything running at once).

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const save = (page: Page) => page.getByRole('button', { name: 'Save changes' });
const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => Math.random().toString(36).slice(2, 8);

test.describe('contact admin (M12a)', () => {
  test('shows the sample content and passes axe', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/contact');
    await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
    await expect(page.locator('#ct-hero-title')).toHaveValue('Contact');
    await expect(page.locator('#ct-form-title')).toHaveValue('Send us a message');
    await expect(page.locator('#ct-shortcuts-1-label')).toHaveValue('For Companies');
    // The five sample subjects, in order (other tests add a sixth for a moment, so no count).
    for (const [index, name] of [
      'General question',
      'Membership',
      'Partnership',
      'Media',
      'Other committee',
    ].entries())
      await expect(page.locator(`#ct-subjects-${index}-name`)).toHaveValue(name);
    await expect(page.locator('#ct-subjects-2-routeEmail')).toHaveValue('partners@eestec.mk');
    await expect(page.locator('#ct-map-lat')).toHaveValue('42.0045');
    await expect(save(page)).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test.describe('changes', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'editing is a desktop flow');
    });

    test('edits the title, saves, and keeps it after a reload', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/contact');
      const original = await page.locator('#ct-hero-title').inputValue();
      const text = `Contact ${unique()}`;
      try {
        await page.locator('#ct-hero-title').fill(text);
        await expect(page.getByText('Unsaved changes')).toBeVisible();
        await save(page).click();
        await expect(toast(page, 'Contact page saved')).toBeVisible();
        await page.reload();
        await expect(page.locator('#ct-hero-title')).toHaveValue(text);
      } finally {
        await page.locator('#ct-hero-title').fill(original);
        await save(page).click();
        await expect(toast(page, 'Contact page saved').last()).toBeVisible();
      }
    });

    test('will not save an empty title, a bad e-mail, a link without words or a wrong position, and says where', async ({
      page,
    }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/contact');
      await page.locator('#ct-hero-title').fill('');
      await page.locator('#ct-subjects-1-routeEmail').fill('members@');
      await page.locator('#ct-subjects-2-shortcutLabel').fill('');
      await page.locator('#ct-map-lat').fill('120');
      await save(page).click();
      const summary = page.getByRole('alert').filter({ hasText: "Can't save yet: fix 4 fields" });
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link', { name: /Page title/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Subject 2 › Goes to/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Subject 3 › Link text/ })).toBeVisible();
      await expect(summary.getByRole('link', { name: /Latitude/ })).toBeVisible();
      await expect(page.locator('#ct-subjects-1-routeEmail-error')).toHaveText(
        'Enter an e-mail like name@example.com.',
      );
      await page.reload();
      await expect(page.locator('#ct-hero-title')).toHaveValue('Contact');
      await expect(page.locator('#ct-subjects-1-routeEmail')).toHaveValue('members@eestec.mk');
    });

    test('adds a subject and a shortcut card, saves, and removes them again', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/contact');
      const subjects = page.locator('[id^="ct-subjects-"][id$="-name"]');
      await expect(subjects).toHaveCount(5);
      await expect(page.locator('[id^="ct-shortcuts-"][id$="-label"]')).toHaveCount(2);
      const name = `Subject ${unique()}`;
      try {
        await page.getByRole('button', { name: 'Add subject' }).click();
        await expect(subjects.nth(5)).toBeFocused();
        await subjects.nth(5).fill(name);
        await page.locator('#ct-subjects-5-routeEmail').fill('events@eestec.mk');
        await page.locator('#ct-subjects-5-teamLabel').fill('events team');
        await page.getByRole('button', { name: 'Add card' }).click();
        await page.locator('#ct-shortcuts-2-eyebrow').fill('Looking for events?');
        await page.locator('#ct-shortcuts-2-label').fill('Events');
        await page.locator('#ct-shortcuts-2-href').fill('/events');
        await save(page).click();
        await expect(toast(page, 'Contact page saved')).toBeVisible();
        await page.reload();
        await expect(subjects).toHaveCount(6);
        await expect(page.locator('[id^="ct-shortcuts-"][id$="-label"]')).toHaveCount(3);
      } finally {
        await page.getByRole('button', { name: `Remove ${name}` }).click();
        await page.getByRole('button', { name: 'Remove Events' }).click();
        await save(page).click();
        await expect(page.getByText('All changes saved')).toBeVisible();
        await expect(subjects).toHaveCount(5);
        await expect(page.locator('[id^="ct-shortcuts-"][id$="-label"]')).toHaveCount(2);
      }
    });

    test('keeps a position typed with a comma, and lets the map position be changed and put back', async ({
      page,
    }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/contact');
      try {
        await page.locator('#ct-map-lng').fill('21,41');
        await save(page).click();
        await expect(toast(page, 'Contact page saved')).toBeVisible();
        await page.reload();
        await expect(page.locator('#ct-map-lng')).toHaveValue('21.41');
      } finally {
        await page.locator('#ct-map-lng').fill('21.4087');
        await save(page).click();
        await expect(page.getByText('All changes saved')).toBeVisible();
      }
    });

    test('reorders subjects with the keyboard (nothing is saved)', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto('/admin/pages/contact');
      const names = () =>
        page
          .locator('[id^="ct-subjects-"][id$="-name"]')
          .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
      const before = await names();
      const announced = (text: string) =>
        expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();
      const handle = page.getByRole('button', { name: `Reorder ${before[1]}` });
      await handle.focus();
      await page.keyboard.press('Space');
      await announced(`${before[1]} is now at position 2 of 5.`);
      // dnd-kit starts listening for the arrow keys one task after the pick-up.
      await page.waitForTimeout(150);
      await page.keyboard.press('ArrowDown');
      await announced(`${before[1]} is now at position 3 of 5.`);
      await page.keyboard.press('Space');
      await announced(`${before[1]} dropped at position 3 of 5.`);
      await expect.poll(names).toEqual([before[0], before[2], before[1], ...before.slice(3)]);
      await expect(save(page)).toBeEnabled();
    });
  });

  test('editors may change the Contact page; event managers may not even open it', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/pages/contact');
    await expect(page.locator('#ct-hero-title')).toBeEnabled();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/pages/contact');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });
});

// The Privacy policy tab (M12e). The tests that change the text add one paragraph and take it away
// again; they never switch the placeholder notice off (other specs look for it).
test.describe('privacy policy editor (M12e)', () => {
  const PRIVACY = '/admin/pages/contact?tab=privacy';
  const editor = (page: Page) => page.locator('#pv-body');

  test('shows the placeholder policy in both languages, and passes axe', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/contact');
    const tabs = page.getByRole('navigation', { name: 'Contact page' });
    await expect(tabs.getByRole('link', { name: 'Page', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await tabs.getByRole('link', { name: 'Privacy policy' }).click();
    await expect(page).toHaveURL(/tab=privacy/);
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
    await expect(page.locator('#pv-title')).toHaveValue('Политика за приватност');
    await expect(editor(page)).toContainText('ПРИВРЕМЕН ТЕКСТ');
    await expect(page.getByRole('switch', { name: 'This is still placeholder text' })).toBeChecked();
    await expect(save(page)).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the public page shows the policy as rich text, with its placeholder notice', async ({ page }) => {
    await page.goto('/en/privacy');
    await expect(
      page.getByText('PLACEHOLDER TEXT. The board will supply the real privacy policy'),
    ).toBeVisible();
    await expect(page.locator('main p')).not.toHaveCount(0);
  });

  test.describe('changes', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'editing is a desktop flow');
    });

    test('adds a paragraph, saves, sees it on /privacy, and takes it away again', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto(PRIVACY);
      const text = `Retention ${unique()}`;
      const added = editor(page).locator('p', { hasText: text });
      try {
        // The editor is ready when its toolbar is there; then the caret goes to the last paragraph.
        await expect(page.getByRole('toolbar')).toBeVisible();
        // Click in the empty space at the end of the last line (no End key: it differs on macOS).
        const last = editor(page).locator('p').last();
        const box = await last.boundingBox();
        if (!box) throw new Error('the last paragraph has no box');
        await page.mouse.click(box.x + box.width - 4, box.y + box.height - 6);
        await expect(editor(page)).toBeFocused();
        await page.keyboard.press('Enter');
        await page.keyboard.type(text);
        await expect(editor(page).locator('p').last()).toHaveText(text);
        await expect(page.getByText('Unsaved changes')).toBeVisible();
        await save(page).click();
        await expect(toast(page, 'Privacy policy saved')).toBeVisible();
        await page.reload();
        await expect(editor(page)).toContainText(text);
        await page.goto('/privacy');
        await expect(page.getByText(text)).toBeVisible();
      } finally {
        await page.goto(PRIVACY);
        await expect(page.getByRole('toolbar')).toBeVisible();
        if ((await added.count()) > 0) {
          // Select that paragraph (no Home key: it differs on macOS), delete its text, then the empty paragraph.
          await added.last().click({ clickCount: 3 });
          await page.keyboard.press('Backspace');
          await page.keyboard.press('Backspace');
          await save(page).click();
          await expect(page.getByText('All changes saved')).toBeVisible();
        }
        await expect(editor(page)).not.toContainText(text);
      }
    });

    test('will not save an empty Macedonian text, and says where', async ({ page }) => {
      await signInAs(page, 'super-admin');
      await page.goto(PRIVACY);
      await editor(page).click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Backspace');
      await save(page).click();
      const summary = page.getByRole('alert').filter({ hasText: "Can't save yet: fix 1 field" });
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link', { name: /Policy text/ })).toBeVisible();
      // Nothing was stored.
      await page.reload();
      await expect(editor(page)).toContainText('ПРИВРЕМЕН ТЕКСТ');
    });
  });

  test('event managers cannot open the Privacy policy tab either', async ({ page }) => {
    await signInAs(page, 'event-manager');
    await page.goto(PRIVACY);
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });
});
