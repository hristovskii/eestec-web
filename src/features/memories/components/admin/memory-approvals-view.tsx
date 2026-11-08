'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { type ApprovalRow, ApprovalSplitView } from '@/shared/admin-ui/approval-split-view';

import { decideMemories } from '../../actions/admin-memories';

/** The Memories queue: it hands "Approve selected" to the Server Action and says what happened. */
export function MemoryApprovalsView({
  rows,
  openId,
  detail,
  empty,
  waitingLabel,
  canDecide,
}: {
  rows: ApprovalRow[];
  openId: string | null;
  detail: React.ReactNode;
  empty: React.ReactNode;
  waitingLabel: string;
  canDecide: boolean;
}) {
  const t = useTranslations('admin.approvals.memories.toasts');
  return (
    <ApprovalSplitView
      rows={rows}
      openId={openId}
      detail={detail}
      empty={empty}
      waitingLabel={waitingLabel}
      onApproveSelected={
        canDecide
          ? async (ids) => {
              const result = await decideMemories({ ids, decision: 'approve' }).catch(() => null);
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
