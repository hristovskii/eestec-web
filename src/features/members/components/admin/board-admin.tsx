'use client';

import { LoaderCircle, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminBadge } from '@/shared/admin-ui/admin-page';
import { AdminDialog, ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { SwitchRow } from '@/shared/admin-ui/form-section';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { FieldErrors } from '@/shared/forms/action-result';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import {
  deleteMandate,
  deleteSeat,
  reorderSeats,
  saveMandate,
  saveSeat,
} from '../../actions/admin-structure';
import { mandateSchema, seatSchema, STRUCTURE_LIMITS } from '../../schemas/structure.schema';
import type { BoardMandate, BoardPerson, BoardSeat } from '../../types';

type Role = { id: string; title: string; email: string };

const KNOWN = ['required', 'tooLong', 'date', 'orderEnd', 'duplicate', 'label', 'person'];

type BoardAdminProps = {
  mandates: BoardMandate[];
  people: BoardPerson[];
  roles: Role[];
  /** The board label in the address (`?board=`), if any. */
  selected: string | undefined;
  canEdit: boolean;
};

/** Admin › Members › Board: the boards by year and the seats on each. */
export function BoardAdmin({ mandates, people, roles, selected, canEdit }: BoardAdminProps) {
  const t = useTranslations('admin.members.board');
  const { update } = useUrlParams();
  const mandate = mandates.find((item) => item.label === selected) ?? mandates[0];
  const [seats, setSeats] = React.useState(mandate?.seats ?? []);
  const [lastMandate, setLastMandate] = React.useState(mandate);
  if (mandate !== lastMandate) {
    setLastMandate(mandate);
    setSeats(mandate?.seats ?? []);
  }
  const [editingMandate, setEditingMandate] = React.useState<{
    mandate: BoardMandate | null;
    key: number;
  } | null>(null);
  const [editingSeat, setEditingSeat] = React.useState<{ seat: BoardSeat | null; key: number } | null>(null);
  const [deletingMandate, setDeletingMandate] = React.useState(false);
  const [removingSeat, setRemovingSeat] = React.useState<BoardSeat | null>(null);
  const opened = React.useRef(0);
  const nameOf = (userId: string) => people.find((person) => person.userId === userId)?.name ?? userId;

  const reorder = (next: BoardSeat[]) => {
    if (!mandate) return;
    setSeats(next);
    void reorderSeats({ mandateId: mandate.id, seatIds: next.map((seat) => seat.id) }).then((result) => {
      if (result.ok) toast.success(t('toasts.reordered'));
      else {
        setSeats(mandate.seats);
        toast.error(t('toasts.unexpected'));
      }
    });
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="board-title" className="text-[18px] font-bold">
          {t('title')}
        </h2>
        <p className="max-w-[640px] text-small text-muted-ink">{t('text')}</p>
        <p className="text-small text-muted-ink">
          {t.rich('roles', {
            link: (chunks) => (
              <Link href="/admin/settings" className="font-medium text-brand-dark">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
      {canEdit && (
        <Button
          size="sm"
          variant={mandate ? 'quiet' : 'primary'}
          onClick={() => setEditingMandate({ mandate: null, key: ++opened.current })}
        >
          <Plus aria-hidden />
          {t('new')}
        </Button>
      )}
    </div>
  );

  if (!mandate) {
    return (
      <section aria-labelledby="board-title" className="flex flex-col gap-4 p-4 md:p-5">
        {header}
        <EmptyState variant="admin" icon={<UserRound />} title={t('noBoards.title')}>
          {t('noBoards.text')}
        </EmptyState>
        {editingMandate && (
          <MandateDialog
            key={editingMandate.key}
            mandate={null}
            open
            onOpenChange={(next) => !next && setEditingMandate(null)}
          />
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="board-title" className="flex flex-col gap-4 p-4 md:p-5">
      {header}
      <div className="flex flex-wrap items-end gap-3">
        <FormField id="board-pick" label={t('show')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={mandate.label}
              className="w-[220px]"
              onChange={(event) =>
                update({ board: event.target.value === mandates[0]?.label ? null : event.target.value })
              }
            >
              {mandates.map((item) => (
                <NativeSelectOption key={item.id} value={item.label}>
                  {item.label}
                  {item.isCurrent ? ` (${t('current')})` : ''}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        {mandate.isCurrent && <AdminBadge tone="dark">{t('current')}</AdminBadge>}
        {canEdit && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setEditingMandate({ mandate, key: ++opened.current })}
            >
              <Pencil aria-hidden />
              {t('editBoard')}
            </Button>
            <Button variant="dangerOutline" size="sm" onClick={() => setDeletingMandate(true)}>
              <Trash2 aria-hidden />
              {t('deleteBoard')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-bold">{t('seats')}</h3>
        {canEdit && (
          <Button size="sm" onClick={() => setEditingSeat({ seat: null, key: ++opened.current })}>
            <Plus aria-hidden />
            {t('addSeat')}
          </Button>
        )}
      </div>
      {seats.length === 0 ? (
        <EmptyState variant="admin" icon={<UserRound />} title={t('empty.title')}>
          {t('empty.text')}
        </EmptyState>
      ) : (
        <SortableList
          items={seats}
          label={t('seats')}
          itemName={(seat) => seat.title}
          onReorder={reorder}
          className="flex flex-col gap-2"
          renderItem={(seat, handle) => (
            <div className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2.5">
              {canEdit && handle}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[12px] font-bold tracking-[0.04em] text-brand-dark uppercase">
                  {seat.title}
                </span>
                <strong className="font-medium">{nameOf(seat.userId)}</strong>
                <span className="text-[13px] text-muted-ink">
                  {mandate.isCurrent
                    ? (roles.find((role) => role.id === seat.boardRoleId)?.email ?? t('noEmail'))
                    : t('noEmail')}
                </span>
              </span>
              {canEdit && (
                <>
                  <Button
                    variant="quiet"
                    size="sm"
                    aria-label={`${t('edit')} ${seat.title}`}
                    onClick={() => setEditingSeat({ seat, key: ++opened.current })}
                  >
                    <Pencil aria-hidden />
                    {t('edit')}
                  </Button>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    aria-label={`${t('remove')} ${seat.title}`}
                    onClick={() => setRemovingSeat(seat)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </>
              )}
            </div>
          )}
        />
      )}

      {editingMandate && (
        <MandateDialog
          key={editingMandate.key}
          mandate={editingMandate.mandate}
          open
          onOpenChange={(next) => !next && setEditingMandate(null)}
        />
      )}
      {editingSeat && (
        <SeatDialog
          key={editingSeat.key}
          mandateId={mandate.id}
          seat={editingSeat.seat}
          people={people}
          roles={roles}
          open
          onOpenChange={(next) => !next && setEditingSeat(null)}
        />
      )}
      {mandate.isCurrent ? (
        <AdminDialog
          open={deletingMandate}
          onOpenChange={setDeletingMandate}
          role="alertdialog"
          icon="info"
          title={t('deleteMandate.currentTitle', { label: mandate.label })}
          description={t('deleteMandate.currentText')}
          footer={
            <Button size="sm" onClick={() => setDeletingMandate(false)}>
              {t('deleteMandate.ok')}
            </Button>
          }
        />
      ) : (
        <ConfirmDeleteDialog
          open={deletingMandate}
          onOpenChange={setDeletingMandate}
          title={t('deleteMandate.title', { label: mandate.label })}
          description={t('deleteMandate.text')}
          confirmLabel={t('deleteMandate.confirm')}
          onConfirm={async () => {
            const result = await deleteMandate(mandate.id);
            if (result.ok) {
              toast.success(t('toasts.mandateDeleted'));
              setDeletingMandate(false);
              update({ board: null });
            } else toast.error(t(result.error === 'not_found' ? 'toasts.notFound' : 'toasts.unexpected'));
          }}
        />
      )}
      <ConfirmDeleteDialog
        open={removingSeat !== null}
        onOpenChange={(next) => !next && setRemovingSeat(null)}
        title={removingSeat ? `${t('remove')} ${removingSeat.title}?` : ''}
        description={removingSeat ? nameOf(removingSeat.userId) : ''}
        confirmLabel={t('remove')}
        confirmWord="REMOVE"
        onConfirm={async () => {
          if (!removingSeat) return;
          const result = await deleteSeat({ mandateId: mandate.id, seatId: removingSeat.id });
          if (result.ok) {
            toast.success(t('toasts.seatRemoved'));
            setRemovingSeat(null);
          } else toast.error(t(result.error === 'not_found' ? 'toasts.notFound' : 'toasts.unexpected'));
        }}
      />
    </section>
  );
}

function MandateDialog({
  mandate,
  open,
  onOpenChange,
}: {
  mandate: BoardMandate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.members.board');
  const tErrors = useTranslations('admin.members.errors');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const { update } = useUrlParams();
  const id = React.useId();
  const [values, setValues] = React.useState({
    label: mandate?.label ?? '',
    startsOn: mandate?.startsOn ?? '',
    endsOn: mandate?.endsOn ?? '',
    isCurrent: mandate?.isCurrent ?? false,
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const error = (field: string) => {
    const key = errors[field]?.[0];
    return key ? tErrors(KNOWN.includes(key) ? (key as 'required') : 'unexpected') : undefined;
  };
  const edit = (patch: Partial<typeof values>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field];
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const checked = mandateSchema.safeParse(values);
    if (!checked.success) {
      const next: FieldErrors = {};
      for (const issue of checked.error.issues) (next[String(issue.path[0])] ??= []).push(issue.message);
      setErrors(next);
      return;
    }
    startTransition(async () => {
      const result = await saveMandate({ id: mandate?.id, mandate: checked.data });
      if (result.ok) {
        toast.success(t(mandate ? 'toasts.mandateUpdated' : 'toasts.mandateCreated'));
        onOpenChange(false);
        update({ board: result.data.isCurrent ? null : result.data.label });
      } else if (result.error === 'validation') setErrors(result.fieldErrors);
      else toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
    });
  };
  const locked = mandate?.isCurrent ?? false;

  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={mandate ? t('mandate.editTitle', { label: mandate.label }) : t('mandate.addTitle')}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button type="submit" form={id} size="sm" disabled={pending} aria-busy={pending || undefined}>
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                {t('mandate.saving')}
              </>
            ) : (
              t('mandate.save')
            )}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <FormField
          id={`${id}-label`}
          label={t('mandate.label')}
          required
          help={t('mandate.labelHelp')}
          error={error('label')}
        >
          {(control) => (
            <Input
              {...control}
              value={values.label}
              placeholder="2026/2027"
              autoComplete="off"
              onChange={(event) => edit({ label: event.target.value })}
            />
          )}
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id={`${id}-startsOn`} label={t('mandate.startsOn')} required error={error('startsOn')}>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.startsOn}
                onChange={(event) => edit({ startsOn: event.target.value })}
              />
            )}
          </FormField>
          <FormField id={`${id}-endsOn`} label={t('mandate.endsOn')} required error={error('endsOn')}>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.endsOn}
                onChange={(event) => edit({ endsOn: event.target.value })}
              />
            )}
          </FormField>
        </div>
        <div className="flex flex-col gap-1.5 rounded-md bg-surface p-3.5">
          <SwitchRow
            id={`${id}-current`}
            label={t('mandate.current')}
            checked={values.isCurrent}
            disabled={locked}
            onChange={(isCurrent) => edit({ isCurrent })}
          />
          <p className="text-[13px] text-muted-ink">
            {locked ? t('mandate.currentLocked') : t('mandate.currentHelp')}
          </p>
        </div>
      </form>
    </AdminDialog>
  );
}

function SeatDialog({
  mandateId,
  seat,
  people,
  roles,
  open,
  onOpenChange,
}: {
  mandateId: string;
  seat: BoardSeat | null;
  people: BoardPerson[];
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.members.board');
  const tErrors = useTranslations('admin.members.errors');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const id = React.useId();
  const [values, setValues] = React.useState({
    boardRoleId: seat?.boardRoleId ?? roles[0]?.id ?? '',
    title: seat?.title ?? roles[0]?.title ?? '',
    userId: seat?.userId ?? '',
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const error = (field: string) => {
    const key = errors[field]?.[0];
    return key ? tErrors(KNOWN.includes(key) ? (key as 'required') : 'unexpected') : undefined;
  };
  const edit = (patch: Partial<typeof values>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field];
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const checked = seatSchema.safeParse({ ...values, userId: values.userId || undefined });
    if (!checked.success) {
      const next: FieldErrors = {};
      for (const issue of checked.error.issues) {
        const field = String(issue.path[0]);
        (next[field] ??= []).push(field === 'userId' ? 'person' : issue.message);
      }
      setErrors(next);
      return;
    }
    startTransition(async () => {
      const result = await saveSeat({ mandateId, seatId: seat?.id, seat: checked.data });
      if (result.ok) {
        toast.success(t('toasts.seatSaved'));
        onOpenChange(false);
      } else if (result.error === 'validation') setErrors(result.fieldErrors);
      else toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={seat ? t('seat.editTitle') : t('seat.addTitle')}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button type="submit" form={id} size="sm" disabled={pending} aria-busy={pending || undefined}>
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                {t('seat.saving')}
              </>
            ) : (
              t('seat.save')
            )}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <FormField id={`${id}-role`} label={t('seat.role')} required error={error('boardRoleId')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.boardRoleId}
              onChange={(event) => {
                const role = roles.find((item) => item.id === event.target.value);
                // A new position suggests its title; the board may still write its own.
                edit({ boardRoleId: event.target.value, ...(role && !seat ? { title: role.title } : {}) });
              }}
            >
              {roles.map((role) => (
                <NativeSelectOption key={role.id} value={role.id}>
                  {role.title} · {role.email}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField
          id={`${id}-title`}
          label={t('seat.title')}
          required
          help={t('seat.titleHelp')}
          error={error('title')}
        >
          {(control) => (
            <Input
              {...control}
              value={values.title}
              maxLength={STRUCTURE_LIMITS.title}
              autoComplete="off"
              onChange={(event) => edit({ title: event.target.value })}
            />
          )}
        </FormField>
        <FormField id={`${id}-person`} label={t('seat.person')} required error={error('userId')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.userId}
              onChange={(event) => edit({ userId: event.target.value })}
            >
              <NativeSelectOption value="">{t('seat.choose')}</NativeSelectOption>
              {people.map((person) => (
                <NativeSelectOption key={person.userId} value={person.userId}>
                  {person.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </form>
    </AdminDialog>
  );
}
