import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';
import { PORT } from './support/servers';

// Admin › Applications › Application form (M7c), with the clock pinned to 4 Oct 2026, 18:18.
// Changes happen on Leading Teams (its form is not used by other tests) and are reset at the end.

async function signInAs(page: Page, persona: 'super-admin' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const unique = () => Math.random().toString(36).slice(2, 8);
const FORM = '/admin/applications/ev-leading-teams/form';
const saveBar = (page: Page) => page.getByRole('region', { name: 'Save' });
const questions = (page: Page) => page.getByRole('list', { name: 'Questions of the form' });
const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });

async function addQuestion(page: Page, type: string, label: string) {
  await page.getByRole('button', { name: 'Add a question' }).click();
  await page.getByRole('menuitem', { name: type }).click();
  const field = page.getByLabel(/^Question/).last();
  await field.fill(label);
}

test.describe('application form builder (M7c)', () => {
  test('the event edit form links to the builder', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events/ev-ai-at-the-edge');
    const link = page.getByRole('link', { name: /Edit application form/ });
    await expect(link).toContainText('8 questions');
    await link.click();
    await expect(page).toHaveURL(/\/admin\/applications\/ev-ai-at-the-edge\/form$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Application form' })).toBeVisible();

    await page.goto('/admin/events/new');
    await expect(page.getByText('Save the event first to edit its application form.')).toBeHidden();
    await page.getByRole('switch', { name: /Accept applications/ }).click();
    await expect(page.getByText('Save the event first to edit its application form.')).toBeVisible();
  });

  test('shows the default questions, the fixed ones, and passes axe', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/applications/ev-ai-at-the-edge/form');
    await expect(saveBar(page)).toContainText('Default questions');
    await expect(page.getByRole('region', { name: 'Always asked' })).toContainText('Full name');
    await expect(page.getByRole('region', { name: 'Always asked' })).toContainText(
      'Consent to the processing',
    );
    await expect(questions(page).getByRole('listitem')).toHaveCount(8);
    await expect(questions(page).getByRole('listitem').first()).toContainText('Phone');
    await expect(questions(page).getByRole('listitem').nth(4)).toContainText('Motivation letter');
    await expect(questions(page).getByRole('listitem').nth(4)).toContainText('Long text');
    await expect(questions(page).getByRole('listitem').nth(4)).toContainText('Required');

    await page.getByRole('button', { name: /Edit question 3: Year of study/ }).click();
    await expect(page.getByLabel('Show as')).toHaveValue('dropdown');
    await expect(page.getByLabel(/^Option 1 \(Macedonian\)/)).toHaveValue('Прва година');
    await settled(page.getByRole('region', { name: 'Questions' }));
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('builds a form, applicants see it, removing a question keeps its answers', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const note = `Allergies ${unique()}`;
    const track = `Track ${unique()}`;
    await signInAs(page, 'super-admin');
    await page.goto(FORM);
    await expect(saveBar(page)).toContainText('Default questions');

    // Nothing to save yet; a question without a label is refused with the error summary.
    await page.getByRole('button', { name: 'Add a question' }).click();
    await page.getByRole('menuitem', { name: 'Short text' }).click();
    await saveBar(page).getByRole('button', { name: 'Update live page' }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 1 field' });
    await expect(summary).toBeFocused();
    await summary.getByRole('link', { name: /Question 9/ }).click();
    await expect(page.getByLabel(/^Question/).last()).toBeFocused();

    await page
      .getByLabel(/^Question/)
      .last()
      .fill(note);
    await addQuestion(page, 'Choice', track);
    await page
      .getByLabel(/^Option 1 \(Macedonian\)/)
      .last()
      .fill('Hardware');
    await page
      .getByLabel(/^Option 2 \(Macedonian\)/)
      .last()
      .fill('Software');
    await page.getByRole('button', { name: /Move option 2 up/ }).click();
    await saveBar(page).getByRole('button', { name: 'Update live page' }).click();
    await expect(toast(page, 'Application form saved')).toBeVisible();
    await expect(saveBar(page)).toContainText('Custom form');

    // Applicants see the new questions, in the saved order.
    await page.goto('/en/upcoming/leading-teams');
    const apply = page.getByRole('region', { name: 'Apply', exact: true });
    await expect(apply.getByLabel(note)).toBeVisible();
    const select = apply.getByLabel(track);
    await expect(select.locator('option')).toHaveText(['Software', 'Hardware']);

    const email = `builder.${unique()}@example.com`;
    await apply.getByLabel('Full name').fill('Dimitar Kostov');
    await apply.getByLabel('E-mail').fill(email);
    await apply.getByLabel('Faculty and university').fill('FEEIT');
    await apply.getByLabel('Year of study').selectOption('2');
    await apply.getByRole('group', { name: 'Are you an EESTEC member?' }).getByText('Yes').click();
    await apply.getByLabel('Motivation letter').fill('Leading a team is the skill I am missing.');
    await apply.getByLabel(note).fill('Peanuts');
    await select.selectOption({ label: 'Hardware' });
    await apply.getByLabel(/I agree that/).check();
    await page.waitForTimeout(3100);
    await apply.getByRole('button', { name: 'Submit application' }).click();
    await expect(apply.getByRole('heading', { name: 'Application sent!' })).toBeVisible();

    // Removing a question somebody answered asks first; the answer stays in the application.
    await page.goto(FORM);
    await expect(page.getByRole('button', { name: new RegExp(`Edit question 9: ${note}`) })).toContainText(
      '1 answer',
    );
    await page.getByRole('button', { name: new RegExp(`Remove question 9: ${note}`) }).click();
    const dialog = page.getByRole('alertdialog', { name: `Remove “${note}”?` });
    await expect(dialog).toContainText('1 application answered it');
    await dialog.getByRole('button', { name: 'Remove question' }).click();
    await saveBar(page).getByRole('button', { name: 'Update live page' }).click();
    await expect(toast(page, 'Application form saved')).toBeVisible();

    await page.goto(`/admin/applications?event=ev-leading-teams&q=${encodeURIComponent(email)}`);
    await page.getByRole('link', { name: 'Dimitar Kostov' }).first().click();
    const sheet = page.getByRole('dialog', { name: 'Dimitar Kostov' });
    await expect(sheet.getByRole('heading', { name: 'Removed questions' })).toBeVisible();
    await expect(sheet).toContainText('Peanuts');
    await expect(sheet).toContainText('Hardware');
    await page.keyboard.press('Escape');

    // Back to the default questions: the extra ones are gone from the event page.
    await page.goto(FORM);
    await page.getByRole('button', { name: 'Back to the default questions' }).click();
    await page
      .getByRole('dialog', { name: 'Go back to the default questions?' })
      .getByRole('button', { name: 'Reset form' })
      .click();
    await expect(toast(page, 'Back to the default questions')).toBeVisible();
    await expect(saveBar(page)).toContainText('Default questions');
    await page.goto('/en/upcoming/leading-teams');
    await expect(apply.getByLabel(track)).toHaveCount(0);
    await expect(apply.getByLabel('Motivation letter')).toBeVisible();
  });

  test('questions reorder with the keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/applications/ev-fpga-basics/form');
    const first = questions(page).getByRole('listitem').first();
    await expect(first).toContainText('Phone');
    // Each step waits for what a screen reader hears (dnd-kit's live region).
    const announced = (text: string) =>
      expect(page.getByRole('status').filter({ hasText: text })).toBeAttached();
    const handle = page.getByRole('button', { name: 'Reorder Phone' });
    await handle.focus();
    await page.keyboard.press('Space');
    await expect(handle).toHaveAttribute('aria-pressed', 'true');
    await announced('Phone is now at position 1 of 8.');
    await page.keyboard.press('ArrowDown');
    await announced('Phone is now at position 2 of 8.');
    await page.keyboard.press('Space');
    await announced('Phone dropped at position 2 of 8.');
    await expect(questions(page).getByRole('listitem').nth(1)).toContainText('Phone');
    // Not saved: leaving asks first, and discarding restores the order.
    await saveBar(page).getByRole('button', { name: 'Discard' }).click();
    await expect(questions(page).getByRole('listitem').first()).toContainText('Phone');
  });

  test('event managers edit the forms of their events only (D18)', async ({ page }) => {
    await signInAs(page, 'event-manager');
    await page.goto('/admin/applications/ev-fpga-basics/form');
    await expect(page.getByRole('heading', { level: 1, name: 'Application form' })).toBeVisible();
    await page.goto('/admin/applications/ev-ai-at-the-edge/form');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
  });
});
