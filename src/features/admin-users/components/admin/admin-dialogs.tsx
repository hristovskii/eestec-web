'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { AdminAccount, AdminRole } from '@/features/auth';
import type { EventOption } from '@/features/events';
import { AdminDialog } from '@/shared/admin-ui/dialogs';
import type { ActionResult } from '@/shared/forms/action-result';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { changeAdmin, inviteAdmin, removeAdminAccess } from '../../actions/admin-users';
import { EventChips } from './event-chips';

export const ROLES: AdminRole[] = ['event_manager', 'editor', 'super_admin'];

type Translate = ReturnType<typeof useTranslations<'admin.users'>>;
const KNOWN_ERRORS = [
  'required',
  'email',
  'tooLong',
  'eventsRequired',
  'unknownEvent',
  'alreadyAdmin',
  'self',
  'lastSuperAdmin',
  'forbidden',
  'not_found',
];
const errorText = (t: Translate, key: string | undefined) =>
  t(`errors.${KNOWN_ERRORS.includes(key ?? '') ? key : 'unexpected'}` as Parameters<Translate>[0]);

/** A failed action as a toast (validation errors are shown at their fields instead). */
function toastFailure(t: Translate, result: Exclude<ActionResult<unknown>, { ok: true }>) {
  toast.error(errorText(t, result.error === 'conflict' ? result.message : result.error));
}

function Busy({ label }: { label: string }) {
  return (
    <>
      <LoaderCircle className="animate-spin" aria-hidden />
      {label}
    </>
  );
}

/** AdminDialogs › 4 · Invite an admin. */
export function InviteDialog({
  open,
  onOpenChange,
  events,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: EventOption[];
}) {
  const t = useTranslations('admin.users');
  const tRoles = useTranslations('admin.roles');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const empty = { name: '', email: '', role: 'event_manager' as AdminRole, managedEventIds: [] as string[] };
  const [values, setValues] = React.useState(empty);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();

  // Changing a field clears its error (the next send checks again).
  const edit = (patch: Partial<typeof empty>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field];
      return next;
    });
  };

  const close = (next: boolean) => {
    if (pending) return;
    if (!next) {
      setValues(empty);
      setErrors({});
    }
    onOpenChange(next);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await inviteAdmin(values);
      if (result.ok) {
        toast.success(t('inviteDialog.sent', { email: result.data.email }));
        setValues(empty);
        setErrors({});
        onOpenChange(false);
        return;
      }
      if (result.error === 'validation') {
        const next = Object.fromEntries(
          Object.entries(result.fieldErrors).map(([field, keys]) => [field, errorText(t, keys[0])]),
        );
        setErrors(next);
        // Focus the first field with an error.
        const first = ['name', 'email', 'managedEventIds'].find((field) => next[field]);
        if (first) document.getElementById(`${id}-${first}`)?.focus();
      } else toastFailure(t, result);
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={close}
      title={t('inviteDialog.title')}
      description={t('inviteDialog.text')}
      initialFocus={nameRef}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => close(false)} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button type="submit" form={id} size="sm" disabled={pending} aria-busy={pending || undefined}>
            {pending ? <Busy label={t('inviteDialog.sending')} /> : t('inviteDialog.send')}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id={`${id}-name`} label={t('inviteDialog.name')} error={errors.name}>
            {(control) => (
              <Input
                {...control}
                ref={nameRef}
                autoComplete="off"
                value={values.name}
                onChange={(event) => edit({ name: event.target.value })}
                className="md:text-small"
              />
            )}
          </FormField>
          <FormField id={`${id}-email`} label={t('inviteDialog.email')} error={errors.email}>
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="off"
                value={values.email}
                onChange={(event) => edit({ email: event.target.value })}
                className="md:text-small"
              />
            )}
          </FormField>
        </div>
        <FormField id={`${id}-role`} label={t('inviteDialog.role')}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.role}
              onChange={(event) => edit({ role: event.target.value as AdminRole })}
              className="[&_select]:md:text-small"
            >
              {ROLES.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {tRoles(role)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        {values.role === 'event_manager' && (
          <EventChips
            id={`${id}-managedEventIds`}
            label={t('inviteDialog.events')}
            options={events}
            value={values.managedEventIds}
            onChange={(managedEventIds) => edit({ managedEventIds })}
            error={errors.managedEventIds}
          />
        )}
      </form>
    </AdminDialog>
  );
}

