'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminBadge, type AdminBadgeTone } from '@/shared/admin-ui/admin-page';
import { CellTitle, type Column, DataTable } from '@/shared/admin-ui/data-table';
import { ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu';

import type { SampleEventRow, SampleListQuery, SampleStatus } from './sample-events';

const statusTone: Record<SampleStatus, AdminBadgeTone> = {
  published: 'dark',
  draft: 'outline',
  hidden: 'muted',
};

const sampleOnly = () => toast('Sample data: nothing was changed.');

/** AdminEvents with the sample rows: selection + bulk bar, sortable columns, row menu, cards. */
export function EventsTableDemo({ rows, query }: { rows: SampleEventRow[]; query: SampleListQuery }) {
  const t = useTranslations('admin.ui.status');
  const { update } = useUrlParams();
  const [toDelete, setToDelete] = React.useState<SampleEventRow[] | null>(null);

  const status = (row: SampleEventRow) => (
    <AdminBadge tone={statusTone[row.status]}>{t(row.status)}</AdminBadge>
  );
  const thumb = <span aria-hidden className="h-10 w-14 shrink-0 rounded-sm bg-divider" />;

  const columns: Column<SampleEventRow>[] = [
    {
      key: 'event',
      header: 'Event',
      sort: 'title',
      cell: (row) => (
        <span className="flex items-center gap-3">
          {thumb}
          <CellTitle href="/admin/design-system" title={row.title} meta={`/${row.path}`} />
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      sort: 'dates',
      cell: (row) => row.dates,
      className: 'whitespace-nowrap',
    },
    { key: 'type', header: 'Type', cell: (row) => row.type },
    { key: 'scope', header: 'Category', cell: (row) => (row.scope === 'local' ? 'Local' : 'International') },
    { key: 'status', header: 'Status', cell: status },
    { key: 'applications', header: 'Applications', cell: (row) => row.applications },
    {
      key: 'edited',
      header: 'Last edited',
      cell: (row) => (
        <span className="flex flex-col whitespace-nowrap">
          {row.edited}
          <span className="text-[13px] text-muted-ink">{row.editedBy}</span>
        </span>
      ),
    },
  ];

  const filtersInWords = [query.status && t(query.status as SampleStatus), query.type, query.year]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <DataTable
        label="Events"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowLabel={(row) => row.title}
        bulkActions={(selected, clear) => (
          <>
            <Button variant="quiet" size="sm" onClick={sampleOnly}>
              Publish
            </Button>
            <Button variant="quiet" size="sm" onClick={sampleOnly}>
              Move to draft
            </Button>
            <Button variant="quiet" size="sm" onClick={sampleOnly}>
              Hide
            </Button>
            <Button
              variant="dangerOutline"
              size="sm"
              onClick={() => {
                setToDelete(rows.filter((r) => selected.includes(r.id)));
                clear();
              }}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          </>
        )}
        rowActions={(row) => (
          <>
            <DropdownMenuItem onSelect={sampleOnly}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={sampleOnly}>View on site</DropdownMenuItem>
            <DropdownMenuItem onSelect={sampleOnly}>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setToDelete([row])}>
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          </>
        )}
        card={(row) => (
          <div className="flex gap-3">
            {thumb}
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-medium">{row.title}</span>
              <span className="text-[13px] text-muted-ink">
                {row.dates} · {row.type}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-ink">
                {status(row)}
                {row.applications !== '—' &&
                  (/^\d+$/.test(row.applications) ? `${row.applications} applications` : row.applications)}
              </span>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            variant="admin"
            title="No events match these filters"
            actions={
              <>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => update({ q: null, status: null, type: null, year: null, scope: null })}
                >
                  Clear filters
                </Button>
                <Button size="sm" onClick={sampleOnly}>
                  <Plus aria-hidden />
                  Add event
                </Button>
              </>
            }
          >
            Nothing found{query.q && <> for “{query.q}”</>}
            {filtersInWords && <> in {filtersInWords}</>}. Try clearing a filter, or create the event if
            it&apos;s missing.
          </EmptyState>
        }
      />
      <ConfirmDeleteDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={
          toDelete?.length === 1
            ? `Delete “${toDelete[0]!.title}”?`
            : `Delete ${toDelete?.length ?? 0} events?`
        }
        description={
          toDelete?.length === 1 && toDelete[0]!.id === 'ai-at-the-edge' ? (
            <>
              This also deletes its gallery (8 photos) and{' '}
              <strong className="text-ink">38 applications</strong>. This can&apos;t be undone.
            </>
          ) : (
            <>This also deletes their galleries and applications. This can&apos;t be undone.</>
          )
        }
        confirmLabel={toDelete?.length === 1 ? 'Delete event' : 'Delete events'}
        onConfirm={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          setToDelete(null);
          sampleOnly();
        }}
      >
        <a href="#export" className="w-fit text-small font-medium text-brand-dark underline">
          Export the applications first (CSV)
        </a>
      </ConfirmDeleteDialog>
    </>
  );
}
