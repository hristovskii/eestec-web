'use client';

import { Download, Eye, Pencil, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  AdminBadge,
  type AdminBadgeTone,
  AdminPage,
  AdminPageHeader,
  AdminTabs,
  TablePanel,
} from '@/shared/admin-ui/admin-page';
import { type Column, DataTable } from '@/shared/admin-ui/data-table';
import { FilterBar, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { Paged } from '@/shared/data/paged';
import { formatDate } from '@/shared/i18n/format';
import { resolveLocalized } from '@/shared/i18n/localized';
import { initials } from '@/shared/lib/initials';
import { hrefWithParams } from '@/shared/lib/search-params';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem } from '@/shared/ui/primitives/dropdown-menu';

import {
  type AdminMembersParams,
  hasMemberAdminFilters,
  MEMBER_PAGE_SIZES,
} from '../../schemas/admin-members-params.schema';
import {
  type AdminMemberCounts,
  type Badge,
  PROFILE_STATUSES,
  type Profile,
  type ProfileStatus,
  type Team,
} from '../../types';
import { MemberDialog } from './member-dialog';

const STATUS_TONE: Record<ProfileStatus, AdminBadgeTone> = {
  active: 'dark',
  alumni: 'outline',
  inactive: 'muted',
  hidden: 'attention',
};

type MembersAdminProps = {
  page: Paged<Profile>;
  counts: AdminMemberCounts;
  params: AdminMembersParams;
  teams: Team[];
  badges: Badge[];
  events: { id: string; title: string }[];
  canEdit: boolean;
};

