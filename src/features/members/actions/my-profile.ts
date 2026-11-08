'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import {
  currentMember,
  deleteMemberPhoto,
  isUsernameTaken,
  storeMemberPhoto,
  updateAccountDetails,
  updateMemberIdentity,
} from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { membersRepository } from '../data';
import { isJpeg, PHOTO } from '../domain/profile-self';
import { profileSelfSchema } from '../schemas/profile-self.schema';
import { PROFILE_VISIBILITIES } from '../types';
import { getMineContext } from '../my-profile';

// /profile: a member edits their own profile. Who they are comes from the session, never from the
// request. Member data is not cached, so `refresh()` is enough.

/** The Profile card's Save: name, address, bio, links, faculty (members) and phone, year (auth). */
export async function saveMyProfile(input: unknown): Promise<ActionResult<{ username: string }>> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = profileSelfSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { phone, year, ...edit } = parsed.data;

  // Both places that know addresses are asked before anything is written.
  const repo = await membersRepository('session');
  if (
    (await isUsernameTaken(session.userId, edit.username)) ||
    !(await repo.usernameAvailable(session.userId, edit.username))
  )
    return { ok: false, error: 'validation', fieldErrors: { username: ['usernameTaken'] } };

  const context = await getMineContext(session);
  const result = await repo.updateMine(context, edit);
  if (result.status === 'username_taken')
    return { ok: false, error: 'validation', fieldErrors: { username: ['usernameTaken'] } };
  if (result.status === 'username_reserved')
    return { ok: false, error: 'validation', fieldErrors: { username: ['usernameReserved'] } };

  await updateMemberIdentity(session.userId, { name: edit.name, username: edit.username });
  await updateAccountDetails(session.userId, { phone, year });
  refresh();
  return ok({ username: edit.username });
}

/** "Who can see my profile": saved as soon as a card is picked. */
export async function setMyVisibility(input: unknown): Promise<ActionResult> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = z.enum(PROFILE_VISIBILITIES).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  await (await membersRepository('session')).setVisibility(await getMineContext(session), parsed.data);
  refresh();
  return ok(undefined);
}

/** The cropped photo the browser sends (see `PHOTO`). */
export async function saveMyPhoto(formData: FormData): Promise<ActionResult<{ src: string }>> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const file = formData.get('photo');
  if (!(file instanceof File)) return { ok: false, error: 'unexpected' };
  if (file.type !== PHOTO.sendType || file.size === 0 || file.size > PHOTO.sendMaxBytes)
    return { ok: false, error: 'validation', fieldErrors: { photo: ['photoSize'] } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) return { ok: false, error: 'validation', fieldErrors: { photo: ['photoType'] } };

  const stored = storeMemberPhoto({ mimeType: PHOTO.sendType, bytes });
  const old = await (await membersRepository('session')).setPhoto(await getMineContext(session), stored.url);
  deleteMemberPhoto(old);
  refresh();
  return ok({ src: stored.url });
}

export async function removeMyPhoto(): Promise<ActionResult> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const old = await (await membersRepository('session')).setPhoto(await getMineContext(session), null);
  deleteMemberPhoto(old);
  refresh();
  return ok(undefined);
}
