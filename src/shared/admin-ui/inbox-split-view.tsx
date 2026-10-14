'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { hrefWithParams } from '@/shared/lib/search-params';

/** One line of the list on the left. */
export type InboxRow = {
  id: string;
  name: string;
  /** The small grey pill ("Membership"). */
  badge?: string;
  /** One line of the text; cut off with "…" when it is long. */
  preview: string;
  /** "17:42", "Yesterday", "28 Sep". */
  when: string;
  unread: boolean;
};

type InboxSplitViewProps = {
  /** Name of the list ("Messages"). */
  label: string;
  rows: InboxRow[];
  /** The item whose detail is open (`?open=`). */
  openId: string | null;
  /** What the right side shows for the open item (the page renders it on the server). */
  detail: React.ReactNode;
  /** The list when there is nothing in it (designed empty states). */
  empty: React.ReactNode;
  /** Page numbers under the list. */
  footer?: React.ReactNode;
};

/**
 * Admin › Inbox (AdminInbox): the list of items at 400 px and the open item beside it. Below
 * 1024 px it is one or the other: the list, or the open item with a way back. The open item lives
 * in the URL (`?open=`), so a link to a message works and Back closes it.
 */
export function InboxSplitView({ label, rows, openId, detail, empty, footer }: InboxSplitViewProps) {
  const t = useTranslations('admin.inbox.list');
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (open: string | null) => hrefWithParams(pathname, params, { open }, { resetPage: false });

  return (
    <div className="grid min-h-160 lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className={cn('flex min-w-0 flex-col lg:border-r lg:border-line', openId && 'max-lg:hidden')}>
        {rows.length === 0 ? (
          empty
        ) : (
          <ul aria-label={label} className="m-0 list-none p-0">
            {rows.map((row) => {
              const selected = row.id === openId;
              return (
                <li key={row.id} className="border-b border-divider">
                  <Link
                    href={href(row.id) as never}
                    scroll={false}
                    aria-current={selected ? 'true' : undefined}
                    className={cn(
                      'grid grid-cols-[10px_minmax(0,1fr)] gap-2.5 px-4 py-3.5 text-ink no-underline hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                      selected && 'bg-brand-tint hover:bg-brand-tint',
                    )}
                  >
                    <span className="pt-1.5">
                      {row.unread && (
                        <>
                          <span aria-hidden className="block size-2 rounded-full bg-brand" />
                          <span className="sr-only">{t('unread')}</span>
                        </>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className="flex justify-between gap-2">
                        <span className={cn('truncate', row.unread ? 'font-bold' : 'font-normal')}>
                          {row.name}
                        </span>
                        <span className="text-[13px] whitespace-nowrap text-muted-ink">{row.when}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        {row.badge && (
                          <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-line bg-surface px-2 text-[11px] font-medium text-ink-2">
                            {row.badge}
                          </span>
                        )}
                        <span
                          className={cn('truncate text-[13px]', row.unread ? 'text-ink' : 'text-muted-ink')}
                        >
                          {row.preview}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {footer}
      </div>
      <section aria-label={t('detail')} className={cn('flex min-w-0 flex-col', !openId && 'max-lg:hidden')}>
        {openId && (
          <Link
            href={href(null) as never}
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
