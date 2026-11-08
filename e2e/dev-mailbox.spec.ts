import { expect, test } from '@playwright/test';

import { PRODUCTION_URL } from './support/servers';

// The mock mailbox (M14a): the e-mails the member flow would send, for people and tests to open.
// Dev and preview only; the production server (same build, VERCEL_ENV=production) answers 404.

test.describe('mock mailbox', () => {
  test('answers with JSON on a development or preview server', async ({ request }) => {
    const response = await request.get('/api/dev-mailbox?to=nobody@example.com');
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ mail: [] });
  });

  test('is not there on production', async ({ request }) => {
    expect((await request.get(`${PRODUCTION_URL}/api/dev-mailbox`)).status()).toBe(404);
    expect((await request.get(`${PRODUCTION_URL}/api/dev-member-photos/anything`)).status()).toBe(404);
  });

  test('has no photo for an id that does not exist', async ({ request }) => {
    expect((await request.get('/api/dev-member-photos/not-there')).status()).toBe(404);
  });
});
