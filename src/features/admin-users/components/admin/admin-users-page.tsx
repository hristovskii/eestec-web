'use client';

import { Mail, Plus, Trash2, CalendarCog } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { AdminAccount, AdminRole, TwoFactorStatus } from '@/features/auth';
import type { EventOption } from '@/features/events';
import {
  AdminBadge,
  type AdminBadgeTone,
  AdminPage,
  AdminPageHeader,
  TablePanel,
} from '@/shared/admin-ui/admin-page';
import { type Column, DataTable } from '@/shared/admin-ui/data-table';
import { formatDate } from '@/shared/i18n/format';
import { InitialsAvatar } from '@/shared/ui/cards';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { resendInvite } from '../../actions/admin-users';
import { lastActive } from '../../domain/admin-rules';
import { InviteDialog, RemoveDialog, RoleDialog, ROLES } from './admin-dialogs';

const TWO_FACTOR_TONE: Record<TwoFactorStatus, AdminBadgeTone> = {
  on: 'dark',
  off: 'attention',
  not_set_up: 'neutral',
};

type AdminUsersPageProps = {
  admins: AdminAccount[];
  events: EventOption[];
  currentUserId: string;
  /** Server "now" (pinned on mock data) for "Today, 16:02". */
  now: string;
  /** The permissions matrix (server-rendered). */
  matrix: React.ReactNode;
};

