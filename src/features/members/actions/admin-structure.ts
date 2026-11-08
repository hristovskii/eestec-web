'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { resolveLocalized } from '@/shared/i18n/localized';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';

import { membersRepository } from '../data';
import {
  badgeSchema,
  idSchema,
  idsSchema,
  mandateSchema,
  seatSchema,
  teamSchema,
} from '../schemas/structure.schema';
import type { RemoveBadgeResult, RemoveMandateResult, RemoveTeamResult } from '../types';

// Admin › Members › Teams, Badges, Board. Permission: the Members area (super admins and editors, D18).

const href = (tab: 'teams' | 'badges' | 'board') => `/admin/members?tab=${tab}`;

type Guard = { session: NonNullable<Awaited<ReturnType<typeof authorize>>> };
async function guard(): Promise<Guard | null> {
  const session = await authorize('edit', 'members');
  return session ? { session } : null;
}
const invalid = (issues: Parameters<typeof fieldErrorsFrom>[0]): ActionResult<never> => ({
  ok: false,
  error: 'validation',
  fieldErrors: fieldErrorsFrom(issues),
});

// ─── Teams ───

export async function saveTeam(input: unknown) {
  const request = z.object({ id: idSchema.optional(), team: z.unknown() }).safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' } as const;
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' } as const;
  const parsed = teamSchema.safeParse(request.data.team);
  if (!parsed.success) return invalid(parsed.error.issues);
  const result = await (await membersRepository('session')).saveTeam(parsed.data, request.data.id);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' } as const;
  if (result.status === 'duplicate') return invalid([{ path: ['name'], message: 'duplicate' }]);
  await recordActivity(allowed.session, {
    action: request.data.id ? 'updated' : 'created',
    area: 'members',
    target: `team ${resolveLocalized(result.team.name, 'en')}`,
    href: href('teams'),
  });
  refresh();
  return ok(result.team);
}

export async function deleteTeam(input: unknown): Promise<ActionResult<RemoveTeamResult>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' };
  const repo = await membersRepository('session');
  const name = (await repo.adminTeams()).find((team) => team.id === parsed.data)?.name;
  const result = await repo.removeTeam(parsed.data);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'removed') {
    await recordActivity(allowed.session, {
      action: 'deleted',
      area: 'members',
      target: `team ${name ? resolveLocalized(name, 'en') : ''}`.trim(),
      href: href('teams'),
    });
    refresh();
  }
  return ok(result);
}

export async function reorderTeams(input: unknown): Promise<ActionResult> {
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  if (!(await guard())) return { ok: false, error: 'forbidden' };
  await (await membersRepository('session')).reorderTeams(parsed.data);
  refresh();
  return ok(undefined);
}

// ─── Badges ───

export async function saveBadge(input: unknown) {
  const request = z.object({ id: idSchema.optional(), badge: z.unknown() }).safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' } as const;
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' } as const;
  const parsed = badgeSchema.safeParse(request.data.badge);
  if (!parsed.success) return invalid(parsed.error.issues);
  const result = await (await membersRepository('session')).saveBadge(parsed.data, request.data.id);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' } as const;
  if (result.status === 'duplicate') return invalid([{ path: ['name'], message: 'duplicate' }]);
  await recordActivity(allowed.session, {
    action: request.data.id ? 'updated' : 'created',
    area: 'members',
    target: `badge ${resolveLocalized(result.badge.name, 'en')}`,
    href: href('badges'),
  });
  refresh();
  return ok(result.badge);
}

export async function deleteBadge(input: unknown): Promise<ActionResult<RemoveBadgeResult>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' };
  const repo = await membersRepository('session');
  const name = (await repo.adminBadges()).find((badge) => badge.id === parsed.data)?.name;
  const result = await repo.removeBadge(parsed.data);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  await recordActivity(allowed.session, {
    action: 'deleted',
    area: 'members',
    target: `badge ${name ? resolveLocalized(name, 'en') : ''}`.trim(),
    href: href('badges'),
  });
  refresh();
  return ok(result);
}

// ─── Board ───

export async function saveMandate(input: unknown) {
  const request = z.object({ id: idSchema.optional(), mandate: z.unknown() }).safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' } as const;
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' } as const;
  const parsed = mandateSchema.safeParse(request.data.mandate);
  if (!parsed.success) return invalid(parsed.error.issues);
  const result = await (await membersRepository('session')).saveMandate(parsed.data, request.data.id);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' } as const;
  if (result.status === 'duplicate') return invalid([{ path: ['label'], message: 'duplicate' }]);
  await recordActivity(allowed.session, {
    action: request.data.id ? 'updated' : 'created',
    area: 'members',
    target: `board ${result.mandate.label}`,
    href: href('board'),
  });
  refresh();
  return ok(result.mandate);
}

export async function deleteMandate(input: unknown): Promise<ActionResult<RemoveMandateResult>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' };
  const repo = await membersRepository('session');
  const label = (await repo.adminBoards()).mandates.find((mandate) => mandate.id === parsed.data)?.label;
  const result = await repo.removeMandate(parsed.data);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' };
  if (result.status === 'removed') {
    await recordActivity(allowed.session, {
      action: 'deleted',
      area: 'members',
      target: `board ${label ?? ''}`.trim(),
      href: href('board'),
    });
    refresh();
  }
  return ok(result);
}

export async function saveSeat(input: unknown) {
  const request = z
    .object({ mandateId: idSchema, seatId: idSchema.optional(), seat: z.unknown() })
    .safeParse(input);
  if (!request.success) return { ok: false, error: 'unexpected' } as const;
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' } as const;
  const parsed = seatSchema.safeParse(request.data.seat);
  if (!parsed.success) return invalid(parsed.error.issues);
  const result = await (
    await membersRepository('session')
  ).saveSeat(request.data.mandateId, parsed.data, request.data.seatId);
  if (result.status === 'not_found') return { ok: false, error: 'not_found' } as const;
  if (result.status === 'person_not_found') return invalid([{ path: ['userId'], message: 'person' }]);
  await recordActivity(allowed.session, {
    action: request.data.seatId ? 'updated' : 'created',
    area: 'members',
    target: `board ${result.mandate.label}: ${parsed.data.title}`,
    href: href('board'),
  });
  refresh();
  return ok(result.mandate);
}

export async function deleteSeat(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ mandateId: idSchema, seatId: idSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const allowed = await guard();
  if (!allowed) return { ok: false, error: 'forbidden' };
  const removed = await (
    await membersRepository('session')
  ).removeSeat(parsed.data.mandateId, parsed.data.seatId);
  if (!removed) return { ok: false, error: 'not_found' };
  await recordActivity(allowed.session, {
    action: 'deleted',
    area: 'members',
    target: 'a board seat',
    href: href('board'),
  });
  refresh();
  return ok(undefined);
}

export async function reorderSeats(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ mandateId: idSchema, seatIds: idsSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  if (!(await guard())) return { ok: false, error: 'forbidden' };
  await (await membersRepository('session')).reorderSeats(parsed.data.mandateId, parsed.data.seatIds);
  refresh();
  return ok(undefined);
}
