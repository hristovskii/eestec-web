import { type MemberVisibility, type MemberYear } from '../types';

// The sign-up form (AuthForm › Create your member account): what is asked and how it is read from
// the browser's FormData. The rules (zod) are in `schemas/register.schema.ts`, which the browser loads
// only when the form is first used. Messages are keys of `auth.errors`.

export const REGISTER_LIMITS = { name: 100, email: 254, phone: 30, faculty: 100 } as const;

/** JPG or PNG, at most 5 MB (the same limit as the Media library for images). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;
export const PHOTO_MAX_BYTES = 5_000_000;

/** Names of the form's fields (ids in the page are prefixed with `reg-`). */
export const REGISTER_FIELDS = {
  name: 'name',
  email: 'email',
  password: 'password',
  faculty: 'faculty',
  phone: 'phone',
  year: 'year',
  visibility: 'visibility',
  photo: 'photo',
  consent: 'consent',
} as const;

export type RegisterValues = {
  name: string;
  email: string;
  password: string;
  faculty: string;
  phone: string;
  year: string;
  visibility: string;
  consent: boolean;
};

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

export function readRegisterForm(data: FormData): RegisterValues {
  return {
    name: text(data, REGISTER_FIELDS.name),
    email: text(data, REGISTER_FIELDS.email),
    password: text(data, REGISTER_FIELDS.password),
    faculty: text(data, REGISTER_FIELDS.faculty),
    phone: text(data, REGISTER_FIELDS.phone),
    year: text(data, REGISTER_FIELDS.year),
    visibility: text(data, REGISTER_FIELDS.visibility) || 'members',
    consent: data.get(REGISTER_FIELDS.consent) !== null,
  };
}

/** The photo field of the form, or null when nothing was chosen. */
export function readPhoto(data: FormData): File | null {
  const file = data.get(REGISTER_FIELDS.photo);
  return file instanceof File && file.size > 0 ? file : null;
}

/** What is wrong with a chosen photo (a key of `auth.errors`), if anything. */
export function photoProblem(file: { size: number; type: string } | null): 'photoType' | 'photoSize' | null {
  if (!file) return null;
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return 'photoType';
  return file.size > PHOTO_MAX_BYTES ? 'photoSize' : null;
}

export type RegisterFailure = 'spam' | 'tooFast' | 'unavailable' | 'unexpected';
export type ParsedRegistration = Omit<RegisterValues, 'year' | 'visibility'> & {
  year: MemberYear;
  visibility: MemberVisibility;
};
