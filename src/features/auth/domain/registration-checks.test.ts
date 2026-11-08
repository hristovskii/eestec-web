import { describe, expect, it } from 'vitest';

import { isFacultyEmail } from './registration-checks';

describe('isFacultyEmail', () => {
  it('knows the student addresses of UKIM faculties', () => {
    expect(isFacultyEmail('marija.s@students.feit.ukim.edu.mk')).toBe(true);
    expect(isFacultyEmail('elena.p@students.finki.ukim.mk')).toBe(true);
    expect(isFacultyEmail('ELENA@Students.FINKI.UKIM.MK')).toBe(true);
  });

  it('does not take other addresses for one', () => {
    for (const email of ['ivo@gmail.com', 'ivo@ukim.example.com', 'ivo@notukim.mk', 'no-at-sign', ''])
      expect(isFacultyEmail(email)).toBe(false);
  });
});
