import { describe, expect, it } from 'vitest';

import { contactRepository, messagesRepository } from '../data';
import { submitMessage } from './submit-message';

// The server side of the contact form against the mock data (real rules: spam guard, the board's
// subject list, routing). Each test uses an e-mail address of its own.

const unique = () => crypto.randomUUID().slice(0, 8);

async function formData(patch: Record<string, string | null> = {}) {
  const { subjects } = await (await contactRepository()).get();
  const values: Record<string, string | null> = {
    locale: 'en',
    name: 'Marija Stojanovska',
    email: `test.${unique()}@example.org`,
    subject: subjects[1]!.id,
    message: 'How do I join?',
    consent: 'on',
    form_started_at: String(Date.now() - 10_000),
    website: '',
    ...patch,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== null) data.set(key, value);
  return data;
}

describe('submitMessage', () => {
  it('stores the message with the subject, the address it was routed to and a reference', async () => {
    const data = await formData();
    const result = await submitMessage(data);
    expect(result).toMatchObject({
      ok: true,
      data: { firstName: 'Marija', email: data.get('email'), subject: 'Membership', team: 'membership team' },
    });
    if (!result.ok) return;
    expect(result.data.reference).toMatch(/^MSG-\d{4}-\d{4}$/);
    const stored = (await (await messagesRepository()).list()).find(
      (message) => message.email === data.get('email'),
    );
    expect(stored).toMatchObject({
      name: 'Marija Stojanovska',
      subject: 'Membership',
      routedTo: 'members@eestec.mk',
      message: 'How do I join?',
      status: 'new',
      readAt: null,
      locale: 'en',
    });
  });

  it('checks the answers again on the server', async () => {
    const result = await submitMessage(
      await formData({ email: 'nope', consent: null, subject: 'subject-unknown', message: '   ' }),
    );
    expect(result).toMatchObject({ ok: false, error: 'validation' });
    if (!result.ok && result.error === 'validation')
      expect(Object.keys(result.fieldErrors).sort()).toEqual(['consent', 'email', 'message', 'subject']);
  });

  it('refuses a filled honeypot and a form sent too quickly', async () => {
    expect(await submitMessage(await formData({ website: 'http://spam.example' }))).toMatchObject({
      ok: false,
      error: 'conflict',
      message: 'spam',
    });
    expect(await submitMessage(await formData({ form_started_at: String(Date.now()) }))).toMatchObject({
      ok: false,
      error: 'conflict',
      message: 'tooFast',
    });
  });

  it('does not know an unknown language', async () => {
    expect(await submitMessage(await formData({ locale: 'de' }))).toMatchObject({
      ok: false,
      error: 'not_found',
    });
  });
});
