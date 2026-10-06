import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';

// Public /upcoming and /upcoming/[slug] (M7a), with the clock pinned to 4 Oct 2026, 18:18.
// Other tests publish events too: check the sample ones by name, never totals.

const card = (page: Page, title: string) => page.getByRole('link', { name: new RegExp(title) });
const box = (page: Page) =>
  page.getByRole('complementary', { name: 'Application and event details' }).getByRole('region', {
    name: 'Application',
  });
const unique = () => Math.random().toString(36).slice(2, 8);
const pdf = { name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sample CV') };

/** The spam guard needs a few seconds between showing and sending a form. */
const humanPause = (page: Page) => page.waitForTimeout(3100);

test.describe('upcoming list (M7a)', () => {
  test('shows the next event and the application state of every card (UpcomingList)', async ({ page }) => {
    await page.goto('/en/upcoming');
    await expect(page.getByRole('heading', { level: 1, name: 'Upcoming Events' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^All · \d+$/ })).toHaveAttribute('aria-current', 'true');

    const nextUp = page.getByRole('article', { name: 'Workshop: AI at the Edge' });
    await expect(nextUp).toContainText('Next up');
    await expect(nextUp).toContainText('Applications open');
    await expect(nextUp.getByRole('timer', { name: 'Applications close in' })).toBeVisible();
    await expect(nextUp.getByRole('link', { name: 'Apply now' })).toHaveAttribute(
      'href',
      '/en/upcoming/ai-at-the-edge#apply-ai-at-the-edge',
    );

    await expect(card(page, 'Motivational Weekend Balkan Region 2026')).toContainText(
      'Closed on 1 Oct · selection in progress',
    );
    await expect(card(page, 'Soft Skills Training: Leading Teams')).toContainText('Closes in 2 days 5 h');
    await expect(card(page, 'Soft Skills Training: Leading Teams')).toContainText('Details & application');
    // 7 on the canvas; the waitlist test adds one.
    await expect(card(page, 'Hands-on: FPGA Basics')).toContainText(/20 \/ 20 places · \d+ on the waitlist/);
    await expect(card(page, 'Hands-on: FPGA Basics')).toContainText('Full · waitlist open');
    await expect(card(page, 'Exchange: Kraków Winter Edition')).toContainText(
      'Applications open 15 Oct on eestec.net',
    );
    // Drafts are not listed (the canvas shows them; AdminEvents says they are drafts).
    await expect(page.getByRole('heading', { name: 'New Year Social 2026' })).toHaveCount(0);

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('filters by category in the URL', async ({ page }) => {
    await page.goto('/en/upcoming');
    await page.getByRole('link', { name: /^Local · \d+$/ }).click();
    await expect(page).toHaveURL(/scope=local/);
    await expect(card(page, 'Hands-on: FPGA Basics')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Workshop: AI at the Edge' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Exchange: Kraków Winter Edition' })).toHaveCount(0);
  });

  test('Macedonian is the default language', async ({ page }) => {
    await page.goto('/upcoming');
    await expect(page.getByRole('heading', { level: 1, name: 'Претстојни настани' })).toBeVisible();
  });
});

test.describe('upcoming event page (M7a)', () => {
  test('shows the application box, programme, requirements and fee (UpcomingDetail)', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/en/upcoming/ai-at-the-edge');
    await expect(page.getByRole('heading', { level: 1, name: 'Workshop: AI at the Edge' })).toBeVisible();
    if (!isMobile) {
      await expect(box(page)).toContainText('Applications open');
      await expect(box(page)).toContainText('Deadline: Sun 18 Oct 2026, 23:59');
      await expect(box(page)).toContainText('24 places · Results by 25 Oct');
      await expect(page.getByRole('complementary', { name: 'Application and event details' })).toContainText(
        'Sat 7 – Fri 13 Nov 2026',
      );
    }
    const programme = page.getByRole('region', { name: 'Programme' });
    await expect(programme.getByRole('listitem')).toHaveCount(7);
    await expect(programme.getByRole('listitem').first()).toContainText('Day 1');
    await expect(programme.getByRole('listitem').first()).toContainText('Arrival and welcome party');
    await expect(page.getByRole('heading', { name: 'Who can apply' })).toBeVisible();
    await expect(page.getByText('€60')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Apply', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'aiedge@eestec.mk' })).toHaveAttribute(
      'href',
      'mailto:aiedge@eestec.mk',
    );

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('the form checks its fields, then confirms with a reference (UpcomingStates)', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'sends an application: run once');
    await page.goto('/en/upcoming/ai-at-the-edge');
    const apply = page.getByRole('region', { name: 'Apply', exact: true });
    await apply.getByRole('button', { name: 'Submit application' }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'Please fix 7 fields' });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Full name: Enter your full name.');
    await expect(summary).toContainText('Motivation letter: Fill in this field.');
    await summary.getByRole('link', { name: /^E-mail/ }).click();
    await expect(apply.getByLabel('E-mail')).toBeFocused();
    await settled(apply);
    expect(await seriousViolations(page)).toEqual([]);

    const email = `marija.${unique()}@students.feit.ukim.edu.mk`;
    await apply.getByLabel('Full name').fill('Marija Stojanovska');
    await apply.getByLabel('E-mail').fill(email);
    await apply.getByLabel('Faculty and university').fill('FEEIT, UKIM Skopje');
    await apply.getByLabel('Year of study').selectOption('3');
    await apply.getByRole('group', { name: 'Are you an EESTEC member?' }).getByText('Yes').click();
    await apply.getByLabel('Motivation letter').fill('I build small robots and want to put models on them.');
    await expect(apply.getByText('52 / 2,000')).toBeVisible();
    await apply.locator('input[type="file"]').setInputFiles(pdf);
    await apply.getByRole('group', { name: 'T-shirt size' }).getByText('M', { exact: true }).click();
    await apply.getByLabel(/I agree that EESTEC LC Skopje processes my personal data/).check();
    await humanPause(page);
    await apply.getByRole('button', { name: 'Submit application' }).click();

    const success = apply.getByRole('status');
    await expect(success.getByRole('heading', { name: 'Application sent!' })).toBeVisible();
    await expect(success).toContainText(`Thanks, Marija. We sent a confirmation to ${email}.`);
    await expect(success).toContainText('The organizing team will let you know by 25 Oct 2026.');
    await expect(success).toContainText(/AIE-2026-\d{4}/);
    await expect(success).toContainText('Workshop: AI at the Edge');

    // The same e-mail can't apply twice.
    await page.reload();
    await apply.getByLabel('Full name').fill('Marija Stojanovska');
    await apply.getByLabel('E-mail').fill(email);
    await apply.getByLabel('Faculty and university').fill('FEEIT');
    await apply.getByLabel('Year of study').selectOption('3');
    await apply.getByRole('group', { name: 'Are you an EESTEC member?' }).getByText('No').click();
    await apply.getByLabel('Motivation letter').fill('Again.');
    await apply.getByLabel(/I agree that/).check();
    await humanPause(page);
    await apply.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'You have already applied' })).toContainText(
      'aiedge@eestec.mk',
    );
  });

  test('rejects files that are not PDFs', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await page.goto('/en/upcoming/ai-at-the-edge');
    const apply = page.getByRole('region', { name: 'Apply', exact: true });
    await apply
      .locator('input[type="file"]')
      .setInputFiles({ name: 'cv.docx', mimeType: 'application/msword', buffer: Buffer.from('doc') });
    await apply.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /Please fix/ })).toContainText(
      'CV (PDF, max 5 MB): Upload a PDF file.',
    );
  });

  test('a full event takes the waitlist (ApplyBox › Full)', async ({ page, isMobile }) => {
    await page.goto('/en/upcoming/fpga-basics');
    if (!isMobile) {
      await expect(box(page)).toContainText('Full');
      await expect(box(page).getByRole('progressbar', { name: 'Places taken' })).toHaveAttribute(
        'aria-valuenow',
        '20',
      );
      await expect(box(page)).toContainText(/\d+ people on the waitlist/);
      await expect(box(page).getByRole('link', { name: 'Join the waitlist' })).toBeVisible();
    }
    test.skip(isMobile, 'sends an application: run once');
    const apply = page.getByRole('region', { name: 'Join the waitlist' });
    await apply.getByLabel('Full name').fill('Stefan Nikolovski');
    await apply.getByLabel('E-mail').fill(`stefan.${unique()}@example.com`);
    await apply.getByLabel('Faculty and university').fill('FEEIT');
    await apply.getByLabel('Year of study').selectOption('2');
    await apply.getByRole('group', { name: 'Are you an EESTEC member?' }).getByText('Yes').click();
    await apply.getByLabel('Motivation letter').fill('I want to learn FPGAs.');
    await apply.getByLabel(/I agree that/).check();
    await humanPause(page);
    await apply.getByRole('button', { name: 'Join the waitlist' }).click();
    const success = apply.getByRole('status');
    await expect(success.getByRole('heading', { name: "You're on the waitlist" })).toBeVisible();
    await expect(success).toContainText(/You are number \d+ on the waitlist/);
  });

  test('closed, closing soon and opening soon (UpcomingStates)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the box is in the right column on desktop');
    await page.goto('/en/upcoming/mw-balkan-2026');
    await expect(box(page)).toContainText(
      'Applications closed on 1 Oct 2026. Selected participants will get an e-mail by 8 Oct.',
    );
    await expect(box(page).getByRole('button', { name: 'Applications closed' })).toBeDisabled();
    await expect(page.getByRole('region', { name: 'Apply', exact: true })).toHaveCount(0);

    await page.goto('/en/upcoming/leading-teams');
    await expect(box(page)).toContainText('Closing soon');
    await expect(box(page).getByRole('timer', { name: 'Last chance! Applications close in' })).toBeVisible();
    await expect(box(page)).toContainText('30 places · Free for FEEIT students');

    await page.goto('/en/upcoming/krakow-winter-exchange');
    await expect(box(page)).toContainText('Opening soon');
    await expect(box(page).getByRole('timer', { name: 'Applications open in' })).toBeVisible();
    await expect(box(page)).toContainText('Opens: Thu 15 Oct 2026, 12:00');
    await expect(box(page).getByRole('button', { name: 'Opens 15 Oct' })).toBeDisabled();
  });

  test('adds the event to a calendar (.ics and Google)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await page.goto('/en/upcoming/ai-at-the-edge');
    await box(page).getByRole('button', { name: 'Add to calendar' }).click();
    const google = page.getByRole('menuitem', { name: 'Google Calendar' });
    await expect(google).toHaveAttribute(
      'href',
      /calendar\.google\.com.*dates=20261107T090000Z%2F20261113T130000Z/,
    );
    await expect(page.getByRole('menuitem', { name: 'Apple Calendar (.ics)' })).toHaveAttribute(
      'href',
      '/en/upcoming/ai-at-the-edge/calendar',
    );
    await settled(page.getByRole('menu'));
    expect(await seriousViolations(page)).toEqual([]);

    for (const path of ['/en/upcoming/ai-at-the-edge/calendar', '/upcoming/ai-at-the-edge/calendar']) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/calendar');
      expect(response.headers()['content-disposition']).toBe('attachment; filename="ai-at-the-edge.ics"');
      expect(await response.text()).toContain('SUMMARY:Workshop: AI at the Edge');
    }
  });

  test('ended events move to the archive with a 301; unknown addresses are 404', async ({ page }) => {
    const ended = await page.request.get('/en/upcoming/power-up-2026', { maxRedirects: 0 });
    expect(ended.status()).toBe(301);
    expect(ended.headers().location).toMatch(/\/en\/events\/power-up-2026$/);
    const mk = await page.request.get('/upcoming/power-up-2026', { maxRedirects: 0 });
    expect(mk.headers().location).toMatch(/^(https?:\/\/[^/]+)?\/events\/power-up-2026$/);
    await page.goto('/en/upcoming/no-such-event');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.goto('/en/upcoming/new-year-social-2026');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('phones keep "Apply now" at the bottom until the form (UpcomingDetail-Mobile-Viewport)', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the sticky bar is the phone layout');
    await page.goto('/en/upcoming/ai-at-the-edge');
    // Not by role: once hidden (aria-hidden) it leaves the accessibility tree.
    const bar = page.locator('[role="region"][aria-label="Apply for this event"]');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(/\d+ d \d{2} h \d{2} m/);
    await bar.getByRole('link', { name: 'Apply now' }).click();
    await expect(page).toHaveURL(/#apply-ai-at-the-edge$/);
    await expect(
      page.getByRole('region', { name: 'Apply', exact: true }).getByLabel('Full name'),
    ).toBeInViewport();
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
  });
});
