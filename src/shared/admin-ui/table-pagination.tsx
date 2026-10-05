'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { pageItems, pageRange } from '@/shared/lib/pagination';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { useUrlParams } from './use-url-params';

export const PAGE_SIZES = [10, 25, 50] as const;

type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** URL param for "Rows per page" (changing it returns to page 1). */
  sizeParam?: string;
  /** Choices for "Rows per page" (grids use multiples of 12). */
  sizes?: readonly number[];
  /** Label of the size select, e.g. "Files per page" on grids. */
  sizeLabel?: string;
};

/**
 * "Showing 1–10 of 155", rows per page and page numbers (AdminEvents). On phones: "Page X of Y"
 * with previous / next. Pages are links (`?page=`), so they work without JavaScript.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  sizeParam = 'size',
  sizes = PAGE_SIZES,
  sizeLabel,
}: TablePaginationProps) {
  const t = useTranslations('admin.ui.pagination');
  const { hrefWith, update } = useUrlParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const { from, to } = pageRange(page, pageSize, total);
  const href = (p: number) => hrefWith({ page: p > 1 ? String(p) : null });

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3.5 md:px-5">
      <span className="text-[13px] text-muted-ink">
        {t.rich('showing', {
          from,
          to,
          total,
          strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
        })}
      </span>
      <div className="flex items-center gap-3.5">
        <label className="hidden items-center gap-2 text-[13px] text-muted-ink md:flex">
          {sizeLabel ?? t('rowsPerPage')}
          <NativeSelect
            value={String(pageSize)}
            onChange={(event) => update({ [sizeParam]: event.target.value })}
            className="w-[76px] [--control-h:32px] [&_select]:text-small"
          >
            {sizes.map((size) => (
              <NativeSelectOption key={size} value={size}>
                {size}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        {pageCount > 1 && (
          <nav aria-label={t('label')} className="flex items-center gap-1">
            <PageLink href={page > 1 ? href(page - 1) : undefined} label={t('previous')}>
              <ChevronLeft className="size-4" aria-hidden />
            </PageLink>
            <span className="px-2 text-[13px] font-medium md:hidden">
              {t('pageOf', { page, count: pageCount })}
            </span>
            {pageItems(page, pageCount).map((item, index) =>
              item === 'gap' ? (
                <span
                  key={`gap-${index}`}
                  aria-hidden
                  className={cn(pageClass, 'hidden border-0 md:inline-flex')}
                >
                  …
                </span>
              ) : (
                <Link
                  key={item}
                  href={href(item)}
                  scroll={false}
                  aria-label={t('page', { page: item })}
                  aria-current={item === page ? 'page' : undefined}
                  className={cn(
                    pageClass,
                    'hidden md:inline-flex',
                    item === page ? 'border-ink bg-ink text-white' : 'hover:border-ink',
                  )}
                >
                  {item}
                </Link>
              ),
            )}
            <PageLink href={page < pageCount ? href(page + 1) : undefined} label={t('next')}>
              <ChevronRight className="size-4" aria-hidden />
            </PageLink>
          </nav>
        )}
      </div>
    </div>
  );
}

const pageClass =
  'inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-sm border border-line bg-white px-2 text-[13px] font-medium text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

function PageLink({
  href,
  label,
  children,
}: {
  href: ReturnType<ReturnType<typeof useUrlParams>['hrefWith']> | undefined;
  label: string;
  children: React.ReactNode;
}) {
  if (!href)
    return (
      <span aria-disabled="true" aria-label={label} role="link" className={cn(pageClass, 'text-line-strong')}>
        {children}
      </span>
    );
  return (
    <Link href={href} scroll={false} aria-label={label} className={cn(pageClass, 'hover:border-ink')}>
      {children}
    </Link>
  );
}
