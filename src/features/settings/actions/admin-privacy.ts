'use server';

import { updateTag } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';

import { settingsTags } from '../cache-tags';
import { settingsRepository } from '../data';
import { privacyInputSchema } from '../schemas/privacy.schema';
import type { PrivacyRecord } from '../types';

// Admin › Pages › Contact › Privacy policy. Permission: the Pages area (super admins and editors, D18).

/** "Save changes": checks, cleans the HTML, stores it and refreshes /privacy. Field errors are `admin.privacy.errors` keys. */
export async function savePrivacy(input: unknown): Promise<ActionResult<PrivacyRecord>> {
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = privacyInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const { title, body, isPlaceholder } = parsed.data;
  const saved = await (
    await settingsRepository()
  ).savePrivacy({
    title,
    isPlaceholder,
    // Only what the editor can produce is kept; the public page cleans it once more.
    body: {
      mk: sanitizeRichText(body.mk),
      ...(body.en !== undefined ? { en: sanitizeRichText(body.en) } : {}),
    },
  });
  await recordActivity(session, {
    action: 'updated',
    area: 'pages',
    target: 'Privacy policy',
    href: '/admin/pages/contact?tab=privacy',
  });
  updateTag(settingsTags.all);
  return ok(saved);
}
