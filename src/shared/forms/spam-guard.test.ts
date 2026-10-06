import { describe, expect, it } from 'vitest';

import { checkSpamGuard, MIN_FILL_MS } from './spam-guard';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe('checkSpamGuard', () => {
  const started = 1_000_000;
  it('lets people through', () => {
    expect(checkSpamGuard(form({ form_started_at: String(started) }), started + MIN_FILL_MS)).toBe('ok');
  });
  it('stops a filled honeypot and missing start times', () => {
    expect(checkSpamGuard(form({ website: 'x', form_started_at: String(started) }), started + 60_000)).toBe(
      'bot',
    );
    expect(checkSpamGuard(form({}), started)).toBe('bot');
  });
  it('stops forms sent faster than a person could fill them', () => {
    expect(checkSpamGuard(form({ form_started_at: String(started) }), started + 500)).toBe('too_fast');
  });
});
