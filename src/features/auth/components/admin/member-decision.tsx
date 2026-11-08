'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { RejectDialog } from '@/shared/admin-ui/dialogs';
import { DecisionBar } from '@/shared/admin-ui/decision-bar';
import { Button } from '@/shared/ui/primitives/button';

import type { DecideAction } from './member-approvals-view';

/** Reject… and Approve for the open registration (the bar stays at the bottom on phones). */
export function MemberDecision({
  userId,
  name,
  email,
  decide,
}: {
  userId: string;
  name: string;
  email: string;
  decide: DecideAction | null;
}) {
  const t = useTranslations('admin.approvals');
  const [rejecting, setRejecting] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (!decide)
    return (
      <DecisionBar>
        <p className="text-small text-muted-ink">{t('decision.readOnly')}</p>
      </DecisionBar>
    );

  const failed = (result: Awaited<ReturnType<DecideAction>> | null) =>
    toast.error(
      result && !result.ok && result.error === 'forbidden' ? t('toasts.forbidden') : t('toasts.error'),
    );

  return (
    <DecisionBar>
      <Button type="button" variant="dangerOutline" onClick={() => setRejecting(true)} disabled={pending}>
        {t('decision.reject')}
      </Button>
      <span className="hidden min-w-0 flex-1 text-small text-muted-ink sm:block">
        {t('decision.rejectHint')}
      </span>
      <Button
        type="button"
        className="ml-auto"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            const result = await decide({ userIds: [userId], decision: 'approve' }).catch(() => null);
            if (result?.ok) toast.success(t('toasts.approved', { count: 1 }));
            else failed(result);
          })
        }
      >
        {pending ? t('decision.approving') : t('decision.approve')}
      </Button>
      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={t('decision.rejectTitle')}
        description={t('decision.rejectDescription', { name, email })}
        presets={[
          t('decision.presets.notMember'),
          t('decision.presets.applyFirst'),
          t('decision.presets.duplicate'),
        ]}
        onReject={async ({ presets, reason, notify }) => {
          const text = [...presets, reason].filter(Boolean).join('. ');
          const result = await decide({ userIds: [userId], decision: 'reject', reason: text, notify }).catch(
            () => null,
          );
          if (result?.ok) {
            toast.success(t('toasts.rejected'));
            setRejecting(false);
          } else failed(result);
        }}
      />
    </DecisionBar>
  );
}