/** /admin/users (AdminUsers): admins, their roles and access, invites, and the permissions matrix. */
export function AdminUsersPage({ admins, events, currentUserId, now, matrix }: AdminUsersPageProps) {
  const t = useTranslations('admin.users');
  const tRoles = useTranslations('admin.roles');
  const format = useFormatter();
  const [inviting, setInviting] = React.useState(false);
  const [roleChange, setRoleChange] = React.useState<{ target: AdminAccount; role: AdminRole } | null>(null);
  const [removing, setRemoving] = React.useState<AdminAccount | null>(null);
  const [, startTransition] = React.useTransition();
  const current = new Date(now);
  const eventTitle = (id: string) => events.find((event) => event.id === id)?.title ?? id;

  const access = (admin: AdminAccount) =>
    admin.role === 'event_manager'
      ? admin.managedEventIds.length
        ? admin.managedEventIds.map(eventTitle).join(', ')
        : t('access.noEvents')
      : t(`access.${admin.role}`);

  const activeText = (admin: AdminAccount) => {
    if (admin.status === 'invited') {
      // "Invited 2 days ago" (AdminUsers).
      return t('lastActive.invited', {
        when: admin.invitedAt ? format.relativeTime(new Date(admin.invitedAt), current) : '',
      });
    }
    const last = lastActive(admin.lastActiveAt, current);
    switch (last.kind) {
      case 'never':
        return '—';
      case 'now':
        return t('lastActive.now');
      case 'today':
        return t('lastActive.today', { time: formatDate(last.at, 'en', 'time') });
      case 'yesterday':
        return t('lastActive.yesterday', { time: formatDate(last.at, 'en', 'time') });
      case 'recent':
        return formatDate(last.at, 'en', 'shortDateTime');
      case 'older':
        return formatDate(last.at, 'en', 'date');
    }
  };

  const resend = (admin: AdminAccount) =>
    startTransition(async () => {
      const result = await resendInvite({ userId: admin.userId });
      if (result.ok) toast.success(t('resent', { email: admin.email }));
      else toast.error(t('errors.unexpected'));
    });

  const roleSelect = (admin: AdminAccount) => {
    const self = admin.userId === currentUserId;
    return (
      <NativeSelect
        aria-label={t('roleFor', { name: admin.name })}
        title={self ? t('ownRole') : undefined}
        value={admin.role}
        disabled={self}
        onChange={(event) => setRoleChange({ target: admin, role: event.target.value as AdminRole })}
        className="w-[170px] [&_select]:md:text-small"
      >
        {ROLES.map((role) => (
          <NativeSelectOption key={role} value={role}>
            {tRoles(role)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  };

  const person = (admin: AdminAccount) => (
    <span className="flex items-center gap-3">
      <InitialsAvatar
        initials={admin.initials}
        size={34}
        tone={admin.status === 'invited' ? 'grey' : admin.role === 'super_admin' ? 'dark' : 'light'}
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">
          {admin.name}
          {admin.userId === currentUserId && (
            <span className="font-normal text-muted-ink"> ({t('you')})</span>
          )}
        </span>
        <span className="truncate text-[13px] text-muted-ink">{admin.email}</span>
      </span>
    </span>
  );

  const lastActiveCell = (admin: AdminAccount) => (
    <span className="flex flex-col text-[13px] whitespace-nowrap">
      {activeText(admin)}
      {admin.status === 'invited' && (
        <button
          type="button"
          onClick={() => resend(admin)}
          className="w-fit cursor-pointer text-left font-medium text-brand-dark hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          {t('resend')}
        </button>
      )}
    </span>
  );

  const columns: Column<AdminAccount>[] = [
    { key: 'person', header: t('columns.person'), cell: person },
    { key: 'role', header: t('columns.role'), cell: roleSelect },
    { key: 'access', header: t('columns.access'), cell: access, className: 'text-[13px] max-w-[260px]' },
    {
      key: 'twoFactor',
      header: t('columns.twoFactor'),
      cell: (admin) => (
        <AdminBadge tone={TWO_FACTOR_TONE[admin.twoFactor]} dot={false}>
          {t(`twoFactor.${admin.twoFactor}`)}
        </AdminBadge>
      ),
    },
    { key: 'lastActive', header: t('columns.lastActive'), cell: lastActiveCell },
  ];

  const rowActions = (admin: AdminAccount) => {
    if (admin.userId === currentUserId) return undefined;
    return (
      <>
        {admin.role === 'event_manager' && (
          <DropdownMenuItem onSelect={() => setRoleChange({ target: admin, role: 'event_manager' })}>
            <CalendarCog aria-hidden />
            {t('menu.editEvents')}
          </DropdownMenuItem>
        )}
        {admin.status === 'invited' && (
          <DropdownMenuItem onSelect={() => resend(admin)}>
            <Mail aria-hidden />
            {t('menu.resend')}
          </DropdownMenuItem>
        )}
        {(admin.role === 'event_manager' || admin.status === 'invited') && <DropdownMenuSeparator />}
        <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(admin)}>
          <Trash2 aria-hidden />
          {t('menu.remove')}
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button size="sm" onClick={() => setInviting(true)}>
            <Plus aria-hidden />
            {t('invite')}
          </Button>
        }
      />
      <TablePanel aria-labelledby="admins-title">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-divider px-4 py-4 md:px-5">
          <h2 id="admins-title" className="text-[16px] font-bold">
            {t('list')}{' '}
            <span className="font-normal text-muted-ink">{t('count', { count: admins.length })}</span>
          </h2>
          <span className="text-[13px] text-muted-ink">{t('twoFactorNote')}</span>
        </div>
        <DataTable
          label={t('list')}
          rows={admins}
          columns={columns}
          rowKey={(admin) => admin.userId}
          rowLabel={(admin) => admin.name}
          rowActions={(admin) => rowActions(admin) ?? null}
          card={(admin) => (
            <div className="flex flex-col gap-2.5">
              {person(admin)}
              <div className="flex flex-wrap items-center gap-2">
                {roleSelect(admin)}
                <AdminBadge tone={TWO_FACTOR_TONE[admin.twoFactor]} dot={false}>
                  {t(`twoFactor.${admin.twoFactor}`)}
                </AdminBadge>
              </div>
              <span className="text-[13px] text-ink-2">{access(admin)}</span>
              {lastActiveCell(admin)}
            </div>
          )}
        />
      </TablePanel>
      {matrix}

      <InviteDialog open={inviting} onOpenChange={setInviting} events={events} />
      <RoleDialog
        target={roleChange?.target ?? null}
        nextRole={roleChange?.role ?? null}
        events={events}
        onClose={() => setRoleChange(null)}
      />
      <RemoveDialog target={removing} onClose={() => setRemoving(null)} />
    </AdminPage>
  );
}
