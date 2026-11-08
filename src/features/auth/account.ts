import 'server-only';

import { now } from '@/shared/lib/now';

import { authRepository } from './data';
import {
  deleteMockMemberPhoto,
  photoIdFromUrl,
  readMockMemberPhoto,
  photoUrl,
  saveMockMemberPhoto,
  type MemberPhoto,
} from './data/member-photos';
import type { AccountDetailsPatch } from './types';

// The member's own account, for the Members feature's "My profile" (callers have checked who is
// signed in, and that it is that person). Dynamic code: it asks for the time.

export async function getAccountDetails(userId: string) {
  return (await authRepository()).getAccountDetails(userId);
}

export async function updateAccountDetails(userId: string, patch: AccountDetailsPatch) {
  return (await authRepository()).updateAccountDetails(userId, patch);
}

export async function isUsernameTaken(userId: string, username: string) {
  return (await authRepository()).usernameTaken(userId, username);
}

/** The name and profile address from /profile; also what the header shows. */
export async function updateMemberIdentity(userId: string, patch: { name?: string; username?: string }) {
  return (await authRepository()).updateIdentity(userId, patch);
}

export async function verifyMemberPassword(userId: string, password: string) {
  return (await authRepository()).verifyPassword({ userId, password, now: now() });
}

export async function changeMemberPassword(userId: string, current: string, next: string) {
  return (await authRepository()).changePassword({ userId, current, next, now: now() });
}

export async function requestEmailChange(
  userId: string,
  newEmail: string,
  password: string,
  locale: 'mk' | 'en',
) {
  return (await authRepository()).requestEmailChange({ userId, newEmail, password, locale, now: now() });
}

export async function confirmEmailChange(token: string) {
  return (await authRepository()).confirmEmailChange({ token, now: now() });
}

export async function deleteMemberAccount(userId: string) {
  return (await authRepository()).deleteAccount({ userId, now: now() });
}

export async function exportMemberAccount(userId: string) {
  return (await authRepository()).exportAccount(userId);
}

// Member photos (a stand-in for Supabase Storage): the file and the address it is served from.

export function storeMemberPhoto(photo: MemberPhoto): { id: string; url: string } {
  const id = saveMockMemberPhoto(photo);
  return { id, url: photoUrl(id) };
}

/** Deletes the file behind a photo address (any other address is ignored). */
export function deleteMemberPhoto(url: string | null): void {
  const id = photoIdFromUrl(url);
  if (id) deleteMockMemberPhoto(id);
}

/** The file behind a photo address, for "Download my data". */
export function readMemberPhoto(url: string | null): MemberPhoto | null {
  const id = photoIdFromUrl(url);
  return id ? readMockMemberPhoto(id) : null;
}
