import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// The contact form of /contact (M12c). Messages stay in the mock store; the server's rules (spam
// guard, answers, routing, references) are unit tests too.

const form = (page: Page, name = 'Send us a message') => page.getByRole('form', { name });

async function openForm(page: Page, path = '/en/contact', name = 'Send us a message') {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto(path);
  await form(page, name).scrollIntoViewIfNeeded();
  // The spam guard wants a few seconds between showing and sending (real time).
  await page.waitForTimeout(3200);
}

async function fillValid(page: Page, subject = 'Membership') {
  const f = form(page);
  await f.getByLabel(/^Your name/).fill('Marija Stojanovska');
  await f.getByLabel(/^E-mail/).fill('marija.s@example.org');
  await f.getByLabel(/^Subject/).selectOption({ label: subject });
  await f.getByLabel(/^Message/).fill('Can students from other faculties join?');
  await f.getByRole('checkbox', { name: /I agree that/ }).check();
}

const send = (page: Page) => form(page).getByRole('button', { name: 'Send message' });

test.describe('contact form (M12c)', () => {
  test('an empty form shows the error summary, takes focus, and each field its own error', async ({
    page,
  }) => {
    await openForm(page);
    await send(page).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 5 fields' });
    await expect(summary).toBeFocused();
    for (const name of [
      'Your name',
      'E-mail',
      'Subject',
      'Message',
      'Agreement to store your name and e-mail',
    ])
      await expect(summary.getByRole('link', { name: new RegExp(name) })).toBeVisible();
    await expect(page.locator('#ct-name-error')).toContainText('Enter your name');
    await expect(page.locator('#ct-subject-error')).toContainText(
      'Choose a subject so the right person gets your message',
    );
    await expect(page.locator('#ct-message-error')).toContainText('Write a message before sending');
    await expect(page.locator('#ct-consent-error')).toContainText('Please agree');
    // A link in the summary goes to its field.
    await summary.getByRole('link', { name: /Subject/ }).click();
    await expect(page.locator('#ct-subject')).toBeFocused();
  });

  test('a wrong e-mail is named, and fixing the field lets the form through', async ({ page }) => {
    await openForm(page);
    await fillValid(page);
    await form(page)
      .getByLabel(/^E-mail/)
      .fill('marija.s@');
    await send(page).click();
    await expect(page.locator('#ct-email-error')).toContainText('Enter an e-mail like name@example.com');
    await form(page)
      .getByLabel(/^E-mail/)
      .fill('marija.s@example.org');
    await send(page).click();
    await expect(page.getByRole('heading', { name: /Message sent\. Thanks, Marija!/ })).toBeVisible();
  });

  test('the subject suggests a faster page: Membership and Partnership, nothing for General', async ({
    page,
  }) => {
    await openForm(page);
    const select = form(page).getByLabel(/^Subject/);
    await select.selectOption({ label: 'Membership' });
    const note = form(page).getByRole('note');
    await expect(note).toContainText('Want to join? The quickest way is the membership form.');
    await expect(note.getByRole('link', { name: 'Join Us →' })).toHaveAttribute('href', '/en/join#apply');
    await expect(select).toHaveAccessibleDescription(/Want to join\?/);
    await select.selectOption({ label: 'Partnership' });
    await expect(note).toContainText('goes straight to our fundraising team');
    await expect(note.getByRole('link', { name: 'For Companies →' })).toHaveAttribute('href', '/en/partners');
    await select.selectOption({ label: 'General question' });
    await expect(note).toHaveCount(0);
  });

  test('the message counts its characters', async ({ page }) => {
    await openForm(page);
    await expect(form(page)).toContainText('0 / 2,000');
    await form(page)
      .getByLabel(/^Message/)
      .fill('Hello there');
    await expect(form(page)).toContainText('11 / 2,000');
  });

  test('the spam row says "checking" first and "passed" after the minimum fill time', async ({ page }) => {
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto('/en/contact');
    await expect(form(page).getByText('Checking automatically…')).toBeVisible();
    await expect(form(page).getByText('Spam check passed')).toBeVisible({ timeout: 5000 });
    await expect(form(page)).toContainText('no puzzles, no tracking cookies');
  });

  test('sending shows who got it, the subject, the time and a reference; "another message" resets', async ({
    page,
  }) => {
    await openForm(page);
    await fillValid(page);
    await send(page).click();
    const success = page.getByRole('status').filter({ hasText: 'Message sent' });
    // The confirmation takes focus (its wrapper), so a screen reader starts reading it.
    await expect(success.locator('xpath=..')).toBeFocused();
    await expect(success.getByRole('heading', { name: 'Message sent. Thanks, Marija!' })).toBeVisible();
    await expect(success).toContainText('It went straight to our membership team.');
    await expect(success).toContainText('marija.s@example.org');
    await expect(success).toContainText('Membership');
    await expect(success).toContainText(/\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/);
    await expect(success).toContainText(/MSG-\d{4}-\d{4}/);
    await expect(success.getByRole('link', { name: 'Join Us →' })).toHaveAttribute('href', '/en/join#apply');
    await success.getByRole('button', { name: 'Send another message' }).click();
    await expect(form(page).getByLabel(/^Your name/)).toHaveValue('');
    await expect(form(page).getByLabel(/^Subject/)).toHaveValue('');
  });

  test('the same person may write again, and gets a new reference', async ({ page }) => {
    const reference = async () => {
      await openForm(page);
      await fillValid(page);
      await send(page).click();
      const success = page.getByRole('status').filter({ hasText: 'Message sent' });
      await expect(success).toBeVisible();
      return /MSG-\d{4}-\d{4}/.exec(await success.innerText())?.[0];
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

  test('Macedonian form: labels, the subject and the success message', async ({ page }) => {
    await openForm(page, '/contact');
    const f = form(page);
    await f.getByLabel(/^Вашето име/).fill('Марија Стојановска');
    await f.getByLabel(/^Е-пошта/).fill('marija.s@example.org');
    await f.getByLabel(/^Тема/).selectOption({ label: 'Membership' });
    await f.getByLabel(/^Порака/).fill('Дали можат студенти од други факултети да се приклучат?');
    await f.getByRole('checkbox', { name: /Се согласувам/ }).check();
    await f.getByRole('button', { name: 'Испрати порака' }).click();
    await expect(
      page.getByRole('heading', { name: /Пораката е испратена\. Благодариме, Марија!/ }),
    ).toBeVisible();
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
    await expect(page.getByRole('heading', { name: /Message sent\. Thanks, Marija!/ })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the component lab has the form', async ({ page }) => {
    await page.goto('/en/design-system');
    const lab = page.locator('#contact-form-states');
    await lab.scrollIntoViewIfNeeded();
    await expect(lab.getByRole('form', { name: 'Send us a message' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});
