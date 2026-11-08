import { describe, expect, it } from 'vitest';

import { profileSelfSchema } from './profile-self.schema';

const good = {
  name: 'Marija Stojanovska',
  username: 'marija-stojanovska',
  bio: 'Third-year student.',
  linkedinUrl: 'https://linkedin.com/in/marija-stojanovska',
  githubUrl: 'https://github.com/marijas',
  faculty: 'FEEIT',
  phone: '070 123 456',
  year: '3',
};

const messages = (input: Record<string, unknown>) => {
  const result = profileSelfSchema.safeParse({ ...good, ...input });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('profileSelfSchema', () => {
  it('accepts the sample member', () => {
    expect(messages({})).toEqual([]);
  });

  it('keeps links, bio and phone optional', () => {
    expect(messages({ bio: '', linkedinUrl: '', githubUrl: '', phone: '' })).toEqual([]);
  });

  it('wants a name of 2 to 80 characters', () => {
    expect(messages({ name: ' A ' })).toEqual(['name:nameShort']);
    expect(messages({ name: 'x'.repeat(81) })).toEqual(['name:nameLong']);
  });

  it('makes the address lower case and refuses bad or reserved ones', () => {
    const parsed = profileSelfSchema.parse({ ...good, username: ' Marija-S ' });
    expect(parsed.username).toBe('marija-s');
    expect(messages({ username: 'ab' })).toEqual(['username:usernameInvalid']);
    expect(messages({ username: 'Marija S' })).toEqual(['username:usernameInvalid']);
    expect(messages({ username: 'admin' })).toEqual(['username:usernameReserved']);
  });

  it('holds the bio to 400 characters', () => {
    expect(messages({ bio: 'x'.repeat(400) })).toEqual([]);
    expect(messages({ bio: 'x'.repeat(401) })).toEqual(['bio:bioLong']);
  });

  it('wants https links on the right site', () => {
    expect(messages({ githubUrl: 'http://github.com/x' })).toEqual(['githubUrl:urlInvalid']);
    expect(messages({ githubUrl: 'https://gitlab.com/x' })).toEqual(['githubUrl:urlHost']);
    expect(messages({ linkedinUrl: 'https://github.com/x' })).toEqual(['linkedinUrl:urlHost']);
  });

  it('checks phone and year', () => {
    expect(messages({ phone: 'call me' })).toEqual(['phone:phoneInvalid']);
    expect(messages({ year: '7' })).toEqual(['year:yearRequired']);
    expect(messages({ faculty: '  ' })).toEqual(['faculty:facultyRequired']);
  });
});
