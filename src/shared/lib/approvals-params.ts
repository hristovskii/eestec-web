import { z } from 'zod';

// /admin/approvals?type=members&open=<id>&sort=oldest|newest
// Invalid values fall back to the defaults. Memories join the types in M17.

export const APPROVAL_TYPES = ['members'] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);
const id = z.string().regex(/^[\w-]{1,80}$/);

export const approvalsParamsSchema = z.object({
  type: z.preprocess(first, z.enum(APPROVAL_TYPES).catch('members')),
  sort: z.preprocess(first, z.enum(['oldest', 'newest']).catch('oldest')),
  open: z.preprocess(first, id.optional().catch(undefined)),
});

export type ApprovalsParams = z.infer<typeof approvalsParamsSchema>;
