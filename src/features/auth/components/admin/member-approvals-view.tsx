'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { type ApprovalRow, ApprovalSplitView } from '@/shared/admin-ui/approval-split-view';
import type { ActionResult } from '@/shared/forms/action-result';

export type DecideAction = (input: {
  userIds: string[];
  decision: 'approve' | 'reject';
  reason?: string;
  notify?: boolean;
}) => Promise<ActionResult<{ decided: number }>>;

/** The queue of member registrations: it hands "Approve selected" to the page's Server Action and says what happened. */
export function MemberApprovalsView({
  rows,
  openId,
  detail,
  empty,
  waitingLabel,
  decide,
}: {
  rows: ApprovalRow[];
  openId: string | null;
  detail: React.ReactNode;
  empty: React.ReactNode;
  waitingLabel: string;
  /** null: the person may look but not decide (event managers have no access at all). */
  decide: DecideAction | null;
}) {
  const t = useTranslations('admin.approvals.toasts');
  return (
    <ApprovalSplitView
      rows={rows}
      openId={openId}
      detail={detail}
      empty={empty}
      waitingLabel={waitingLabel}
      onApproveSelected={
        decide
          ? async (ids) => {
              const result = await decide({ userIds: ids, decision: 'approve' }).catch(() => null);
              if (result?.ok) toast.success(t('approved', { count: result.data.decided }));
              else
                toast.error(
                  result && !result.ok && result.error === 'forbidden' ? t('forbidden') : t('error'),
                );
            }
          : null
      }
    />
  );
}
