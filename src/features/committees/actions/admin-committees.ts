'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { committeeTags } from '../cache-tags';
import { committeesRepository } from '../data';
import { COMMITTEE_LIMITS, committeeSchema } from '../schemas/committee.schema';
import type { Committee } from '../types';

// Admin › Pages › Map / Committees. Permission: the Pages area (super admins and editors, D18).

const id = z.string().regex(/^[\w-]{1,64}$/);
const HREF = '/admin/pages/map';

const changed = () => {
  updateTag(committeeTags.all);
  refresh();
};

/** Creates (no id) or updates a committee. Field errors are `admin.committees.errors` keys. */
export async function saveCommittee(input: unknown): Promise<ActionResult<Committee>> {
  const request = z.object({ id: id.optional(), committee: z.unknown() }).safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = committeeSchema.safeParse(request.data.committee);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const repo = await committeesRepository('session');
  const result = await repo.save(parsed.data, request.data.id);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'duplicate')
    return { ok: false, error: 'validation', fieldErrors: { name: ['duplicate'] } };
  await recordActivity(session, {
    action: request.data.id ? 'updated' : 'created',
    area: 'pages',
    target: `committee ${result.committee.name}`,
    href: HREF,
  });
  changed();
  return ok(result.committee);
}

export type DeleteResult = { deleted: number; keptHome: boolean };

export async function deleteCommittees(input: unknown): Promise<ActionResult<DeleteResult>> {
  const parsed = z.array(id).min(1).max(200).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const repo = await committeesRepository('session');
  const names = new Map(
    (await Promise.all(parsed.data.map((committeeId) => repo.get(committeeId)))).flatMap((item) =>
      item ? [[item.id, item.name] as const] : [],
    ),
  );
  const { removed, keptHome } = await repo.remove(parsed.data);
  if (removed.length > 0) {
    await recordActivity(session, {
      action: 'deleted',
      area: 'pages',
      target:
        removed.length === 1
          ? `committee ${names.get(removed[0]!) ?? ''}`.trim()
          : `${removed.length} committees`,
      href: HREF,
    });
    changed();
  }
  return ok({ deleted: removed.length, keptHome });
}

/** The rows of a checked CSV (the dialog validates first; this checks again). */
export async function importCommittees(
  input: unknown,
): Promise<ActionResult<{ created: number; updated: number }>> {
  const parsed = z.array(committeeSchema).min(1).max(COMMITTEE_LIMITS.importRows).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const session = await authorize('edit', 'pages');
  if (!session) return { ok: false, error: 'forbidden' };
  const repo = await committeesRepository('session');
  const result = await repo.importMany(parsed.data.map((row) => ({ ...row, isHome: false })));
  await recordActivity(session, {
    action: 'created',
    area: 'pages',
    target: `${result.created + result.updated} committees (CSV import)`,
    href: HREF,
  });
  changed();
  return ok(result);
}
