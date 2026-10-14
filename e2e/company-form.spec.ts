import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// The partnership inquiry form of /partners (M11c). Inquiries stay in the mock store; the server's
// rules (spam guard, answers, references) are unit tests too.

const form = (page: Page, name = 'Partnership inquiry') => page.getByRole('form', { name });

async function openForm(page: Page, path = '/en/partners', name = 'Partnership inquiry') {
  await page.goto(path);
  await form(page, name).scrollIntoViewIfNeeded();
  // The spam guard wants a few seconds between showing and sending (real time).
  await page.waitForTimeout(3200);
}

async function fillValid(page: Page) {
  const f = form(page);
  await f.getByLabel(/^Company name/).fill('Voltline');
  await f.getByLabel(/^Contact person/).fill('Petra Ilievska');
  await f.getByLabel(/^E-mail/).fill('petra.ilievska@voltline.example');
  await f.getByLabel('Phone').fill('+389 2 123 4567');
  await f.getByText('Workshop', { exact: true }).click();
  await f.getByText('Job fair', { exact: true }).click();
  await f
    .getByLabel(/^Message/)
    .fill('We would like to run a hands-on workshop on power electronics for about 30 students.');
  await f.getByRole('checkbox', { name: /I agree that/ }).check();
}

const send = (page: Page) => form(page).getByRole('button', { name: 'Send inquiry' });

test.describe('partnership inquiry form (M11c)', () => {
  test('an empty form shows the error summary, takes focus, and each field its own error', async ({
    page,
  }) => {
    await openForm(page);
    await send(page).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 6 fields' });
    await expect(summary).toBeFocused();
    for (const name of [
      'Company name',
      'Contact person',
      'E-mail',
      'What you’re interested in',
      'Message',
      'Agreement to store your details',
    ])
      await expect(summary.getByRole('link', { name: new RegExp(name) })).toBeVisible();
    await expect(page.locator('#inquiry-company-error')).toContainText('This is required');
    await expect(page.locator('#inquiry-interests-error')).toContainText('Pick at least one option');
    await expect(page.locator('#inquiry-consent-error')).toContainText('Please agree');
    // A link in the summary goes to its field.
    await summary.getByRole('link', { name: /Company name/ }).click();
    await expect(page.locator('#inquiry-company')).toBeFocused();
  });

  test('a short message and a wrong e-mail are named, and fixing a field clears its error', async ({
    page,
  }) => {
    await openForm(page);
    await fillValid(page);
    await form(page)
      .getByLabel(/^E-mail/)
      .fill('petra@voltline');
    await form(page)
      .getByLabel(/^Message/)
      .fill('Workshop?');
    await send(page).click();
    await expect(page.locator('#inquiry-email-error')).toContainText('valid e-mail');
    await expect(page.locator('#inquiry-message-error')).toContainText('at least 20 characters');
    await form(page)
      .getByLabel(/^E-mail/)
      .fill('petra.ilievska@voltline.example');
    await form(page)
      .getByLabel(/^Message/)
      .fill('We would like to run a hands-on workshop for about 30 students.');
    await send(page).click();
    await expect(page.getByRole('heading', { name: /Thanks, Petra!/ })).toBeVisible();
  });

  test('the message counts its characters', async ({ page }) => {
    await openForm(page);
    await expect(form(page)).toContainText('0 / 2,000');
    await form(page)
      .getByLabel(/^Message/)
      .fill('Hello there');
    await expect(form(page)).toContainText('11 / 2,000');
  });

  test('sending shows the confirmation with the company, the interests and a reference', async ({ page }) => {
    await openForm(page);
    await fillValid(page);
    await send(page).click();
    const success = page.getByRole('status').filter({ hasText: 'Your inquiry is in' });
    // The confirmation takes focus (its wrapper), so a screen reader starts reading it.
    await expect(success.locator('xpath=..')).toBeFocused();
    await expect(success.getByRole('heading', { name: 'Thanks, Petra! Your inquiry is in.' })).toBeVisible();
    await expect(success).toContainText('petra.ilievska@voltline.example');
    await expect(success).toContainText('Voltline');
    await expect(success).toContainText('Workshop, Job fair');
    await expect(success).toContainText(/PRT-\d{4}-\d{4}/);
    await expect(success.getByRole('link', { name: /See our recent events/ })).toHaveAttribute(
      'href',
      '/en/events',
    );
    // The sample offer has no file, so there is no download to offer yet.
    await expect(success.getByRole('link', { name: /Partnership offer/ })).toHaveCount(0);
  });

  test('the same company may write again, and gets a new reference', async ({ page }) => {
    const reference = async () => {
      await openForm(page);
      await fillValid(page);
      await send(page).click();
      const success = page.getByRole('status').filter({ hasText: 'Your inquiry is in' });
      await expect(success).toBeVisible();
      return /PRT-\d{4}-\d{4}/.exec(await success.innerText())?.[0];
    };
    const first = await reference();
    const second = await reference();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  test('a bot that fills the hidden field is refused', async ({ page }) => {
    await openForm(page);
    await fillValid(page);
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[name="website"]');
      if (input) input.value = 'http://spam.example';
    });
    await send(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'couldn’t send this' })).toBeVisible();
  });

  test('Macedonian form: labels, interests and the success message', async ({ page }) => {
    await openForm(page, '/partners', 'Барање за соработка');
    const f = form(page, 'Барање за соработка');
    await f.getByLabel(/^Име на компанијата/).fill('Voltline');
    await f.getByLabel(/^Лице за контакт/).fill('Петра Илиевска');
    await f.getByLabel(/^Е-пошта/).fill('petra.ilievska@voltline.example');
    await f.getByText('Работилница', { exact: true }).click();
    await f.getByLabel(/^Порака/).fill('Сакаме да организираме работилница за околу 30 студенти во пролет.');
    await f.getByRole('checkbox', { name: /Се согласувам/ }).check();
    await f.getByRole('button', { name: 'Испрати барање' }).click();
    await expect(page.getByRole('heading', { name: /Благодариме, Петра!/ })).toBeVisible();
  });

  test('nothing scrolls sideways and the form passes axe in every state', async ({ page }) => {
    await openForm(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await seriousViolations(page)).toEqual([]);
    await send(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Please fix' })).toBeFocused();
    expect(await seriousViolations(page)).toEqual([]);
    await fillValid(page);
    await send(page).click();
    await expect(page.getByRole('heading', { name: /Thanks, Petra!/ })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the component lab has the form', async ({ page }) => {
    await page.goto('/en/design-system');
    const lab = page.locator('#company-form-states');
    await lab.scrollIntoViewIfNeeded();
    await expect(lab.getByRole('form', { name: 'Partnership inquiry' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