/**
 * Confirms a role change (and picks events for event managers), or edits an event manager's
 * events (`nextRole` = their current role).
 */
export function RoleDialog({
  target,
  nextRole,
  events,
  onClose,
}: {
  target: AdminAccount | null;
  nextRole: AdminRole | null;
  events: EventOption[];
  onClose: () => void;
}) {
  const t = useTranslations('admin.users');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const tSave = useTranslations('admin.ui.saveBar');
  const [managedEventIds, setManagedEventIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const id = React.useId();

  // A new target: start from their current events.
  const [lastTarget, setLastTarget] = React.useState(target);
  if (target !== lastTarget) {
    setLastTarget(target);
    setManagedEventIds(target?.managedEventIds ?? []);
    setError(undefined);
  }

  if (!target || !nextRole) return null;
  const onlyEvents = nextRole === target.role;
  const explanation = {
    super_admin: 'toSuper',
    editor: 'toEditor',
    event_manager: 'toEventManager',
  } as const;

  const confirm = () =>
    startTransition(async () => {
      const result = await changeAdmin({ userId: target.userId, role: nextRole, managedEventIds });
      if (result.ok) {
        toast.success(
          onlyEvents
            ? t('roleDialog.eventsSaved', { name: target.name })
            : t('roleDialog.changed', { name: target.name, role: nextRole }),
        );
        onClose();
      } else if (result.error === 'validation')
        setError(errorText(t, result.fieldErrors.managedEventIds?.[0]));
      else toastFailure(t, result);
    });

  return (
    <AdminDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={
        onlyEvents
          ? t('roleDialog.eventsTitle', { name: target.name })
          : t('roleDialog.title', { name: target.name, role: nextRole })
      }
      description={t(`roleDialog.${explanation[nextRole]}`)}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={onClose} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button size="sm" onClick={confirm} disabled={pending} aria-busy={pending || undefined}>
            {pending ? (
              <Busy label={tSave('saving')} />
            ) : onlyEvents ? (
              t('roleDialog.saveEvents')
            ) : (
              t('roleDialog.confirm')
            )}
          </Button>
        </>
      }
    >
      {nextRole === 'event_manager' && (
        <EventChips
          id={`${id}-events`}
          label={t('inviteDialog.events')}
          options={events}
          value={managedEventIds}
          onChange={(ids) => {
            setManagedEventIds(ids);
            setError(undefined);
          }}
          error={error}
        />
      )}
    </AdminDialog>
  );
}

/** Remove admin access (not a data delete: no "type DELETE", but the danger button is not default). */
export function RemoveDialog({ target, onClose }: { target: AdminAccount | null; onClose: () => void }) {
  const t = useTranslations('admin.users');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = React.useTransition();
  if (!target) return null;
  const remove = () =>
    startTransition(async () => {
      const result = await removeAdminAccess({ userId: target.userId });
      if (result.ok) {
        toast.success(t('removeDialog.removed', { name: target.name }));
        onClose();
      } else toastFailure(t, result);
    });
  return (
    <AdminDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      role="alertdialog"
      icon="danger"
      initialFocus={cancelRef}
      title={t('removeDialog.title', { name: target.name })}
      description={target.status === 'invited' ? t('removeDialog.textInvite') : t('removeDialog.text')}
      footer={
        <>
          <Button ref={cancelRef} variant="quiet" size="sm" onClick={onClose} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={remove}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {t('removeDialog.confirm')}
          </Button>
        </>
      }
    />
  );
}
