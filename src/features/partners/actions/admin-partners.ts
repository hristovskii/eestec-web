'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { partnersTags } from '../cache-tags';
import { partnersRepository } from '../data';
import { partnersPageSchema, sponsorSchema, tiersSchema } from '../schemas/partners.schema';
import type { PartnersPageRecord, Sponsor, SponsorTier } from '../types';

// Admin › Pages › Sponsors. Permission: the Pages area (super admins and editors, D18).

const id = z.string().regex(/^[\w-]{1,64}$/);
const HREF = '/admin/pages/sponsors';

const changed = () => {
  updateTag(partnersTags.all);
  refresh();
};

/** "Save changes" on the Page tab. Field errors are `admin.partners.errors` keys. */
export async function savePartnersPage(input: unknown): Promise<ActionResult<PartnersPageRecord>> {
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = partnersPageSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const saved = await (await partnersRepository('session')).savePage(parsed.data);
  await recordActivity(session, {
    action: 'updated',
    area: 'pages',
    target: 'For Companies page',
    href: HREF,
  });
  changed();
  return ok(saved);
}

/** Creates (no id) or updates a sponsor. */
export async function saveSponsor(input: unknown): Promise<ActionResult<Sponsor>> {
  const request = z.object({ id: id.optional(), sponsor: z.unknown() }).safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = sponsorSchema.safeParse(request.data.sponsor);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const result = await (await partnersRepository('session')).saveSponsor(parsed.data, request.data.id);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'no_tier')
    return { ok: false, error: 'validation', fieldErrors: { tierId: ['required'] } };
  await recordActivity(session, {
    action: request.data.id ? 'updated' : 'created',
    area: 'pages',
    target: `sponsor ${result.sponsor.name}`,
    href: HREF,
  });
  changed();
  return ok(result.sponsor);
}

export async function deleteSponsor(input: unknown): Promise<ActionResult<{ deleted: boolean }>> {
  const parsed = id.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const repo = await partnersRepository('session');
  const sponsor = await repo.getSponsor(parsed.data);
  const deleted = await repo.removeSponsor(parsed.data);
  if (deleted) {
    await recordActivity(session, {
      action: 'deleted',
      area: 'pages',
      target: `sponsor ${sponsor?.name ?? ''}`.trim(),
      href: HREF,
    });
    changed();
  }
  return ok({ deleted });
}

/** The new order of the sponsors of one tier (drag and drop or keyboard). */
export async function reorderSponsors(input: unknown): Promise<ActionResult<{ ids: string[] }>> {
  const parsed = z.object({ tierId: id, ids: z.array(id).max(200) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const moved = await (
    await partnersRepository('session')
  ).reorderSponsors(parsed.data.tierId, parsed.data.ids);
  if (!moved) return { ok: false, error: 'unexpected' };
  changed();
  return ok({ ids: parsed.data.ids });
}

/** Names, sizes and order of the tiers. A tier that still has sponsors cannot be removed. */
export async function saveTiers(input: unknown): Promise<ActionResult<SponsorTier[]>> {
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = tiersSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const result = await (await partnersRepository('session')).saveTiers(parsed.data);
  if (result.status === 'in_use')
    return { ok: false, error: 'validation', fieldErrors: { _form: ['inUse'] } };
  await recordActivity(session, { action: 'updated', area: 'pages', target: 'sponsor tiers', href: HREF });
  changed();
  return ok(result.tiers);
}
