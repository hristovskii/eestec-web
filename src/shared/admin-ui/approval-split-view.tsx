'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/primitives/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { useUrlParams } from './use-url-params';

/** One line of the list on the left (AdminApprovals). */
export type ApprovalRow = {
  id: string;
  /** The small grey pill: what kind of submission it is ("Member"). */
  kind: string;
  title: string;
  /** "FEEIT, 2nd year". */
  extra: string;
  /** "5 h ago", "Yesterday". */
  when: string;
};

type ApprovalSplitViewProps = {
  rows: ApprovalRow[];
  /** The submission whose preview is open (`?open=`). */
  openId: string | null;
  /** The preview on the right, rendered on the server. */
  detail: React.ReactNode;
  /** The list when nothing is waiting. */
  empty: React.ReactNode;
  /** "2 member registrations waiting". */
  waitingLabel: string;
  /** Approve everything that is ticked (the page's Server Action); null for people who may not decide. */
  onApproveSelected: ((ids: string[]) => Promise<void>) | null;
};

/**
 * Admin › Approvals (AdminApprovals): the queue at 400 px with a tick box on every row and "Approve
 * selected", and the preview of the open submission beside it. Below 1024 px it is the queue, or the
 * preview with a way back. The open submission lives in the URL (`?open=`).
 */
export function ApprovalSplitView({
  rows,
  openId,
  detail,
  empty,
  waitingLabel,
  onApproveSelected,
}: ApprovalSplitViewProps) {
  const t = useTranslations('admin.approvals.list');
  const { hrefWith } = useUrlParams();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();
  // Ticks of rows that are no longer in the list (decided elsewhere) fall away.
  const ticked = selected.filter((id) => rows.some((row) => row.id === id));
  const all = rows.length > 0 && ticked.length === rows.length;

  return (
    <div className="grid min-h-160 lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className={cn('flex min-w-0 flex-col lg:border-r lg:border-line', openId && 'max-lg:hidden')}>
        {rows.length === 0 ? (
          empty
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-2.5">
              <input
                type="checkbox"
                aria-label={t('selectAll')}
                checked={all}
                onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row.id) : [])}
                className="size-5 cursor-pointer accent-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
              />
              <span className="text-small text-muted-ink">{waitingLabel}</span>
              {onApproveSelected && (
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  className="ml-auto"
                  disabled={ticked.length === 0 || pending}
                  aria-busy={pending || undefined}
                  onClick={() =>
                    startTransition(async () => {
                      await onApproveSelected(ticked);
                      setSelected([]);
                    })
                  }
                >
                  {pending ? t('approvingSelected') : t('approveSelected')}
                </Button>
              )}
            </div>
            <ul aria-label={t('label')} className="m-0 list-none p-0">
              {rows.map((row) => {
                const current = row.id === openId;
                return (
                  <li
                    key={row.id}
                    className={cn(
                      'grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-b border-divider px-4 py-3.5',
                      current && 'bg-brand-tint',
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={t('selectItem', { name: row.title })}
                      checked={ticked.includes(row.id)}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked ? [...ticked, row.id] : ticked.filter((id) => id !== row.id),
                        )
                      }
                      className="mt-0.5 size-5 cursor-pointer accent-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    />
                    <Link
                      href={hrefWith({ open: row.id })}
                      scroll={false}
                      aria-current={current ? 'true' : undefined}
                      className="flex min-w-0 flex-col gap-1 text-ink no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-line bg-surface px-2 text-[11px] font-medium text-ink-2">
                          {row.kind}
                        </span>
                        <span className="text-[13px] whitespace-nowrap text-muted-ink">{row.when}</span>
                      </span>
                      <strong className={cn('truncate', current ? 'font-bold' : 'font-medium')}>
                        {row.title}
                      </strong>
                      <span className="truncate text-[13px] text-muted-ink">{row.extra}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <section aria-label={t('detail')} className={cn('flex min-w-0 flex-col', !openId && 'max-lg:hidden')}>
        {openId && (
          <Link
            href={hrefWith({ open: null })}
            scroll={false}
            className="flex min-h-11 items-center gap-2 border-b border-divider px-4 text-small font-medium text-brand-dark no-underline lg:hidden"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('back')}
          </Link>
        )}
        {openId ? (
          detail
        ) : (
          <p className="m-auto max-w-72 p-8 text-center text-small text-muted-ink">{t('noneSelected')}</p>
        )}
      </section>
    </div>
  );
}

/** The "Sort" select above the queue (oldest first by default). */
export function ApprovalSort({
  value,
  options,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const { update } = useUrlParams();
  return (
    <label className="flex items-center gap-2 text-small text-muted-ink">
      {label}
      <NativeSelect
        value={value}
        onChange={(event) => update({ sort: event.target.value === 'oldest' ? null : event.target.value })}
        className="w-44 [&_select]:text-small"
      >
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}
