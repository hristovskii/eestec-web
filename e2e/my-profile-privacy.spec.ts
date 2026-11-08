import { expect, type Page, test } from '@playwright/test';

import { seriousViolations } from './support/axe';
import { createApprovedMember, hydrated, logInAs } from './support/members';
import { PORT } from './support/servers';

// /profile (M16c): My applications, Privacy & consent and the CV. The sample member is read here;
// tests that change anything use a member of their own (signed up and approved), because the sample
// members are shared by tests running at once.

const asSample = (page: Page) =>
  page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: 'member', url: `http://localhost:${PORT}` }]);

const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const unique = () => crypto.randomUUID().slice(0, 8);
const privacy = (page: Page) => page.locator('#privacy');
const cvSwitch = (page: Page) => page.getByRole('switch', { name: 'Share my CV with partner companies' });
const PDF = { name: 'my-cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 a small CV') };

test.describe('my applications and privacy (M16c)', () => {
  test('the sample member: her three applications with what each can do', async ({ page }) => {
    await asSample(page);
    await page.goto('/en/profile');
    const applications = page.locator('#applications');
    await expect(applications.getByRole('heading', { name: 'My applications' })).toBeVisible();
    const row = (title: string) => applications.getByRole('listitem').filter({ hasText: title });

    await expect(row('Workshop: AI at the Edge')).toContainText('Pending review');
    await expect(row('Workshop: AI at the Edge').getByRole('button', { name: 'Withdraw' })).toBeVisible();
    await expect(row('Hands-on: FPGA Basics')).toContainText('Waitlist · #3');
    await expect(row('Hands-on: FPGA Basics').getByRole('button', { name: 'Leave waitlist' })).toBeVisible();
    await expect(row('Soft Skills Training: Leading Teams')).toContainText('Accepted');
    await expect(
      row('Soft Skills Training: Leading Teams').getByRole('link', { name: 'Event details' }),
    ).toHaveAttribute('href', /\/en\/upcoming\/leading-teams$/);
    await expect(applications.getByRole('link', { name: 'Upcoming events →' })).toHaveAttribute(
      'href',
      '/en/upcoming',
    );
    // The menu counts them.
    await expect(
      page
        .getByRole('navigation', { name: 'My profile sections' })
        .getByRole('link', { name: /My applications/ }),
    ).toContainText('3');
  });

  test('the sample member: what she agreed to and her CV', async ({ page }) => {
    await asSample(page);
    await page.goto('/en/profile');
    const card = privacy(page);
    await expect(card.getByText('Needed to have an account. Given on 12 Oct 2023.')).toBeVisible();
    await expect(card.getByText('Required')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'E-mails about new events and calls' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Name me in event photo galleries' })).not.toBeChecked();
    await expect(cvSwitch(page)).toBeChecked();
    await expect(card.getByText(/Consent saved 2 Oct 2026, 18:42/)).toBeVisible();
    await expect(card.getByTestId('cv-name')).toHaveText('Marija_Stojanovska_CV.pdf');
    await expect(card.getByText(/240 KB · uploaded 2 Oct 2026 · consent given 2 Oct 2026/)).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Privacy & consent' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy policy →' })).toHaveAttribute('href', '/en/privacy');
    // Nobody has seen the CV yet: the line stays out.
    await expect(card.getByText(/Partners saw your CV/)).toHaveCount(0);
  });

  test('has no serious accessibility violations (with the CV card)', async ({ page }) => {
    await asSample(page);
    await page.goto('/en/profile');
    await expect(page.locator('#privacy').getByTestId('cv-name')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('Macedonian page', async ({ page }) => {
    await asSample(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 2, name: 'Приватност и согласност' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Мои пријави' })).toBeVisible();
  });

  test('a new member has no applications and every choice is off', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'creates a member: run once');
    const me = await createApprovedMember(browser, `Privacy ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await expect(
      page.locator('#applications').getByText('You haven’t applied to any event yet.'),
    ).toBeVisible();
    await expect(page.getByRole('switch', { name: 'E-mails about new events and calls' })).not.toBeChecked();
    await expect(page.getByRole('switch', { name: 'Name me in event photo galleries' })).not.toBeChecked();
    await expect(cvSwitch(page)).not.toBeChecked();
    await expect(privacy(page).getByText('No CV is stored while this is off.')).toBeVisible();
    await expect(privacy(page).locator('input[type="file"]')).toHaveCount(0);
  });

  test('e-mails and gallery names are saved at once', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Privacy ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, '#privacy button[role="switch"]');
    // Each change is a request of its own: wait for it to be answered before the next one.
    const saved = () =>
      page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/profile'),
      );
    const first = saved();
    await page.getByRole('switch', { name: 'E-mails about new events and calls' }).click();
    await first;
    const second = saved();
    await page.getByRole('switch', { name: 'Name me in event photo galleries' }).click();
    await second;
    await expect(page.getByRole('switch', { name: 'E-mails about new events and calls' })).toBeChecked();
    await page.reload();
    await expect(page.getByRole('switch', { name: 'E-mails about new events and calls' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Name me in event photo galleries' })).toBeChecked();
    await expect(cvSwitch(page)).not.toBeChecked();
  });

  test('CV: turn sharing on, wrong file, upload, replace, remove, and stop sharing deletes it', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const me = await createApprovedMember(browser, `Privacy ${unique()}`);
    await logInAs(page, me.email);
    await page.goto('/en/profile');
    await hydrated(page, '#privacy button[role="switch"]');
    const card = privacy(page);

    // On, without a file: the upload box.
    await cvSwitch(page).click();
    await expect(card.getByText(/Consent saved \d{1,2} \w{3} \d{4}, \d{2}:\d{2}\./)).toBeVisible();
    await expect(card.getByText('Drop your CV here')).toBeVisible();
    await expect(card.getByText('Partners can’t see anything until you upload a CV.')).toBeVisible();

    // A Word file is refused, naming the file.
    const input = card.locator('input[type="file"]');
    await input.setInputFiles({
      name: 'CV_Test_2026.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('PK'),
    });
    await expect(card.getByText('CV_Test_2026.docx')).toBeVisible();
    await expect(card.getByText('Only PDF files work. Save it as PDF and try again.')).toBeVisible();
    // A PDF that is too big, too.
    await input.setInputFiles({
      name: 'huge.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(5_000_001, 1),
    });
    await expect(card.getByText('That file is too big. PDF files up to 5 MB work.')).toBeVisible();
    // A file that says it is a PDF but is not one is refused by the server.
    await input.setInputFiles({
      name: 'fake.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not a pdf'),
    });
    await expect(card.getByText('Only PDF files work. Save it as PDF and try again.')).toBeVisible();

    await input.setInputFiles(PDF);
    await expect(card.getByTestId('cv-name')).toHaveText('my-cv.pdf');
    await expect(card.getByText('PDF only, up to 5 MB.')).toBeVisible();

    // Kept after a reload; replace it with another file.
    await page.reload();
    await hydrated(page, '#privacy button[role="switch"]');
    await expect(privacy(page).getByTestId('cv-name')).toHaveText('my-cv.pdf');
    await privacy(page)
      .locator('input[type="file"]')
      .setInputFiles({ ...PDF, name: 'second-cv.pdf' });
    await expect(privacy(page).getByTestId('cv-name')).toHaveText('second-cv.pdf');

    // Remove: the file goes, sharing stays on.
    await privacy(page).getByRole('button', { name: 'Remove' }).click();
    await expect(toast(page, 'CV removed')).toBeVisible();
    await expect(privacy(page).getByText('Drop your CV here')).toBeVisible();
    await expect(cvSwitch(page)).toBeChecked();

    // Upload again, then stop sharing: asked first, the file is deleted.
    await privacy(page).locator('input[type="file"]').setInputFiles(PDF);
    await expect(privacy(page).getByTestId('cv-name')).toBeVisible();
    await cvSwitch(page).click();
    const dialog = page.getByRole('alertdialog', { name: 'Stop sharing your CV?' });
    await expect(dialog).toContainText('we delete my-cv.pdf');
    await dialog.getByRole('button', { name: 'Keep sharing' }).click();
    await expect(cvSwitch(page)).toBeChecked();
    await expect(privacy(page).getByTestId('cv-name')).toBeVisible();

    await cvSwitch(page).click();
    await page
      .getByRole('alertdialog', { name: 'Stop sharing your CV?' })
      .getByRole('button', { name: 'Stop sharing and delete CV' })
      .click();
    await expect(cvSwitch(page)).not.toBeChecked();
    await expect(privacy(page).getByText('No CV is stored while this is off.')).toBeVisible();
    await page.reload();
    await hydrated(page, '#privacy button[role="switch"]');
    await expect(cvSwitch(page)).not.toBeChecked();
    // Turned on again later: no file from before.
    await cvSwitch(page).click();
    await expect(privacy(page).getByText('Drop your CV here')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('an application sent with the member’s e-mail shows up, and can be withdrawn', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'sends an application: run once');
    const me = await createApprovedMember(browser, `Privacy ${unique()}`);
    await logInAs(page, me.email);

    await page.goto('/en/upcoming/ai-at-the-edge');
    const apply = page.getByRole('region', { name: 'Apply', exact: true });
    await apply.getByLabel('Full name').fill(me.name);
    await apply.getByLabel('E-mail').fill(me.email);
    await apply.getByLabel('Faculty and university').fill('FEEIT');
    await apply.getByLabel('Year of study').selectOption('4');
    await apply.getByRole('group', { name: 'Are you an EESTEC member?' }).getByText('Yes').click();
    await apply.getByLabel('Motivation letter').fill('Edge AI is what I want to work on.');
    await apply.getByLabel(/I agree that/).check();
    await page.waitForTimeout(3100);
    await apply.getByRole('button', { name: 'Submit application' }).click();
    await expect(apply.getByRole('heading', { name: 'Application sent!' })).toBeVisible();

    await page.goto('/en/profile');
    await hydrated(page, '#applications button');
    const row = page
      .locator('#applications')
      .getByRole('listitem')
      .filter({ hasText: 'Workshop: AI at the Edge' });
    await expect(row).toContainText('Pending review');
    await row.getByRole('button', { name: 'Withdraw' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Withdraw your application?' });
    await expect(dialog).toContainText('We remove your application to Workshop: AI at the Edge.');
    await dialog.getByRole('button', { name: 'Keep it' }).click();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Withdraw' }).click();
    await page
      .getByRole('alertdialog', { name: 'Withdraw your application?' })
      .getByRole('button', { name: 'Withdraw', exact: true })
      .click();
    await expect(toast(page, 'Application withdrawn')).toBeVisible();
    await expect(
      page.locator('#applications').getByText('You haven’t applied to any event yet.'),
    ).toBeVisible();
  });
});
