'use server';

import { refresh, updateTag } from 'next/cache';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { contactTags } from '../cache-tags';
import { contactRepository } from '../data';
import { contactPageSchema } from '../schemas/contact-page.schema';
import type { ContactPageRecord } from '../types';

// Admin › Pages › Contact. Permission: the Pages area (super admins and editors, D18).

/** "Save changes": validates everything, stores it, refreshes the public page. Field errors are `admin.contact.errors` keys. */
export async function saveContactPage(input: unknown): Promise<ActionResult<ContactPageRecord>> {
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = contactPageSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const saved = await (await contactRepository('session')).save(parsed.data);
  await recordActivity(session, {
    action: 'updated',
    area: 'pages',
    target: 'Contact page',
    href: '/admin/pages/contact',
  });
  updateTag(contactTags.all);
  refresh();
  return ok(saved);
}
