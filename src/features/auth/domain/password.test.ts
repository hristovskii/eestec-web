import { describe, expect, it } from 'vitest';

import { checkPassword, passwordAccepted, passwordStrength } from './password';

const person = { email: 'elena.p@students.finki.ukim.mk', name: 'Elena Petrovska' };

describe('checkPassword', () => {
  it('wants at least 10 characters', () => {
    expect(checkPassword('lake-ohrid', person).length).toBe(true);
    expect(checkPassword('lake-ohri', person).length).toBe(false);
  });

  it('refuses the e-mail or the name, with a digit or two added', () => {
    expect(checkPassword('elena.p@students.finki.ukim.mk', person).personal).toBe(false);
    expect(checkPassword('elenapetrovska', person).personal).toBe(false);
    expect(checkPassword('Petrovska12', person).personal).toBe(false);
    expect(checkPassword('lake-ohrid-2026', person).personal).toBe(true);
  });

  it('refuses common passwords, whatever the capitals', () => {
    expect(checkPassword('Password123', person).common).toBe(false);
    expect(checkPassword('1234567890', person).common).toBe(false);
    expect(checkPassword('lake-ohrid-2026', person).common).toBe(true);
  });

  it('accepts a password that passes all three', () => {
    expect(passwordAccepted(checkPassword('lake-ohrid-2026', person))).toBe(true);
    expect(passwordAccepted(checkPassword('elena123', person))).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('goes from nothing to strong', () => {
    expect(passwordStrength('', person)).toBe(0);
    expect(passwordStrength('elena123', person)).toBe(1);
    expect(passwordStrength('blue-river', person)).toBe(2);
    expect(passwordStrength('lake-ohrid-26', person)).toBe(3);
    expect(passwordStrength('Lake-Ohrid-2026-Sunrise', person)).toBe(4);
  });

  it('is "good" (3 bars) for the sample password of the design', () => {
    expect(passwordStrength('lake-ohrid-2026', person)).toBe(3);
  });
});
