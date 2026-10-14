import { describe, expect, it } from 'vitest';

import { inquiriesRepository } from '../data';
import { submitInquiry } from './submit-inquiry';

// The server side of the partnership inquiry form against the mock data (real rules: spam guard,
// the answers, the stored result).

function formData(patch: Record<string, string | string[] | null> = {}) {
  const values: Record<string, string | string[] | null> = {
    locale: 'en',
    company: 'Voltline',
    person: 'Petra Ilievska',
    email: 'petra.ilievska@voltline.example',
    phone: '+389 2 123 4567',
    interests: ['workshop', 'job_fair'],
    message: 'We would like to run a hands-on workshop on power electronics for about 30 students.',
    consent: 'on',
    form_started_at: String(Date.now() - 10_000),
    website: '',
    ...patch,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

describe('submitInquiry', () => {
  it('stores the inquiry and gives back what the confirmation shows', async () => {
    const result = await submitInquiry(formData({ company: 'Stored Co' }));
    expect(result).toMatchObject({
      ok: true,
      data: {
        firstName: 'Petra',
        company: 'Stored Co',
        email: 'petra.ilievska@voltline.example',
        interests: ['workshop', 'job_fair'],
      },
    });
    const reference = result.ok ? result.data.reference : '';
    expect(reference).toMatch(/^PRT-\d{4}-\d{4}$/);
    const stored = (await (await inquiriesRepository()).list()).find(
      (inquiry) => inquiry.reference === reference,
    );
    expect(stored).toMatchObject({
      company: 'Stored Co',
      status: 'new',
      locale: 'en',
      contactPerson: 'Petra Ilievska',
    });
  });

  it('lets the same company write again', async () => {
    const first = await submitInquiry(formData());
    const second = await submitInquiry(formData());
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.data.reference).not.toBe(first.data.reference);
  });

  it('checks the answers again on the server', async () => {
    const result = await submitInquiry(
      formData({ company: '', email: 'nope', interests: [], message: 'Too short', consent: null }),
    );
    expect(result).toMatchObject({ ok: false, error: 'validation' });
    if (!result.ok && result.error === 'validation') {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        'company',
        'consent',
        'email',
        'interests',
        'message',
      ]);
      expect(result.fieldErrors.message).toEqual(['tooShort']);
    }
  });

  it('refuses an interest that is not on the list', async () => {
    const result = await submitInquiry(formData({ interests: ['workshop', 'something-else'] }));
    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { 'interests.1': ['invalid'] },
    });
  });

  it('refuses a filled honeypot and a form sent too quickly', async () => {
    expect(await submitInquiry(formData({ website: 'http://spam.example' }))).toMatchObject({
      ok: false,
      error: 'conflict',
      message: 'spam',
    });
    expect(await submitInquiry(formData({ form_started_at: String(Date.now()) }))).toMatchObject({
      ok: false,
      error: 'conflict',
      message: 'tooFast',
    });
  });

  it('needs a known page language', async () => {
    expect(await submitInquiry(formData({ locale: 'xx' }))).toMatchObject({ ok: false, error: 'not_found' });
  });
});
