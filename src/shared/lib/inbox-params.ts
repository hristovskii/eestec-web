import { z } from 'zod';

// /admin/inbox?tab=contact|partners|membership&status=&subject=&q=&page=&size=&open=<id>
// Invalid values fall back to the defaults. Each list checks `status` against its own statuses.

export const INBOX_TABS = ['contact', 'partners', 'membership'] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

/** Rows per page in the Inbox lists (the first is the default). */
export const INBOX_PAGE_SIZES = [25, 50, 100] as const;

const first = (value: unknown) => (Array.isArray(value) ? (value[0] as unknown) : value);
const id = z.string().regex(/^[\w-]{1,64}$/);

export const inboxParamsSchema = z.object({
  tab: z.preprocess(first, z.enum(INBOX_TABS).catch('contact')),
  status: z.preprocess(first, z.string().max(20).optional().catch(undefined)),
  subject: z.preprocess(first, id.optional().catch(undefined)),
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  page: z.preprocess(first, z.coerce.number().int().min(1).catch(1)),
  size: z.preprocess(
    first,
    z.coerce
      .number()
      .refine((n) => (INBOX_PAGE_SIZES as readonly number[]).includes(n))
      .catch(INBOX_PAGE_SIZES[0]),
  ),
  open: z.preprocess(first, id.optional().catch(undefined)),
});

export type InboxParams = z.infer<typeof inboxParamsSchema>;
