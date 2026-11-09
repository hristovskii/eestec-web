import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { ownDevice } from './support/devices';
import { createApprovedMember, hydrated, logInAs } from './support/members';

// /submit (M18b): both tabs, the answers, the states, anonymous, the member's Memory, the limit of
// 5 per hour. The limit counts per device, and every test runs on the same machine: each test gets
// a device of its own (a made-up forwarding address on all its requests), so tests do not eat each
// other's five. What is stored is looked at in Admin › Ideas (M18c) and in the repository's tests.

const unique = () => crypto.randomUUID().slice(0, 8);
const PNG = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
});

const ideaForm = (page: Page) => page.getByRole('form', { name: 'Submit an idea' });
const impressionForm = (page: Page) => page.getByRole('form', { name: 'Share an impression or feedback' });

async function open(page: Page, path = '/en/submit') {
  await ownDevice(page);
  await page.goto(path);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Have an idea? Been to an event?' }),
  ).toBeVisible();
  await hydrated(page, 'form[aria-labelledby="sf-title-heading"]');
  // The spam guard wants a few seconds between showing and sending (real time).
  await page.waitForTimeout(3200);
}

async function fillIdea(page: Page, title = `A workshop on PCB design ${unique()}`) {
  const form = ideaForm(page);
  await form.getByText('Workshop topic', { exact: true }).click();
  await form.getByLabel(/^Title/).fill(title);
  await form
    .getByLabel(/^Describe your idea/)
    .fill('Many first-years want to build hardware but have never designed a board.');
  return title;
}

const toastOrMail = async (page: Page) => {
  const response = await page.request.get('/api/dev-mailbox');
  return ((await response.json()) as { mail: { kind: string; subject: string; to: string }[] }).mail;
};

