'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { DecisionBar } from '@/shared/admin-ui/decision-bar';
import { RejectDialog } from '@/shared/admin-ui/dialogs';
import { Checkbox, ChoiceLabel } from '@/shared/ui/form/choice';
import { Button } from '@/shared/ui/primitives/button';

import { decideMemories } from '../../actions/admin-memories';

/**
 * "Feature on the Home page" and the decision bar for the open Memory: Reject…, Edit before
 * publishing and Approve & publish (the bar stays at the bottom of the screen on phones).
 */
export function MemoryDecision({
  id,
  title,
  authorName,
  kind,
  featuredInitial,
  canDecide,
}: {
  id: string;
  title: string;
  authorName: string;
  kind: 'memory' | 'revision';
  featuredInitial: boolean;
  canDecide: boolean;
}) {
  const t = useTranslations('admin.approvals.memories');
  const [rejecting, setRejecting] = React.useState(false);
  const [featured, setFeatured] = React.useState(featuredInitial);
  const [pending, startTransition] = React.useTransition();

  const failed = (result: Awaited<ReturnType<typeof decideMemories>> | null) =>
    toast.error(
      result && !result.ok && result.error === 'forbidden' ? t('toasts.forbidden') : t('toasts.error'),
    );

  if (!canDecide)
    return (
      <DecisionBar>
        <p className="text-small text-muted-ink">{t('decision.readOnly')}</p>
      </DecisionBar>
    );

  return (
    <>
      <div className="border-t border-divider px-4 py-3 lg:px-6">
        <ChoiceLabel
          control={
            <Checkbox
              id={`feature-${id}`}
              checked={featured}
              onChange={(event) => setFeatured(event.target.checked)}
            />
          }
        >
          {t('detail.feature')}
        </ChoiceLabel>
      </div>
      <DecisionBar>
        <Button type="button" variant="dangerOutline" onClick={() => setRejecting(true)} disabled={pending}>
          {t('decision.reject')}
        </Button>
        <span className="hidden min-w-0 flex-1 text-small text-muted-ink xl:block">
          {t('decision.rejectHint')}
        </span>
        <Button asChild variant="quiet" className="ml-auto">
          <Link href={`/admin/memories/${id}`}>{t('decision.edit')}</Link>
        </Button>
        <Button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            startTransition(async () => {
              const result = await decideMemories({
                ids: [id],
                decision: 'approve',
                featuredOnHome: featured,
              }).catch(() => null);
              if (result?.ok)
                toast.success(
                  kind === 'revision' ? t('toasts.approvedChanges') : t('toasts.approved', { count: 1 }),
                );
              else failed(result);
            })
          }
        >
          {pending
            ? t('decision.approving')
            : kind === 'revision'
              ? t('decision.approveChanges')
              : t('decision.approve')}
        </Button>
      </DecisionBar>
      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={kind === 'revision' ? t('decision.rejectTitleRevision') : t('decision.rejectTitle')}
        description={t('decision.rejectDescription', { title, author: authorName })}
        presets={[t('decision.presets.alt'), t('decision.presets.offTopic'), t('decision.presets.shorter')]}
        onReject={async ({ presets, reason, notify }) => {
          const text = [...presets, reason].filter(Boolean).join('. ');
          const result = await decideMemories({ ids: [id], decision: 'reject', reason: text, notify }).catch(
            () => null,
          );
          if (result?.ok) {
            toast.success(t('toasts.rejected'));
            setRejecting(false);
          } else failed(result);
        }}
      />
    </>
  );
}
