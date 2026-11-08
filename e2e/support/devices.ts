import type { Page } from '@playwright/test';

/**
 * A device of its own for this test: the limit of 5 submissions per hour counts per device, and
 * every test runs on the same machine, so each gets a made-up forwarding address on all its requests.
 */
export async function ownDevice(page: Page) {
  const part = () => Math.floor(Math.random() * 250) + 1;
  await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': `10.${part()}.${part()}.${part()}` });
}
