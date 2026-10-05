import { Download, Plus } from 'lucide-react';
import * as React from 'react';

import { AdminPage, AdminPageHeader, AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';
import { FilterBar, SegmentFilter, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { hrefWithParams } from '@/shared/lib/search-params';
import { Button } from '@/shared/ui/primitives/button';

import { DialogsDemo, EditFormDemo, SaveBarStates, ToastsDemo } from './edit-demos';
import { EventsTableDemo } from './events-table-demo';
import { FieldDemos } from './field-demos';
import { listSampleEvents, parseSampleListQuery } from './sample-events';

const PATH = '/admin/design-system';

function LabSection({
  id,
  title,
  source,
  children,
}: {
  id: string;
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-20 flex-col gap-3 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
        <h2 id={`${id}-title`} className="text-[18px] font-bold">
          {title}
        </h2>
        <span className="text-[13px] text-muted-ink">{source}</span>
      </div>
      {children}
    </section>
  );
}

/**
 * Admin patterns lab (dev and preview only): the shared admin-ui components in the real admin
 * shell, with sample rows from AdminEvents. Filters, sort and page work through the URL.
 */
export function AdminPatternsPage({
  searchParams,
  savedAt,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  savedAt: string;
}) {
  const query = parseSampleListQuery(searchParams);
  const list = listSampleEvents(query);
  const current = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])),
  );
  const tabHref = (tab: string | null) => hrefWithParams(PATH, current, { tab });

  return (
    <AdminPage>
      <AdminPageHeader
        title="Admin patterns"
        description="Shared admin components with sample rows (dev and preview only). Nothing here changes data."
        actions={
          <>
            <Button variant="ghost" size="sm">
              Event types
            </Button>
            <Button variant="quiet" size="sm">
              <Download aria-hidden />
              Export CSV
            </Button>
            <Button size="sm">
              <Plus aria-hidden />
              Add event
            </Button>
          </>
        }
      />

      <LabSection
        id="list"
        title="List: tabs, filters, bulk actions, table"
        source="AdminEvents · AdminEvents-Empty · AdminMobileViews"
      >
        <TablePanel>
          <AdminTabs
            label="Event timing"
            tabs={[
              { href: tabHref(null), label: 'All', count: list.counts.all, current: query.tab === 'all' },
              {
                href: tabHref('upcoming'),
                label: 'Upcoming',
                count: list.counts.upcoming,
                current: query.tab === 'upcoming',
              },
              {
                href: tabHref('past'),
                label: 'Past',
                count: list.counts.past,
                current: query.tab === 'past',
              },
            ]}
          />
          <FilterBar
            search={{ param: 'q', label: 'Search events', placeholder: 'Search by title or slug' }}
            filterParams={['status', 'type', 'year', 'scope']}
          >
            <SelectFilter
              param="status"
              label="Status"
              anyLabel="Any status"
              width="130px"
              options={[
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
            <SelectFilter
              param="type"
              label="Type"
              anyLabel="Any type"
              width="170px"
              options={list.types.map((type) => ({ value: type, label: type }))}
            />
            <SelectFilter
              param="year"
              label="Year"
              anyLabel="Any year"
              width="110px"
              options={list.years.map((year) => ({ value: year, label: year }))}
            />
            <SegmentFilter
              param="scope"
              label="Category"
              options={[
                { value: '', label: 'All' },
                { value: 'local', label: 'Local' },
                { value: 'international', label: 'International' },
              ]}
            />
          </FilterBar>
          <EventsTableDemo rows={list.rows} query={query} />
          {list.total > 0 && <TablePagination page={list.page} pageSize={query.size} total={list.total} />}
        </TablePanel>
        <p className="text-[13px] text-muted-ink">
          Try: select rows (bulk bar), sort by Event or Dates, search “robotics” (empty state), the ⋮ menu →
          Delete. Below 768 px the table becomes cards and the filters move into a sheet.
        </p>
      </LabSection>

      <LabSection id="pagination" title="Table pagination" source="AdminEvents (canvas totals: 155 rows)">
        <TablePanel>
          <TablePagination page={Math.min(query.page, 16)} pageSize={10} total={155} />
        </TablePanel>
      </LabSection>

      <LabSection id="save-bar" title="Save bar" source="AdminEditStates">
        <SaveBarStates savedAt={savedAt} />
      </LabSection>

      <LabSection
        id="edit-form"
        title="Edit form: validation, MK/EN field, toasts, leaving"
        source="AdminEditStates · AdminDialogs › 3"
      >
        <p className="text-small text-muted-ink">
          “Save draft” always works. “Publish” checks the fields first. Change something, then click a sidebar
          link: the leave-without-saving dialog opens.
        </p>
        <EditFormDemo savedAt={savedAt} />
      </LabSection>

      <LabSection
        id="fields"
        title="Edit form fields: address, rich text, chips, sortable grid"
        source="AdminEventEdit (the full form is /admin/events/[id])"
      >
        <FieldDemos />
      </LabSection>

      <LabSection
        id="dialogs"
        title="Dialogs"
        source="AdminDialogs (Invite an admin comes with Admin users, M4)"
      >
        <DialogsDemo />
      </LabSection>

      <LabSection id="toasts" title="Toasts" source="AdminEditStates">
        <ToastsDemo />
      </LabSection>
    </AdminPage>
  );
}
