import { describe, expect, it } from 'vitest';

import { buildMembershipSchema, readMembershipForm } from './membership';

const schema = buildMembershipSchema({
  faculties: ['fac-1', 'fac-2'],
  interests: ['int-1', 'int-2'],
  heardFrom: ['heard-1'],
});

const valid = {
  name: 'Marija Stojanovska',
  email: 'marija.s@students.feit.ukim.edu.mk',
  phone: '070 123 456',
  faculty: 'fac-1',
  program: 'Computer Hardware Engineering',
  year: '2',
  interests: ['int-1'],
  heardFrom: 'heard-1',
  consent: true,
};
const errorsOf = (patch: object) => {
  const result = schema.safeParse({ ...valid, ...patch });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('membership form', () => {
  it('accepts a full application, and one with only the required fields', () => {
    expect(errorsOf({})).toEqual([]);
    expect(errorsOf({ phone: '', interests: [], heardFrom: '' })).toEqual([]);
  });

  it('asks for name, e-mail, faculty, study program, year and consent', () => {
    expect(errorsOf({ name: ' ', email: '', faculty: '', program: '', year: '', consent: false })).toEqual([
      'name:required',
      'email:required',
      'faculty:required',
      'program:required',
      'year:year',
      'consent:consent',
    ]);
  });

  it('checks the e-mail and the phone number', () => {
    expect(errorsOf({ email: 'marija.s@students' })).toEqual(['email:email']);
    expect(errorsOf({ phone: 'call me' })).toEqual(['phone:phone']);
    expect(errorsOf({ phone: '+389 70 123 456' })).toEqual([]);
  });

  it('only accepts the options the board offers', () => {
    expect(errorsOf({ faculty: 'fac-9' })).toEqual(['faculty:required']);
    expect(errorsOf({ interests: ['int-1', 'int-9'] })).toEqual(['interests:invalid']);
    expect(errorsOf({ heardFrom: 'heard-9' })).toEqual(['heardFrom:invalid']);
    expect(errorsOf({ year: '5' })).toEqual(['year:year']);
  });

  it('reads the browser form: several interests, and a checked box means consent', () => {
    const data = new FormData();
    data.set('name', 'A');
    data.append('interests', 'int-1');
    data.append('interests', 'int-2');
    data.set('consent', 'on');
    expect(readMembershipForm(data)).toMatchObject({
      name: 'A',
      interests: ['int-1', 'int-2'],
      consent: true,
      email: '',
    });
    expect(readMembershipForm(new FormData()).consent).toBe(false);
  });
});
