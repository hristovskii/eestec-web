import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';

// The membership form of /join (M10c). Applications stay in the mock store, so every test uses an
// e-mail address of its own. The closed card is checked in the component lab (switching applications off in Admin would hide the form from every test running at the same time); the server's refusal is a unit test.

const unique = () => Math.random().toString(36).slice(2, 8);
const form = (page: Page) => page.getByRole('form', { name: 'Membership application' });

async function openForm(page: Page, path = '/en/join', name = 'Membership application') {
  await page.goto(path);
  await page.getByRole('form', { name }).scrollIntoViewIfNeeded();
  // The spam guard wants a few seconds between showing and sending (real time).
  await page.waitForTimeout(3200);
}

async function fillValid(page: Page, email = `test.${unique()}@example.org`) {
  const f = form(page);
  await f.getByLabel(/^Full name/).fill('Marija Stojanovska');
  await f.getByLabel(/^E-mail/).fill(email);
  await f.getByLabel('Phone').fill('070 123 456');
  await f.getByLabel(/^Faculty/).selectOption({ label: 'FEEIT' });
  await f.getByLabel(/^Study program/).fill('Computer Hardware Engineering');
  await f.getByText('2nd', { exact: true }).click();
  await f.getByText('IT', { exact: true }).click();
  await f.getByText('Events', { exact: true }).click();
  await f.getByLabel('How did you hear about us?').selectOption({ label: 'Instagram' });
  await f.getByRole('checkbox', { name: /I agree that/ }).check();
  return email;
}

test.describe('membership form (M10c)', () => {
  test('an empty form shows the error summary, takes focus, and each field its own error', async ({
    page,
  }) => {
    await openForm(page);
    await form(page).getByRole('button', { name: 'Send application' }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 6 fields' });
    await expect(summary).toBeFocused();
    for (const name of [
      'Full name',
      'E-mail',
      'Faculty',
      'Study program',
      'Year of study',
      'Consent to data processing',
    ])
      await expect(summary.getByRole('link', { name: new RegExp(name) })).toBeVisible();
    await expect(page.locator('#join-email-error')).toContainText('Fill this in');
    await expect(page.locator('#join-consent-error')).toContainText('Please agree');
    // A link in the summary goes to its field.
    await summary.getByRole('link', { name: /E-mail/ }).click();
    await expect(page.locator('#join-email')).toBeFocused();
  });

  test('a wrong e-mail and phone are named, and fixing a field clears its error', async ({ page }) => {
    await openForm(page);
    const email = `test.${unique()}@example.org`;
    await fillValid(page, 'marija.s@students');
    await form(page).getByLabel('Phone').fill('call me');
    await form(page).getByRole('button', { name: 'Send application' }).click();
    await expect(page.locator('#join-email-error')).toContainText('name@example.com');
    await expect(page.locator('#join-phone-error')).toContainText('phone number');
    await form(page)
      .getByLabel(/^E-mail/)
      .fill(email);
    await form(page).getByLabel('Phone').fill('070 123 456');
    await form(page).getByRole('button', { name: 'Send application' }).click();
    await expect(page.getByRole('heading', { name: /Welcome aboard, Marija!/ })).toBeVisible();
  });

  test('sending shows the confirmation with the next meeting and a calendar link', async ({ page }) => {
    await openForm(page);
    const email = await fillValid(page);
    await form(page).getByRole('button', { name: 'Send application' }).click();
    const success = page.getByRole('status').filter({ hasText: 'Welcome aboard' });
    // The confirmation takes focus (its wrapper), so a screen reader starts reading it.
    await expect(success.locator('xpath=..')).toBeFocused();
    await expect(success).toContainText(email);
    await expect(success).toContainText("We'll reply within 3 days.");
    await expect(success).toContainText('Wed 7 Oct, 18:00, Room 117, FEEIT');
    await expect(success.getByRole('link', { name: /See the EESTEC Journey/ })).toHaveAttribute(
      'href',
      '/en/journey',
    );
    await success.getByRole('button', { name: 'Add meeting to calendar' }).click();
    const ics = page.getByRole('menuitem', { name: /Apple|Outlook|ics/i }).first();
    await expect(ics).toHaveAttribute('href', '/en/join/calendar');
  });

  test('the calendar file is the next weekly meeting', async ({ request }) => {
    const response = await request.get('/en/join/calendar');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/calendar');
    const text = await response.text();
    expect(text).toContain('BEGIN:VEVENT');
    expect(text).toContain('DTSTART:20261007T160000Z');
    expect(text).toContain('DTEND:20261007T170000Z');
    expect(text).toContain('LOCATION:Room 117\\, FEEIT');
    expect((await request.get('/mk/join/calendar')).status()).toBe(200);
  });

  test('the same e-mail twice gets a friendly message, and a bot is refused', async ({ page }) => {
    await openForm(page);
    const email = await fillValid(page);
    await form(page).getByRole('button', { name: 'Send application' }).click();
    await expect(page.getByRole('heading', { name: /Welcome aboard/ })).toBeVisible();

    await openForm(page);
    await fillValid(page, email.toUpperCase());
    await form(page).getByRole('button', { name: 'Send application' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'already have an application' }).locator('xpath=..'),
    ).toBeFocused();

    // A bot fills the hidden field.
    await openForm(page);
    await fillValid(page);
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[name="website"]');
      if (input) input.value = 'http://spam.example';
    });
    await form(page).getByRole('button', { name: 'Send application' }).click();
    await expect(page.getByRole('alert').filter({ hasText: "couldn't send this" })).toBeVisible();
  });

  test('Macedonian form: labels, a year button and the success message', async ({ page }) => {
    await openForm(page, '/join', 'Пријава за членство');
    const f = page.getByRole('form', { name: 'Пријава за членство' });
    await f.getByLabel(/^Име и презиме/).fill('Марија Стојановска');
    await f.getByLabel(/^Е-пошта/).fill(`test.${unique()}@example.org`);
    await f.getByLabel(/^Факултет/).selectOption({ label: 'FEEIT' });
    await f.getByLabel(/^Студиска програма/).fill('КХИЕ');
    await f.getByText('2-ра', { exact: true }).click();
    await f.getByRole('checkbox', { name: /Се согласувам/ }).check();
    await f.getByRole('button', { name: 'Испрати пријава' }).click();
    await expect(page.getByRole('heading', { name: /Добредојде, Марија!/ })).toBeVisible();
  });

  test('phones: nothing scrolls sideways and the form passes axe in every state', async ({ page }) => {
    await openForm(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await seriousViolations(page)).toEqual([]);
    await form(page).getByRole('button', { name: 'Send application' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Please fix' })).toBeFocused();
    expect(await seriousViolations(page)).toEqual([]);
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send application' }).click();
    await expect(page.getByRole('heading', { name: /Welcome aboard/ })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the closed card (component lab): next round, weekly meeting, Instagram and the journey', async ({
    page,
  }) => {
    await page.goto('/en/design-system');
    const closed = page
      .locator('#join-states')
      .getByRole('status')
      .filter({ hasText: 'Applications are closed right now' });
    await closed.scrollIntoViewIfNeeded();
    await expect(closed).toContainText('The next round opens in February 2027');
    await expect(closed).toContainText('Wednesdays, 18:00 · Room 117, FEEIT');
    await expect(closed.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', /instagram\.com/);
    await expect(closed.getByRole('link', { name: /EESTEC Journey/ })).toHaveAttribute('href', '/en/journey');
    expect(await seriousViolations(page)).toEqual([]);
  });
});
