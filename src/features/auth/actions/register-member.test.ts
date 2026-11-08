import { describe, expect, it } from 'vitest';

import { authRepository } from '../data';
import { listMockMail } from '../data/mailbox';
import { registerMember } from './register-member';

// The server side of the sign-up form against the mock data (real rules: spam guard, fields,
// password, photo, a free e-mail). Each test uses an e-mail address of its own.

const unique = () => crypto.randomUUID().slice(0, 8);

function formData(patch: Record<string, string | File | null> = {}) {
  const values: Record<string, string | File | null> = {
    locale: 'en',
    name: 'Ivo Dimitrov',
    email: `ivo.${unique()}@students.feit.ukim.edu.mk`,
    password: 'lake-ohrid-2026',
    faculty: 'FEEIT',
    phone: '',
    year: '2',
    visibility: 'members',
    consent: 'on',
    form_started_at: String(Date.now() - 10_000),
    website: '',
    ...patch,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== null) data.set(key, value);
  return data;
}

describe('registerMember', () => {
  it('stores the registration and sends the confirmation link', async () => {
    const email = `ivo.${unique()}@students.feit.ukim.edu.mk`;
    const result = await registerMember(formData({ email }));
    expect(result).toEqual({ ok: true, data: { firstName: 'Ivo', email } });
    const stored = (await (await authRepository()).listRegistrations()).find((item) => item.email === email);
    expect(stored).toMatchObject({
      status: 'awaiting_confirmation',
      year: '2',
      visibility: 'members',
      photoId: null,
    });
    expect(listMockMail(email)[0]?.kind).toBe('confirm');
  });

  it('keeps a chosen photo, JPG or PNG up to 5 MB, and refuses anything else', async () => {
    const photo = new File([new Uint8Array(1000)], 'me.png', { type: 'image/png' });
    const goodEmail = `ivo.${unique()}@students.feit.ukim.edu.mk`;
    expect(await registerMember(formData({ photo, email: goodEmail }))).toMatchObject({ ok: true });
    const stored = (await (await authRepository()).listRegistrations()).find(
      (item) => item.email === goodEmail,
    );
    expect(stored?.photoId).toBeTruthy();

    const gif = await registerMember(
      formData({ photo: new File([new Uint8Array(10)], 'me.gif', { type: 'image/gif' }) }),
    );
    expect(gif).toMatchObject({ ok: false, error: 'validation', fieldErrors: { photo: ['photoType'] } });
    const big = await registerMember(
      formData({ photo: new File([new Uint8Array(5_000_001)], 'me.jpg', { type: 'image/jpeg' }) }),
    );
    expect(big).toMatchObject({ ok: false, error: 'validation', fieldErrors: { photo: ['photoSize'] } });
  });

  it('names every empty required field, with the message keys of the form', async () => {
    const result = await registerMember(
      formData({ name: '', email: '', password: '', faculty: '', year: '', consent: null }),
    );
    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: {
        name: ['required'],
        email: ['required'],
        password: ['required'],
        faculty: ['required'],
        year: ['year'],
        consent: ['consent'],
      },
    });
  });

  it('refuses a password that is too short, personal or common, with its own message', async () => {
    const message = async (password: string, patch: Record<string, string> = {}) => {
      const result = await registerMember(formData({ password, ...patch }));
      return !result.ok && result.error === 'validation' ? result.fieldErrors.password : undefined;
    };
    expect(await message('elena123')).toEqual(['passwordShort']);
    expect(await message('ivodimitrov2', { name: 'Ivo Dimitrov' })).toEqual(['passwordPersonal']);
    expect(await message('password123')).toEqual(['passwordCommon']);
    expect(await message('lake-ohrid-2026')).toBeUndefined();
  });

  it('says an e-mail is already registered, as drawn', async () => {
    const result = await registerMember(formData({ email: 'marija.s@students.feit.ukim.edu.mk' }));
    expect(result).toEqual({ ok: false, error: 'validation', fieldErrors: { email: ['emailTaken'] } });
  });

  it('checks the e-mail and the phone number', async () => {
    const result = await registerMember(formData({ email: 'ivo@feit', phone: 'call me' }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { email: ['email'], phone: ['phone'] } });
  });

  it('refuses a bot (hidden field) and a form sent too fast, and an unknown language', async () => {
    expect(await registerMember(formData({ website: 'http://spam.example' }))).toEqual({
      ok: false,
      error: 'conflict',
      message: 'spam',
    });
    expect(await registerMember(formData({ form_started_at: String(Date.now() - 500) }))).toEqual({
      ok: false,
      error: 'conflict',
      message: 'tooFast',
    });
    expect(await registerMember(formData({ locale: 'de' }))).toEqual({ ok: false, error: 'not_found' });
  });
});
