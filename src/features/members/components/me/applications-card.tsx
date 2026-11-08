'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { MyApplicationView } from '@/features/applications';
import { formatDate, formatDateRange } from '@/shared/i18n/format';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { Chip } from '@/shared/ui/chip';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';

import { withdrawApplication } from '../../actions/my-privacy';

const TONE = { pending: 'red', waitlist: 'outline', accepted: 'dark', rejected: 'outline' } as const;

/** "My applications" (MyProfile): one row per application, with the action its state allows. */
export function ApplicationsCard({ rows }: { rows: MyApplicationView[] }) {
  const t = useTranslations('members.me.applications');
  const locale = useLocale();
  const router = useRouter();
  const [asking, setAsking] = React.useState<MyApplicationView | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function withdraw(row: MyApplicationView) {
    setBusy(true);
    try {
      const result = await withdrawApplication(row.id);
      if (!result.ok) throw new Error(result.error);
      setAsking(null);
      toast.success(t('done'));
      router.refresh();
    } catch {
      toast.error(t('failed'), { duration: Infinity });
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title={t('empty.title')}
        actions={
          <Button asChild variant="quiet" size="sm">
            <Link href="/upcoming">{t('empty.link')}</Link>
          </Button>
        }
      >
        {t('empty.text')}
      </EmptyState>
    );
  }

  const leaving = asking?.status === 'waitlist';
  return (
    <>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className={`grid gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_150px_170px_110px] sm:items-center ${index > 0 ? 'border-t border-line' : ''}`}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={row.path as '/upcoming'}
                lang={row.lang}
                className="text-body font-medium text-ink no-underline hover:underline"
              >
                {row.title}
              </Link>
              <span className="text-small text-muted-ink">
                {formatDateRange(row.startsAt, row.endsAt, locale === 'mk' ? 'mk' : 'en')}
                {row.place ? ` · ${row.place}` : ''}
              </span>
            </span>
            <span className="text-small text-muted-ink">
              {t('applied', { date: formatDate(row.appliedAt, locale === 'mk' ? 'mk' : 'en', 'dayMonth') })}
            </span>
            <span>
              <Chip
                tone={TONE[row.status]}
                size="sm"
                className={row.status === 'waitlist' ? 'bg-surface' : ''}
              >
                {row.status === 'waitlist'
                  ? t('status.waitlist', { position: row.waitlistPosition ?? 0 })
                  : t(`status.${row.status}`)}
              </Chip>
            </span>
            <span className="sm:text-right">
              {row.canWithdraw && (row.status === 'pending' || row.status === 'waitlist') ? (
                <button
                  type="button"
                  onClick={() => setAsking(row)}
                  className="cursor-pointer text-small font-medium text-brand-dark hover:text-brand hover:underline"
                >
                  {row.status === 'waitlist' ? t('leave') : t('withdraw')}
                </button>
              ) : (
                <Link
                  href={row.path as '/upcoming'}
                  className="text-small font-medium text-brand-dark no-underline hover:text-brand hover:underline"
                >
                  {t('details')}
                </Link>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Dialog open={asking !== null} onOpenChange={(open) => !open && !busy && setAsking(null)}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>{leaving ? t('dialog.leaveTitle') : t('dialog.withdrawTitle')}</DialogTitle>
            <DialogDescription className="text-small">
              {asking && t(leaving ? 'dialog.leaveText' : 'dialog.withdrawText', { title: asking.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="quiet" size="sm" disabled={busy} onClick={() => setAsking(null)}>
              {t('dialog.keep')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => asking && void withdraw(asking)}
            >
              {leaving ? t('dialog.leaveConfirm') : t('dialog.withdrawConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