/** /admin/members: everyone with a profile (pattern: Admin › Map / Committees). */
export function MembersAdmin({ page, counts, params, teams, badges, events, canEdit }: MembersAdminProps) {
  const t = useTranslations('admin.members');
  const { hrefWith, update, params: urlParams } = useUrlParams();
  const [editing, setEditing] = React.useState<{ profile: Profile; key: number } | null>(null);
  const opened = React.useRef(0);
  const open = (profile: Profile) => setEditing({ profile, key: ++opened.current });

  const teamsOf = (profile: Profile) =>
    profile.teams
      .map((entry) => teams.find((team) => team.id === entry.teamId))
      .filter((team): team is Team => !!team)
      .map((team) => resolveLocalized(team.name, 'en'))
      .join(', ');
  const status = (profile: Profile) => (
    <AdminBadge tone={STATUS_TONE[profile.status]}>{t(`statuses.${profile.status}`)}</AdminBadge>
  );
  const avatar = (profile: Profile) => (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-bold text-brand-dark"
    >
      {initials(profile.name)}
    </span>
  );

  const columns: Column<Profile>[] = [
    {
      key: 'member',
      header: t('columns.member'),
      sort: 'name',
      cell: (profile) => (
        <span className="flex items-center gap-2.5">
          {avatar(profile)}
          <span className="flex min-w-0 flex-col items-start">
            {canEdit ? (
              <button
                type="button"
                onClick={() => open(profile)}
                className="cursor-pointer text-left font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {profile.name}
              </button>
            ) : (
              <span className="font-medium">{profile.name}</span>
            )}
            <span className="text-[13px] text-muted-ink">@{profile.username}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'teams',
      header: t('columns.teams'),
      cell: (profile) => teamsOf(profile) || <span className="text-muted-ink">{t('row.noTeam')}</span>,
    },
    { key: 'status', header: t('columns.status'), sort: 'status', cell: status },
    {
      key: 'visibility',
      header: t('columns.visibility'),
      cell: (profile) => t(`visibilities.${profile.visibility}`),
    },
    {
      key: 'since',
      header: t('columns.since'),
      sort: 'since',
      cell: (profile) => formatDate(profile.memberSince, 'en', 'monthYear'),
    },
  ];

  const clearFilters = () => update({ q: null, status: null, team: null });
  const exportHref = hrefWithParams('/api/export/members', urlParams.toString(), { page: null, size: null });

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="quiet" size="sm">
            {/* A file download: a plain link, so the browser handles it. */}
            <a href={exportHref} download>
              <Download aria-hidden />
              {t('export')}
            </a>
          </Button>
        }
      />
      <p className="-mt-2 rounded-md bg-surface px-4 py-3 text-small text-ink-2">
        {t.rich('hint', {
          link: (chunks) => (
            <Link href="/admin/approvals" className="font-medium text-brand-dark">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <MembersSections current="members" />

      <TablePanel>
        <AdminTabs
          label={t('tabs.label')}
          tabs={[
            {
              href: hrefWith({ status: null, page: null }),
              label: t('tabs.all'),
              count: counts.all,
              current: !params.status,
            },
            ...PROFILE_STATUSES.map((value) => ({
              href: hrefWith({ status: value, page: null }),
              label: t(`tabs.${value}`),
              count: counts[value],
              current: params.status === value,
            })),
          ]}
        />
        <FilterBar
          search={{ param: 'q', label: t('filters.search'), placeholder: t('filters.searchPlaceholder') }}
          filterParams={['team']}
        >
          <SelectFilter
            param="team"
            label={t('filters.team')}
            anyLabel={t('filters.teamAny')}
            width="200px"
            options={teams.map((team) => ({ value: team.slug, label: resolveLocalized(team.name, 'en') }))}
          />
        </FilterBar>
        <DataTable
          label={t('title')}
          rows={page.items}
          columns={columns}
          rowKey={(profile) => profile.userId}
          rowLabel={(profile) => profile.name}
          rowActions={(profile) => (
            <>
              {canEdit && (
                <DropdownMenuItem onSelect={() => open(profile)}>
                  <Pencil aria-hidden />
                  {t('row.edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <a href={`/members/${profile.username}`} target="_blank" rel="noopener noreferrer">
                  <Eye aria-hidden />
                  {t('row.view')}
                </a>
              </DropdownMenuItem>
            </>
          )}
          card={(profile) => (
            <div className="flex items-start gap-2.5">
              {avatar(profile)}
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <strong className="font-medium">{profile.name}</strong>
                <span className="text-[13px] text-muted-ink">
                  {teamsOf(profile) || t('row.noTeam')} · {formatDate(profile.memberSince, 'en', 'monthYear')}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-[13px]">
                  {status(profile)}
                  {t(`visibilities.${profile.visibility}`)}
                </span>
              </span>
            </div>
          )}
          empty={
            hasMemberAdminFilters(params) ? (
              <EmptyState
                variant="admin"
                title={t('empty.filteredTitle')}
                actions={
                  <Button variant="quiet" size="sm" onClick={clearFilters}>
                    {t('empty.clear')}
                  </Button>
                }
              >
                {t('empty.filteredText')}
              </EmptyState>
            ) : (
              <EmptyState variant="admin" icon={<Users />} title={t('empty.noneTitle')}>
                {t('empty.noneText')}
              </EmptyState>
            )
          }
        />
        {page.items.length > 0 && (
          <TablePagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            sizes={MEMBER_PAGE_SIZES}
          />
        )}
      </TablePanel>

      {editing && (
        <MemberDialog
          key={editing.key}
          profile={editing.profile}
          teams={teams}
          badges={badges}
          events={events}
          open
          onOpenChange={(next) => !next && setEditing(null)}
        />
      )}
    </AdminPage>
  );
}

/** The sections of Admin › Members (Members, Teams, Badges, Board), shared by every section. */
export function MembersSections({ current }: { current: 'members' | 'teams' | 'badges' | 'board' }) {
  const t = useTranslations('admin.members.sections');
  const { hrefWith } = useUrlParams();
  const clear = { q: null, status: null, team: null, sort: null, page: null, size: null, board: null };
  return (
    <div className="-mt-1 overflow-hidden rounded-md border border-line bg-white">
      <AdminTabs
        label={t('label')}
        tabs={(['members', 'teams', 'badges', 'board'] as const).map((tab) => ({
          href: hrefWith({ ...clear, tab: tab === 'members' ? null : tab }),
          label: t(tab),
          current: current === tab,
        }))}
      />
    </div>
  );
}
