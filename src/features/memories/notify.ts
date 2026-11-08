import 'server-only';

import { sendMockMail } from '@/features/auth/server';
import { getSettingsForEdit } from '@/features/settings/server';

/**
 * Tells the board about a Memory (or changes to one) waiting for them: one mock e-mail per recipient
 * of Settings › E-mail notifications › "Memories to approve", when that is on. Nothing is sent on
 * mocks (M22); the mailbox keeps it with the link to the queue.
 */
export async function notifyBoardOfMemory(input: { title: string; revision: boolean; now: Date }) {
  const { notifications } = await getSettingsForEdit();
  const setting = notifications.memoriesToApprove;
  if (!setting.enabled) return;
  for (const to of setting.recipients)
    sendMockMail({
      to,
      kind: 'board_memory',
      subject: input.revision
        ? `Changes to a Memory are waiting: ${input.title}`
        : `A Memory is waiting: ${input.title}`,
      link: '/admin/approvals?type=memories',
      reason: null,
      sentAt: input.now.toISOString(),
    });
}
