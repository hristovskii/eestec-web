import { expect, type Page, test } from '@playwright/test';

// Keyboard pass over the public site (M13c): the skip link, a visible focus ring on every tab stop,
// no keyboard trap, the mobile menu and a form that is filled in and sent without a mouse.

const PAGES = ['/en', '/en/events', '/en/events/robomac-2025', '/en/join', '/en/partners', '/en/contact'];

/** What the focused element looks like: has a visible outline or ring, and where it is. */
async function focusState(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const ring = style.boxShadow !== 'none';
    // Radios and checkboxes show the ring on their styled box, not on the hidden input.
    const label = element.closest('label');
    const proxy = label ? getComputedStyle(label.querySelector('[data-state], span') ?? label) : null;
    return {
      name:
        element.getAttribute('aria-label') ??
        (element.textContent ?? '').trim().slice(0, 40) ??
        element.tagName,
      tag: element.tagName.toLowerCase(),
      visible:
        outline || ring || (proxy ? proxy.boxShadow !== 'none' || proxy.outlineStyle !== 'none' : false),
      inView: rect.width > 0 && rect.height > 0,
    };
  });
}

test.describe('keyboard (M13c)', () => {
  test('the first Tab shows "Skip to content", and Enter moves focus to the page', async ({ page }) => {
    await page.goto('/en/events');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    // Next finishes its own scroll to the target a moment after the jump; a Tab before that restarts from the link.
    await page.waitForTimeout(500);
    // The next Tab goes into the page, not back to the header.
    await page.keyboard.press('Tab');
    const where = await page.evaluate(() => {
      const el = document.activeElement;
      return `${el?.tagName} ${(el?.textContent ?? '').slice(0, 30)} inMain=${!!el?.closest('main')}`;
    });
    expect(where).toContain('inMain=true');
  });

  for (const path of PAGES) {
    test(`${path}: every tab stop shows a focus ring, and the focus never gets stuck`, async ({
      page,
      isMobile,
    }) => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const seen = new Set<string>();
      const problems: string[] = [];
      let reachedFooter = false;
      for (let step = 0; step < 160; step += 1) {
        await page.keyboard.press('Tab');
        const state = await focusState(page);
        if (!state) {
          // Focus left the page (browser chrome): the whole page was walked once.
          reachedFooter = true;
          break;
        }
        const inFooter = await page.evaluate(() => !!document.activeElement?.closest('footer'));
        if (inFooter) reachedFooter = true;
        if (state.inView && !state.visible) problems.push(`${state.tag} "${state.name}"`);
        seen.add(`${state.tag}:${state.name}`);
      }
      expect(problems, `no focus ring on ${path}${isMobile ? ' (mobile)' : ''}`).toEqual([]);
      expect(reachedFooter, 'Tab reaches the footer').toBe(true);
      expect(seen.size).toBeGreaterThan(5);
    });
  }

  test('the mobile menu opens with Enter, closes with Escape and returns focus to its button', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile only');
    await page.goto('/en/contact');
    const toggle = page.locator('header:visible').getByRole('button', { name: 'Open menu' });
    await toggle.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('navigation', { name: 'Main' });
    await expect(menu).toBeVisible();
    await expect(page.locator('header:visible').getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // Tab walks into the menu; Escape from there still closes it and puts focus back.
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('nav'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.locator('header:visible').getByRole('button', { name: 'Open menu' })).toBeFocused();
  });

  test('the contact form is filled in and sent with the keyboard only', async ({ page }) => {
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto('/en/contact');
    const form = page.getByRole('form', { name: 'Send us a message' });
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3200);
    await form.getByLabel(/^Your name/).focus();
    await page.keyboard.type('Elena Petrova');
    await page.keyboard.press('Tab');
    await page.keyboard.type('elena.petrova@example.com');
    await page.keyboard.press('Tab');
    // The subject is a native select: letters pick an option.
    await page.keyboard.type('Gen');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Hello, is the office open on Fridays?');
    await form.getByRole('checkbox', { name: /I agree that/ }).focus();
    await page.keyboard.press('Space');
    await expect(form.getByRole('checkbox', { name: /I agree that/ })).toBeChecked();
    // The agreement text has a link to the privacy policy: Tab goes there first, then to the button.
    await page.keyboard.press('Tab');
    await expect(form.getByRole('link', { name: 'privacy policy' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(form.getByRole('button', { name: 'Send message' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Message sent\. Thanks, Elena!/ })).toBeVisible();
  });
});
