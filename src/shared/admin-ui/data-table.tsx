'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown, EllipsisVertical } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Checkbox } from '@/shared/ui/form/choice';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/primitives/dropdown-menu';

import { useUrlParams } from './use-url-params';

// Admin tables (AdminEvents, AdminMobileViews). Sorting and paging are done by the server from
// the URL, so this is a plain table, not a data grid: columns, row selection with a bulk bar,
// a row menu, and cards instead of the table below 768 px.

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** URL sort key: `?sort=<key>` ascending, `?sort=-<key>` descending. */
  sort?: string;
  className?: string;
};

type DataTableProps<T> = {
  /** Accessible name of the table, e.g. "Events". */
  label: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Short name of a row for screen readers ("Select Workshop: AI at the Edge"). */
  rowLabel: (row: T) => string;
  /** Bulk actions for the selected rows; without it the table has no checkboxes. */
  bulkActions?: (selected: string[], clearSelection: () => void) => React.ReactNode;
  /** Items of the row menu (DropdownMenuItem). */
  rowActions?: (row: T) => React.ReactNode;
  /** The row as a card below 768 px (tables become cards on phones). */
  card?: (row: T) => React.ReactNode;
  /** Shown instead of the rows when there are none (EmptyState variant="admin"). */
  empty?: React.ReactNode;
};

export function DataTable<T>({
  label,
  rows,
  columns,
  rowKey,
  rowLabel,
  bulkActions,
  rowActions,
  card,
  empty,
}: DataTableProps<T>) {
  const t = useTranslations('admin.ui.table');
  const ids = rows.map(rowKey);
  const pageKey = ids.join('|');

  // A new page of rows starts with nothing selected (selection is kept per page of rows).
  const [selection, setSelection] = React.useState<{ pageKey: string; ids: Set<string> }>({
    pageKey,
    ids: new Set(),
  });
  const selected = selection.pageKey === pageKey ? selection.ids : new Set<string>();
  const setSelected = (next: Set<string>) => setSelection({ pageKey, ids: next });
  const clearSelection = () => setSelected(new Set());
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;
  const selectAllRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  if (rows.length === 0 && empty) return <>{empty}</>;

  const selectable = bulkActions !== undefined;

  return (
    <>
      {selectable && selected.size > 0 && (
        <div
          role="region"
          aria-label={t('bulkActions')}
          className="hidden flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-2.5 md:flex [&_[data-slot=button]]:h-8"
        >
          <strong className="text-small" aria-live="polite">
            {t('selected', { count: selected.size })}
          </strong>
          <span aria-hidden className="h-5 w-px bg-line-strong" />
          {bulkActions([...selected], clearSelection)}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearSelection}>
            {t('clearSelection')}
          </Button>
        </div>
      )}

      <div className={cn('overflow-x-auto', card && 'hidden md:block')}>
        <table className="w-full border-collapse text-small">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              {selectable && (
                <th scope="col" className={cn(headClass, 'w-11')}>
                  <Checkbox
                    ref={selectAllRef}
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(ids))}
                    aria-label={t('selectAll')}
                    className="size-[18px] align-middle"
                  />
                </th>
              )}
              {columns.map((column) => (
                <SortableHeader key={column.key} column={column} />
              ))}
              {rowActions && (
                <th scope="col" className={cn(headClass, 'w-13')}>
                  <span className="sr-only">{t('actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = rowKey(row);
              const isSelected = selected.has(id);
              return (
                <tr
                  key={id}
                  className={cn(
                    'hover:bg-surface-2',
                    isSelected && 'bg-brand-tint/60 hover:bg-brand-tint/60',
                  )}
                >
                  {selectable && (
                    <td className={cellClass}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggle(id)}
                        aria-label={t('selectRow', { label: rowLabel(row) })}
                        className="size-[18px] align-middle"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className={cn(cellClass, column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className={cellClass}>
                      <RowActions label={t('moreActions', { label: rowLabel(row) })}>
                        {rowActions(row)}
                      </RowActions>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {card && (
        <ul aria-label={label} className="flex flex-col gap-2.5 bg-surface p-3 md:hidden">
          {rows.map((row) => (
            <li
              key={rowKey(row)}
              className="flex items-start gap-3 rounded-md border border-line bg-white p-3"
            >
              <div className="min-w-0 flex-1">{card(row)}</div>
              {rowActions && (
                <RowActions label={t('moreActions', { label: rowLabel(row) })}>{rowActions(row)}</RowActions>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const headClass =
  'h-10 border-b border-line bg-surface-2 px-3 text-left text-[12px] font-medium tracking-[0.04em] whitespace-nowrap text-muted-ink uppercase first:pl-5 last:pr-5';
const cellClass = 'h-15 border-b border-divider px-3 py-2 align-middle first:pl-5 last:pr-5';

function SortableHeader<T>({ column }: { column: Column<T> }) {
  const t = useTranslations('admin.ui.table');
  const { params, hrefWith } = useUrlParams();
  if (!column.sort) {
    return (
      <th scope="col" className={headClass}>
        {column.header}
      </th>
    );
  }
  const current = params.get('sort');
  const direction =
    current === column.sort ? 'ascending' : current === `-${column.sort}` ? 'descending' : null;
  // Unsorted → ascending → descending → ascending…
  const next = direction === 'ascending' ? `-${column.sort}` : column.sort;
  const Icon = direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ChevronsUpDown;
  return (
    <th scope="col" aria-sort={direction ?? undefined} className={headClass}>
      <Link
        href={hrefWith({ sort: next })}
        scroll={false}
        className={cn(
          'inline-flex items-center gap-1 no-underline hover:text-ink',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          direction ? 'text-ink' : 'text-muted-ink',
        )}
      >
        {column.header}
        <Icon className="size-3" aria-hidden />
        {direction && (
          <span className="sr-only">
            {direction === 'ascending' ? t('sortAscending') : t('sortDescending')}
          </span>
        )}
      </Link>
    </th>
  );
}

/** The ⋮ menu of a row; children are DropdownMenuItems. */
export function RowActions({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="size-8 shrink-0">
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A link styled as a table cell title (title + slug under it). */
export function CellTitle({ href, title, meta }: { href: string; title: string; meta?: React.ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col">
      <Link
        href={href as Route}
        className="font-medium text-ink no-underline hover:underline focus-visible:outline-2 focus-visible:outline-brand"
      >
        {title}
      </Link>
      {meta && <span className="max-w-[260px] truncate text-[13px] text-muted-ink">{meta}</span>}
    </span>
  );
}
