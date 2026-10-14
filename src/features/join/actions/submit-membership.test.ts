import { describe, expect, it } from 'vitest';

import { joinRepository, membershipRepository } from '../data';
import { submitMembership } from './submit-membership';

// The server side of the membership form against the mock data (real rules: spam guard, open /
// closed, the board's option lists, duplicates). Each test uses an e-mail address of its own.

const unique = () => crypto.randomUUID().slice(0, 8);

async function optionIds() {
  const { apply } = await (await joinRepository()).get();
  return { faculty: apply.faculties[0]!.id, interest: apply.interests[0]!.id, heard: apply.heardFrom[0]!.id };
}

async function formData(patch: Record<string, string | null> = {}) {
  const ids = await optionIds();
  const values: Record<string, string | null> = {
    locale: 'en',
    name: 'Marija Stojanovska',
    email: `test.${unique()}@example.org`,
    phone: '070 123 456',
    faculty: ids.faculty,
    program: 'Computer Hardware Engineering',
    year: '2',
    interests: ids.interest,
    heardFrom: ids.heard,
    consent: 'on',
    form_started_at: String(Date.now() - 10_000),
    website: '',
    ...patch,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== null) data.set(key, value);
  return data;
}

describe('submitMembership', () => {
  it('stores the application with the wording of the options the person chose', async () => {
    const data = await formData();
    const result = await submitMembership(data);
    expect(result).toMatchObject({ ok: true, data: { firstName: 'Marija', email: data.get('email') } });
    const stored = (await (await membershipRepository()).list()).find(
      (application) => application.email === data.get('email'),
    );
    expect(stored).toMatchObject({
      name: 'Marija Stojanovska',
      faculty: 'FEEIT',
      yearOfStudy: '2',
      interests: ['IT'],
      heardFrom: 'Instagram',
      status: 'new',
      locale: 'en',
    });
  });

  it('checks the answers again on the server', async () => {
    const result = await submitMembership(
      await formData({ email: 'nope', consent: null, faculty: 'fac-unknown' }),
    );
    expect(result).toMatchObject({ ok: false, error: 'validation' });
    if (!result.ok && result.error === 'validation')
      expect(Object.keys(result.fieldErrors).sort()).toEqual(['consent', 'email', 'faculty']);
  });

  it('refuses a filled honeypot and a form sent too quickly', async () => {
    expect(await submitMembership(await formData({ website: 'http://spam.example' }))).toMatchObject({
      ok: false,
      error: 'conflict',
      message: 'spam',
    });
    expect(await submitMembership(await formData({ form_started_at: String(Date.now()) }))).toMatchObject({
      ok: false,
      error: 'conflict',
      message: 'tooFast',
    });
  });

  it('refuses the same e-mail twice, in any letter case', async () => {
    const first = await formData();
    expect((await submitMembership(first)).ok).toBe(true);
    const email = first.get('email');
    if (typeof email !== 'string') throw new Error('no e-mail');
    const again = await formData({ email: email.toUpperCase() });
    expect(await submitMembership(again)).toMatchObject({
      ok: false,
      error: 'conflict',
      message: 'duplicate',
    });
  });

  it('takes nothing while applications are closed', async () => {
    const repo = await joinRepository('session');
    const before = await repo.get();
    try {
      await repo.save({ ...before, apply: { ...before.apply, open: false } });
      expect(await submitMembership(await formData())).toMatchObject({
        ok: false,
        error: 'conflict',
        message: 'closed',
      });
    } finally {
      await repo.save(before);
    }
  });

  it('does not know an unknown language', async () => {
    expect(await submitMembership(await formData({ locale: 'de' }))).toMatchObject({
      ok: false,
      error: 'not_found',
    });
  });
});
