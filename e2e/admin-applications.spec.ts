import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';
import { PORT } from './support/servers';

// Admin › Applications (M7b), with the clock pinned to 4 Oct 2026, 18:18. Public tests send
// applications too: numbers are checked as patterns, changes use Leading Teams or new applicants.

async function signInAs(page: Page, persona: 'super-admin' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const table = (page: Page) => page.getByRole('table');
const row = (page: Page, text: string) => table(page).getByRole('row').filter({ hasText: text });
const unique = () => Math.random().toString(36).slice(2, 8);

test.describe('applications admin (M7b)', () => {
  test('lists the events taking applications, with new counts and places', async ({ page, isMobile }) => {
    test.skip(isMobile, 'table columns are checked on desktop; phones get cards');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/applications');
    await expect(page.getByRole('heading', { level: 1, name: 'Applications' })).toBeVisible();
    const ai = row(page, 'Workshop: AI at the Edge');
    await expect(ai).toContainText(/\d+ new/);
    await expect(ai).toContainText('Open');
    await expect(row(page, 'Soft Skills Training: Leading Teams')).toContainText('Closing soon');
    await expect(row(page, 'Hands-on: FPGA Basics')).toContainText('20 / 20');
    await expect(row(page, 'Hands-on: FPGA Basics')).toContainText('Full · waitlist');
    // Applications on eestec.net are not listed.
    await expect(row(page, 'Kraków')).toHaveCount(0);
    await page.getByRole('link', { name: /^Past \d+$/ }).click();
    await expect(row(page, 'Workshop: Power Up — Renewable Grids')).toContainText('24 / 24');

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the waitlist tab keeps the waitlist order', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin/applications?event=ev-fpga-basics&status=waitlist');
    await expect(page.getByRole('heading', { level: 1, name: 'Hands-on: FPGA Basics' })).toBeVisible();
    await expect(page.getByText(/20 accepted of 20 places/)).toBeVisible();
    await expect(page.getByText('Waitlist #1').filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Sample applicant 21').filter({ visible: true })).toBeVisible();
  });

  test('opens an application, which is then no longer new', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    await signInAs(page, 'super-admin');
    // The latest AI at the Edge sample applications are unread.
    await page.goto('/admin/applications?event=ev-ai-at-the-edge&q=sample+applicant+38');
    const applicant = row(page, 'Sample applicant 38');
    await expect(applicant).toContainText('New');
    await applicant.getByRole('link', { name: 'Sample applicant 38' }).click();
    const sheet = page.getByRole('dialog', { name: 'Sample applicant 38' });
    await expect(sheet).toContainText('Application AIE-2026-0038');
    await expect(sheet.getByRole('group', { name: 'Change status' })).toBeVisible();
    await expect(sheet).toContainText('Motivation letter');
    await settled(sheet);
    // Opening changes the URL (?open=): let the navigation finish before checking the page.
    await expect(page).toHaveTitle(/Applications/);
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/open=/);
    await page.reload();
    await expect(row(page, 'Sample applicant 38')).not.toContainText('New');
  });

  test('bulk status changes move applications between tabs', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes data: run once (bulk actions are desktop)');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/applications?event=ev-leading-teams&q=sample+applicant+0');
    for (const name of ['Sample applicant 01', 'Sample applicant 02'])
      await row(page, name).getByRole('checkbox').check();
    await page.getByRole('region', { name: 'Bulk actions' }).getByRole('button', { name: 'Accept' }).click();
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: '2 applications moved to Accepted' }),
    ).toBeVisible();
    await expect(row(page, 'Sample applicant 01')).toContainText('Accepted');
    await page.getByRole('link', { name: /^Accepted \d+$/ }).click();
    await expect(row(page, 'Sample applicant 02')).toBeVisible();
    await expect(page.getByRole('link', { name: /E-mail accepted \(\d+\)/ })).toHaveAttribute(
      'href',
      /^mailto:\?bcc=/,
    );
  });

  test('exports the applications with every answer (CSV)', async ({ page }) => {
    await signInAs(page, 'super-admin');
    const response = await page.request.get(
      '/api/export/applications?event=ev-ai-at-the-edge&status=pending',
    );
    expect(response.status()).toBe(200);
    expect(response.headers()['content-disposition']).toBe(
      'attachment; filename="applications-ai-at-the-edge.csv"',
    );
    const csv = await response.text();
    expect(csv).toContain('Reference,Name,E-mail,Status,Waitlist position,Submitted,Language,Phone');
    expect(csv).toContain('Motivation letter');
    expect(csv).toContain('AIE-2026-0001,Sample applicant 01');
  });

  test('a CV sent on the site downloads from the application', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sends an application: run once');
    const email = `cv.${unique()}@example.com`;
    await page.goto('/en/upcoming/ai-at-the-edge');
    const apply = page.getByRole('region', { name: 'Apply', exact: true });
    await apply.getByLabel('Full name').fill('Elena Petrova');
    await apply.getByLabel('E-mail').fill(email);
    await apply.getByLabel('Faculty and university').fill('FEEIT');
    await apply.getByLabel('Year of study').selectOption('4');
    await apply.getByRole('group', { name: 'Are you an EESTEC member?' }).getByText('No').click();
    await apply.getByLabel('Motivation letter').fill('Edge AI is what I want to work on.');
    await apply.locator('input[type="file"]').setInputFiles({
      name: 'elena-cv.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 CV'),
    });
    await apply.getByLabel(/I agree that/).check();
    await page.waitForTimeout(3100);
    await apply.getByRole('button', { name: 'Submit application' }).click();
    await expect(apply.getByRole('heading', { name: 'Application sent!' })).toBeVisible();

    await signInAs(page, 'super-admin');
    await page.goto(`/admin/applications?event=ev-ai-at-the-edge&q=${encodeURIComponent(email)}`);
    await row(page, 'Elena Petrova').getByRole('link', { name: 'Elena Petrova' }).click();
    const sheet = page.getByRole('dialog', { name: 'Elena Petrova' });
    const download = sheet.getByRole('link', { name: /Download elena-cv\.pdf/ });
    const href = await download.getAttribute('href');
    const file = await page.request.get(href!);
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toBe('application/pdf');
    expect(await file.text()).toBe('%PDF-1.4 CV');
    // Without a session the file is not there.
    await page.context().clearCookies();
    expect((await page.request.get(href!)).status()).toBe(404);
  });

  test('event managers see the applications of their events only (D18)', async ({ page }) => {
    await signInAs(page, 'event-manager');
    await page.goto('/admin/applications');
    await expect(page.getByText('Applications for the events you manage.')).toBeVisible();
    await expect(page.getByText('Hands-on: FPGA Basics').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Workshop: AI at the Edge')).toHaveCount(0);
    await page.goto('/admin/applications?event=ev-ai-at-the-edge');
    await expect(page.getByRole('heading', { name: /not found|doesn't exist/i })).toBeVisible();
    const csv = await page.request.get('/api/export/applications?event=ev-ai-at-the-edge');
    expect(csv.status()).toBe(403);
  });

  test('the dashboard counts applications for open events', async ({ page }) => {
    await signInAs(page, 'super-admin');
    await page.goto('/admin');
    await expect(
      page
        .getByText(/Across 3 events · \d+ new/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });
});

test.describe('admission (D22)', () => {
  test('the edit form offers Selection and First come, Selection by default', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/events/ev-ai-at-the-edge');
    const admission = page.getByRole('group', { name: 'Admission' });
    await expect(admission.getByLabel('Selection: the board accepts applicants')).toBeChecked();
    await admission.getByLabel('First come, first served').check();
    await expect(admission).toContainText('accepted at once until the places are full');
  });
});
