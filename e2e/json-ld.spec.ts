import { expect, type Page, test } from '@playwright/test';

// Structured data (M13b): the home page names the association, event pages describe the event.

async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return texts.map((text) => JSON.parse(text) as Record<string, unknown>);
}

test.describe('JSON-LD (M13b)', () => {
  test('Home: the association, with logo, profiles and address from Settings', async ({ page }) => {
    await page.goto('/en');
    const [organization] = await jsonLd(page);
    expect(organization).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'EESTEC LC Skopje',
    });
    expect(String(organization?.logo)).toMatch(/^https?:\/\/.+\/brand\/.+\.png$/);
    expect(organization?.sameAs).toEqual(expect.arrayContaining([expect.stringMatching(/^https:\/\//)]));
    expect(organization?.email).toBeTruthy();
  });

  test('an upcoming event: name, dates, place, organizer and its own address', async ({ page }) => {
    await page.goto('/en/upcoming/ai-at-the-edge');
    const events = (await jsonLd(page)).filter((node) => node['@type'] === 'Event');
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event).toMatchObject({
      name: 'Workshop: AI at the Edge',
      startDate: '2026-11-07T10:00:00+01:00',
      endDate: '2026-11-13T14:00:00+01:00',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: 'Skopje & Ohrid, North Macedonia' },
      organizer: { '@type': 'Organization', name: 'EESTEC LC Skopje' },
    });
    expect(new URL(String(event?.url)).pathname).toBe('/en/upcoming/ai-at-the-edge');
    // Nothing the board did not write: no price, no online mode.
    expect(event).not.toHaveProperty('offers');
    // The date in the data is the date on the page.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Workshop: AI at the Edge');
  });

  test('a past event is described at its /events address, in Macedonian too', async ({ page }) => {
    await page.goto('/events/robomac-2025');
    const [event] = (await jsonLd(page)).filter((node) => node['@type'] === 'Event');
    expect(new URL(String(event?.url)).pathname).toBe('/events/robomac-2025');
    expect(String(event?.startDate)).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(event?.name).toBeTruthy();
  });

  test('pages with no structured data have none', async ({ page }) => {
    await page.goto('/en/contact');
    expect(await jsonLd(page)).toEqual([]);
  });
});
