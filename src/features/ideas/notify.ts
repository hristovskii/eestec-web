import 'server-only';

import { sendMockMail } from '@/features/auth/server';
import { getSettingsForEdit } from '@/features/settings/server';

/**
 * Tells the board about a new idea or feedback: one mock e-mail per recipient of Settings ›
 * E-mail notifications › "Ideas & feedback", when that is on. The e-mail names the title (an
 * idea) or the event (feedback) and never who sent it. Nothing is sent on mocks (M22).
 */
export async function notifyBoardOfSubmission(input: { kind: 'idea' | 'feedback'; what: string; now: Date }) {
  const { notifications } = await getSettingsForEdit();
  const setting = notifications.ideasAndFeedback;
  if (!setting.enabled) return;
  for (const to of setting.recipients)
    sendMockMail({
      to,
      kind: input.kind === 'idea' ? 'board_idea' : 'board_feedback',
      subject: input.kind === 'idea' ? `A new idea: ${input.what}` : `New feedback on ${input.what}`,
      link: `/admin/ideas?tab=${input.kind === 'idea' ? 'ideas' : 'feedback'}`,
      reason: null,
      sentAt: input.now.toISOString(),
    });
}
