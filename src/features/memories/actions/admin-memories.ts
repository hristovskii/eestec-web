'use server';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { recordActivity } from '@/features/activity/server';
import {
  authorize,
  getAccountDetails,
  getMemberRegistration,
  type MockMailKind,
  sendMockMail,
} from '@/features/auth/server';
import { type ActionResult, fieldErrorsFrom, ok } from '@/shared/forms/action-result';
import { now } from '@/shared/lib/now';
import { sanitizeRichText } from '@/shared/lib/sanitize-html';

import { memoryTags } from '../cache-tags';
import { memoriesRepository } from '../data';
import { memoryContentSchema } from '../schemas/memory-content.schema';
import type { MemoryRecord } from '../types';

// Admin › Approvals › Memories and Admin › Memories. Deciding is the Approvals area; editing,
// unpublishing, deleting and featuring are the Memories area (super admins and editors, D18).

const id = z.string().regex(/^[\w-]{1,64}$/);
const APPROVALS_HREF = '/admin/approvals?type=memories';

/** What the public site shows changes with every decision: the list, the post and the author's pages. */
function refreshPublic(record: Pick<MemoryRecord, 'slug'>) {
  updateTag(memoryTags.list);
  if (record.slug) updateTag(memoryTags.post(record.slug));
}

/** E-mails the author through the mock mailbox: where they can read it, or what to fix. */
async function mailAuthor(
  record: MemoryRecord,
  kind: Extract<MockMailKind, `memory_${string}`>,
  reason: string | null,
) {
  if (!record.authorId) return;
  const [account, registration] = await Promise.all([
    getAccountDetails(record.authorId),
    getMemberRegistration(record.authorId),
  ]);
  if (!account) return;
  const prefix = registration?.locale === 'mk' ? '' : '/en';
  const title = record.content.title;
  const subjects = {
    memory_published: `Your Memory is live: “${title}”`,
    memory_rejected: `A few changes before we publish “${title}”`,
    memory_changes_approved: `Your changes to “${title}” are live`,
    memory_changes_rejected: `A few changes before we publish your edits to “${title}”`,
  } as const;
  sendMockMail({
    to: account.email,
    kind,
    subject: subjects[kind],
    link:
      kind === 'memory_published' || kind === 'memory_changes_approved'
        ? `${prefix}/memories/${record.slug ?? ''}`
        : `${prefix}/memories/${record.slug ?? ''}/edit`,
    reason,
    sentAt: now().toISOString(),
  });
}

const decisionSchema = z.object({
  ids: z.array(id).min(1).max(50),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(1000).optional(),
  /** "E-mail the reason to the author" (on by default). */
  notify: z.boolean().optional(),
  /** "Feature on the Home page" ticked in the preview. */
  featuredOnHome: z.boolean().optional(),
});

/** Approve & publish / Reject for one or several waiting Memories (or waiting changes to published ones). */
export async function decideMemories(input: unknown): Promise<ActionResult<{ decided: number }>> {
  const session = await authorize('edit', 'approvals');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const { ids, decision, reason = '', notify = true, featuredOnHome } = parsed.data;
  const repo = await memoriesRepository('session');
  let decided = 0;
  for (const memoryId of ids) {
    const result =
      decision === 'approve'
        ? await repo.approve(memoryId, {
            reviewerName: session.name,
            ...(featuredOnHome === undefined ? {} : { featuredOnHome }),
            now: now(),
          })
        : await repo.reject(memoryId, { reviewerName: session.name, reason, now: now() });
    if (result.status !== 'approved' && result.status !== 'rejected') continue;
    decided += 1;
    const { record, kind } = result;
    refreshPublic(record);
    if (result.status === 'approved')
      await mailAuthor(record, kind === 'memory' ? 'memory_published' : 'memory_changes_approved', null);
    else if (notify)
      await mailAuthor(
        record,
        kind === 'memory' ? 'memory_rejected' : 'memory_changes_rejected',
        reason || null,
      );
    await recordActivity(session, {
      action: result.status === 'approved' ? 'approved' : 'rejected',
      area: 'approvals',
      target: `${kind === 'revision' ? 'changes to ' : ''}Memory “${record.content.title}”`,
      href: APPROVALS_HREF,
    });
  }
  if (decided === 0) return { ok: false, error: 'not_found' };
  refresh();
  return ok({ decided });
}

const saveSchema = z.object({
  id,
  content: memoryContentSchema,
  featuredOnHome: z.boolean(),
  /** Edit the waiting revision instead of the live content. */
  revision: z.boolean(),
});

/** The board's own edit of a Memory ("Edit before publishing", and Admin › Memories): never changes its status. */
export async function saveMemoryAsAdmin(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await authorize('edit', 'memories');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { content, featuredOnHome, revision } = parsed.data;
  const record = await (
    await memoriesRepository('session')
  ).adminSave(
    parsed.data.id,
    { ...content, body: sanitizeRichText(content.body), eventId: content.eventId || null },
    { featuredOnHome, revision },
    now(),
  );
  if (!record) return { ok: false, error: 'not_found' };
  refreshPublic(record);
  await recordActivity(session, {
    action: 'updated',
    area: 'memories',
    target: `Memory “${record.content.title}”`,
    href: `/admin/memories/${record.id}`,
  });
  refresh();
  return ok({ id: record.id });
}

/** Back to a draft: gone from the public site, the author can edit and send it again. */
export async function unpublishMemory(memoryId: unknown): Promise<ActionResult> {
  const session = await authorize('edit', 'memories');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = id.safeParse(memoryId);
  if (!parsed.success) return { ok: false, error: 'not_found' };
  const record = await (await memoriesRepository('session')).unpublish(parsed.data);
  if (!record) return { ok: false, error: 'not_found' };
  refreshPublic(record);
  await recordActivity(session, {
    action: 'updated',
    area: 'memories',
    target: `Memory “${record.content.title}” (unpublished)`,
    href: `/admin/memories/${record.id}`,
  });
  refresh();
  return ok(undefined);
}

export async function deleteMemory(memoryId: unknown): Promise<ActionResult> {
  const session = await authorize('delete', 'memories');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = id.safeParse(memoryId);
  if (!parsed.success) return { ok: false, error: 'not_found' };
  const repo = await memoriesRepository('session');
  const record = await repo.adminGet(parsed.data);
  if (!record || !(await repo.remove(parsed.data))) return { ok: false, error: 'not_found' };
  refreshPublic(record);
  await recordActivity(session, {
    action: 'deleted',
    area: 'memories',
    target: `Memory “${record.content.title}”`,
    href: '/admin/memories',
  });
  refresh();
  return ok(undefined);
}

export async function setMemoryFeatured(input: unknown): Promise<ActionResult> {
  const session = await authorize('edit', 'memories');
  if (!session) return { ok: false, error: 'forbidden' };
  const parsed = z.object({ id, featured: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'unexpected' };
  const record = await (
    await memoriesRepository('session')
  ).setFeatured(parsed.data.id, parsed.data.featured);
  if (!record) return { ok: false, error: 'not_found' };
  refreshPublic(record);
  refresh();
  return ok(undefined);
}
