import type { DbClient } from './clients';
import { unwrap } from './errors';
import { isUuid } from './ids';

/** The three inboxes share their status, read mark and "mark all as read" commands (set_inbox_status, set_inbox_read, mark_all_inbox_read). */
export type InboxKind = 'contact_message' | 'partner_inquiry' | 'membership_application';

export function inboxCommands(client: DbClient, kind: InboxKind) {
  return {
    /** True when the item exists (its status is now `status`); a made-up id is simply "not there". */
    async setStatus(id: string, status: string): Promise<boolean> {
      if (!isUuid(id)) return false;
      return unwrap(await client.rpc('set_inbox_status', { p_kind: kind, p_id: id, p_status: status }));
    },
    async setRead(id: string, readAt: Date | null): Promise<boolean> {
      if (!isUuid(id)) return false;
      return unwrap(
        await client.rpc('set_inbox_read', {
          p_kind: kind,
          p_id: id,
          p_read_at: (readAt ? readAt.toISOString() : null) as never,
        }),
      );
    },
    /** How many unread items were marked. */
    async markAllRead(now: Date): Promise<number> {
      return unwrap(await client.rpc('mark_all_inbox_read', { p_kind: kind, p_read_at: now.toISOString() }));
    },
  };
}
