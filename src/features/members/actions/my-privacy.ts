'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { currentMember } from '@/features/auth/server';
import { withdrawMyApplication } from '@/features/applications/server';
import { type ActionResult, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';

import { membersRepository } from '../data';
import { cleanFileName, CV, cvPickProblem, isPdf } from '../domain/cv';
import type { CvInfo, MemberConsents } from '../types';

// /profile: Privacy & consent, the CV and My applications. Who the member is comes from the
// session. Everything here is saved at once ("Changes apply immediately").

const choiceSchema = z
  .object({
    newsletter: z.boolean().optional(),
    galleryName: z.boolean().optional(),
    cvOptIn: z.boolean().optional(),
  })
  .strict();

/** A switch: e-mails, gallery names, CV sharing. Turning CV sharing off deletes the file. */
export async function setMyChoice(input: unknown): Promise<ActionResult<MemberConsents>> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = choiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const consents = await (await membersRepository('session')).setConsents(session.userId, parsed.data, now());
  refresh();
  return ok(consents);
}

/** The CV (a PDF up to 5 MB), only while CV sharing is on. */
export async function uploadMyCv(formData: FormData): Promise<ActionResult<CvInfo>> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const file = formData.get('cv');
  if (!(file instanceof File)) return { ok: false, error: 'unexpected' };
  const problem = cvPickProblem(file);
  if (problem) return { ok: false, error: 'validation', fieldErrors: { cv: [problem] } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > CV.maxBytes)
    return { ok: false, error: 'validation', fieldErrors: { cv: ['cvSize'] } };
  if (!isPdf(bytes)) return { ok: false, error: 'validation', fieldErrors: { cv: ['cvType'] } };

  const result = await (
    await membersRepository('session')
  ).storeCv(session.userId, { fileName: cleanFileName(file.name), bytes }, now());
  if (result.status === 'not_opted_in') return { ok: false, error: 'conflict' };
  refresh();
  return ok(result.cv);
}

/** Deletes the CV file; sharing stays on (the upload box comes back). */
export async function removeMyCv(): Promise<ActionResult> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  await (await membersRepository('session')).removeCv(session.userId);
  refresh();
  return ok(undefined);
}

/** "Withdraw" and "Leave waitlist": the application is deleted and the waitlist closes the gap. */
export async function withdrawApplication(id: unknown): Promise<ActionResult> {
  const session = await currentMember();
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = z
    .string()
    .regex(/^[\w-]{1,64}$/)
    .safeParse(id);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  if (!(await withdrawMyApplication(parsed.data, session.email))) return { ok: false, error: 'not_found' };
  refresh();
  return ok(undefined);
}