test.describe('/submit: the idea tab (M18b)', () => {
  test('shows the page, the two tabs and the idea form', async ({ page, isMobile }) => {
    await open(page);
    await expect(page.getByRole('link', { name: /Submit an idea/ }).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('link', { name: /Impression|feedback/i }).first()).toHaveAttribute(
      'href',
      '/en/submit?tab=impression',
    );
    const form = ideaForm(page);
    for (const kind of [
      'New event',
      'Workshop topic',
      'Partnership / company',
      'Website improvement',
      'Other',
    ])
      await expect(form.getByText(kind, { exact: true })).toBeVisible();
    await expect(
      page.getByText('Ideas for events, workshop topics, companies or this website.'),
    ).toBeVisible();
    await expect(form.getByText('Protected by a spam check and a limit of 5 per hour.')).toBeVisible();
    if (isMobile)
      await expect(
        page.getByText('The board discusses new ideas at the weekly meeting. Leave an e-mail', {
          exact: false,
        }),
      ).toBeVisible();
    else {
      await expect(page.getByRole('heading', { name: 'The board reads every idea' })).toBeVisible();
      // Accepted ideas whose event is public now (the sample has one).
      await expect(page.getByRole('heading', { name: 'Ideas that became events' })).toBeVisible();
    }
  });

  test('sending nothing names what is missing, and the summary link goes to the field', async ({ page }) => {
    await open(page);
    await ideaForm(page).getByRole('button', { name: 'Send idea' }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 3 fields' });
    await expect(summary).toBeFocused();
    await expect(page.locator('#sf-type-error')).toBeVisible();
    await expect(page.locator('#sf-title-error')).toBeVisible();
    await expect(page.locator('#sf-desc-error')).toBeVisible();
    await summary.getByRole('link', { name: /Title/ }).click();
    await expect(page.locator('#sf-title')).toBeFocused();
  });

  test('a name and an e-mail ask for consent; with it the idea is sent and a copy comes back', async ({
    page,
  }) => {
    test.slow();
    await open(page);
    const title = await fillIdea(page);
    const form = ideaForm(page);
    await expect(
      form.getByText("If you add an e-mail, we'll ask for your consent to store it."),
    ).toBeVisible();
    const email = `bojan.${unique()}@example.org`;
    await form.getByLabel(/^Name/).fill('Bojan Ilievski');
    await form.getByLabel(/^E-mail/).fill(email);
    await expect(form.getByRole('checkbox', { name: /I agree that/ })).toBeVisible();
    await form.getByRole('button', { name: 'Send idea' }).click();
    await expect(page.locator('#sf-consent-error')).toBeVisible();
    await form.getByRole('checkbox', { name: /I agree that/ }).check();
    await form.getByRole('button', { name: 'Send idea' }).click();
    await expect(
      page.getByRole('heading', { name: 'Thanks, Bojan! Your idea is with the board' }),
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(
      page.getByText(/reads every idea at the next weekly meeting \(Wednesdays, 18:00\)/),
    ).toBeVisible();
    const mail = await toastOrMail(page);
    expect(
      mail.some((item) => item.kind === 'idea_copy' && item.to === email && item.subject.includes(title)),
    ).toBe(true);
    expect(mail.some((item) => item.kind === 'board_idea' && item.subject.includes(title))).toBe(true);
    await page.getByRole('button', { name: 'Send another idea' }).click();
    await expect(ideaForm(page)).toBeVisible();
  });

  test('anonymous hides name and e-mail, asks for no consent, and says it cannot reply', async ({ page }) => {
    test.slow();
    await open(page);
    const title = await fillIdea(page);
    const form = ideaForm(page);
    await form.getByLabel(/^Name/).fill('Someone');
    await form.getByLabel(/^E-mail/).fill('someone@example.org');
    await form.getByRole('checkbox', { name: 'Submit anonymously' }).check();
    await expect(form.getByLabel(/^Name/)).toHaveCount(0);
    await expect(form.getByLabel(/^E-mail/)).toHaveCount(0);
    await expect(form.getByText("We won't see who you are, so we can't reply to you.")).toBeVisible();
    await form.getByRole('button', { name: 'Send idea' }).click();
    await expect(page.getByRole('heading', { name: 'Thanks! Your idea is with the board' })).toBeVisible();
    await expect(page.getByText("You sent it anonymously, so we can't reply.")).toBeVisible();
    const mail = await toastOrMail(page);
    // The board hears about it, with the title and without a person; nobody gets a copy.
    expect(mail.some((item) => item.kind === 'board_idea' && item.subject.includes(title))).toBe(true);
    expect(mail.some((item) => item.to === 'someone@example.org')).toBe(false);
  });

  test('an attachment of the wrong kind is refused, a PDF goes through', async ({ page }) => {
    test.slow();
    await open(page);
    await fillIdea(page);
    const form = ideaForm(page);
    await form.locator('#sf-attachment').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await form.getByRole('button', { name: 'Send idea' }).click();
    await expect(page.locator('#sf-attachment-error')).toBeVisible();
    await form.locator('#sf-attachment').setInputFiles({
      name: 'plan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% a tiny plan\n'),
    });
    await form.getByRole('button', { name: 'Send idea' }).click();
    await expect(page.getByRole('heading', { name: /Your idea is with the board/ })).toBeVisible();
  });
});

test.describe('/submit: the impression tab (M18b)', () => {
  const link = '/en/submit?tab=impression&event=power-up-2026';

  test('an event link chooses the event, "Other" asks for a name', async ({ page }) => {
    await open(page, link);
    const form = impressionForm(page);
    await expect(form.getByLabel(/^Which event/)).toHaveValue(/ev-power-up-2026/);
    await expect(form.getByText('Chosen for you from the event page. Change it if needed.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Impression|feedback/i }).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await form.getByLabel(/^Which event/).selectOption({ label: 'Other: not in the list' });
    await expect(form.getByLabel(/^Name of the event or visit/)).toBeVisible();
    await expect(form.getByText('Only photos where everyone shown agreed to be shared.')).toBeVisible();
  });

  test('sending nothing names the event and the impression', async ({ page }) => {
    await open(page, '/en/submit?tab=impression');
    await impressionForm(page).getByRole('button', { name: 'Send feedback' }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 2 fields' });
    await expect(summary).toBeFocused();
    await expect(page.locator('#sf-ev-error')).toBeVisible();
    await expect(page.locator('#sf-imp-error')).toBeVisible();
  });

  test('a visitor rates the event, adds a photo and sends feedback only', async ({ page }) => {
    test.slow();
    await open(page, link);
    const form = impressionForm(page);
    await form.getByRole('radio', { name: '4 of 5: Great' }).check({ force: true });
    await expect(form.getByText('4 of 5 · Great')).toBeVisible();
    await form
      .getByLabel(/^Your impression or feedback/)
      .fill('The lab day was the best part. Fewer hours on the bus next time.');
    await page.getByTestId('submit-photos').setInputFiles(PNG('lab.png'));
    await expect(form.getByRole('button', { name: /Remove photo lab\.png/ })).toBeVisible();
    await form.getByRole('button', { name: 'Send feedback' }).click();
    await expect(
      page.getByRole('heading', { name: 'Thanks for your feedback on Workshop: Power Up — Renewable Grids' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Read Memories from Workshop: Power Up/ })).toHaveAttribute(
      'href',
      '/en/memories?event=power-up-2026',
    );
    const mail = await toastOrMail(page);
    expect(mail.some((item) => item.kind === 'board_feedback' && item.subject.includes('Power Up'))).toBe(
      true,
    );
  });

  test('a member is sent as themselves and can turn the impression into a Memory', async ({
    browser,
    page,
  }) => {
    test.slow();
    const member = await createApprovedMember(browser, `Author ${unique()}`);
    await logInAs(page, member.email);
    await open(page, link);
    const form = impressionForm(page);
    await expect(form.getByText('Sending as')).toBeVisible();
    await expect(form.getByText(member.email)).toBeVisible();
    await expect(form.getByLabel(/^Name$/)).toHaveCount(0);
    await form.getByLabel(/^Your impression or feedback/).fill('The lab day was the best part of the week.');
    await form.getByRole('checkbox', { name: 'Turn this into a Memories post' }).check();
    await expect(form.getByRole('button', { name: 'Send feedback and Memory' })).toBeVisible();
    await form.getByRole('button', { name: 'Send feedback and Memory' }).click();
    await expect(page.locator('#sf-memory-title-error')).toBeVisible();
    const title = `Lab day ${unique()}`;
    await form.getByLabel(/^Title for your Memory/).fill(title);
    await form.getByRole('button', { name: 'Send feedback and Memory' }).click();
    await expect(
      page.getByRole('heading', {
        name: new RegExp(`Thanks, ${member.name.split(' ')[0]}! Your Memory is waiting for approval`),
      }),
    ).toBeVisible();
    // The Memory waits for the board, in My profile and in Approvals.
    await page.goto('/en/profile');
    await expect(page.locator('#memories').getByRole('listitem').filter({ hasText: title })).toContainText(
      'Waiting for approval',
    );
  });
});

test.describe('/submit: the limit (M18b)', () => {
  test('the sixth submission within an hour is held back, the text stays, the button waits', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Six sends take a minute: the desktop run checks it.');
    test.setTimeout(150_000);
    await open(page);
    for (let index = 1; index <= 5; index += 1) {
      await fillIdea(page, `Idea number ${index} ${unique()}`);
      await ideaForm(page).getByRole('button', { name: 'Send idea' }).click();
      await expect(page.getByRole('heading', { name: /Your idea is with the board/ })).toBeVisible();
      await page.getByRole('button', { name: 'Send another idea' }).click();
      await expect(ideaForm(page)).toBeVisible();
      await page.waitForTimeout(3200);
    }
    const sixth = await fillIdea(page, `The sixth ${unique()}`);
    await ideaForm(page).getByRole('button', { name: 'Send idea' }).click();
    const notice = page.getByRole('alert').filter({ hasText: 'Too many submissions in a short time' });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/you can send up to 5 per hour\. Please try again after \d{2}:\d{2}/);
    await expect(notice).toContainText('Your text is still here.');
    await expect(ideaForm(page).getByLabel(/^Title/)).toHaveValue(sixth);
    await expect(ideaForm(page).getByRole('button', { name: 'Send idea' })).toBeDisabled();
  });
});

test.describe('/submit: access and accessibility (M18b)', () => {
  test('both tabs have no serious accessibility problems', async ({ page }) => {
    await open(page);
    await page.waitForTimeout(500);
    expect(await seriousViolations(page)).toEqual([]);
    await open(page, '/en/submit?tab=impression&event=power-up-2026');
    await page.waitForTimeout(500);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the Macedonian page has its own words', async ({ page }) => {
    await page.goto('/submit');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Имате идеја? Бевте на настан?' }),
    ).toBeVisible();
  });

  test('the form says what went wrong when the answers are wrong, in the hidden states too', async ({
    page,
  }) => {
    await open(page);
    const form = ideaForm(page);
    await fillIdea(page);
    await form.getByLabel(/^Name/).fill('Bojan');
    await form.getByLabel(/^E-mail/).fill('bojan@');
    await form.getByRole('button', { name: 'Send idea' }).click();
    await expect(page.locator('#sf-email-error')).toBeVisible();
  });
});
