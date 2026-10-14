'use client';

import { Archive, CheckCheck, Mail, MailOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { ActionResult } from '@/shared/forms/action-result';
import { Button } from '@/shared/ui/primitives/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

// The controls of the Inbox (AdminInbox): they call the Server Actions of the list they belong to
// (passed in by the page) and say what happened in a toast. The action refreshes the page, so the
// list, the counts and the detail show the new state.

type Option = { value: string; label: string };
type StatusAction = (input: { id: string; status: string }) => Promise<ActionResult<unknown>>;
type ReadAction = (input: { id: string; read: boolean }) => Promise<ActionResult<unknown>>;

function useFailure() {
  const t = useTranslations('admin.inbox.toasts');
  return (result: ActionResult<unknown> | null) =>
    toast.error(result && !result.ok && result.error === 'forbidden' ? t('forbidden') : t('error'));
}

/** "New / Answered / Archived" in the detail header. */
export function StatusSelect({
  id,
  value,
  options,
  action,
  disabled,
}: {
  id: string;
  value: string;
  options: Option[];
  action: StatusAction;
  disabled?: boolean;
}) {
  const t = useTranslations('admin.inbox');
  const fail = useFailure();
  const [current, setCurrent] = React.useState(value);
  const [pending, startTransition] = React.useTransition();
  return (
    <NativeSelect
      aria-label={t('detail.status')}
      value={current}
      disabled={disabled || pending}
      className="w-36"
      onChange={(event) => {
        const status = event.target.value;
        const before = current;
        setCurrent(status);
        startTransition(async () => {
          const result = await action({ id, status }).catch(() => null);
          if (result?.ok) {
            toast.success(
              t('toasts.statusChanged', { status: options.find((o) => o.value === status)?.label ?? status }),
            );
            return;
          }
          setCurrent(before);
          fail(result);
        });
      }}
    >
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** A button that moves the item to one status ("Mark as answered", "Archive"). */
export function StatusButton({
  id,
  status,
  label,
  action,
  icon,
  disabled,
  variant = 'quiet',
}: {
  id: string;
  status: string;
  label: string;
  action: StatusAction;
  /** archive: a square icon button with the label as its name. */
  icon?: 'archive';
  disabled?: boolean;
  variant?: 'quiet' | 'ghost';
}) {
  const t = useTranslations('admin.inbox.toasts');
  const fail = useFailure();
  const [pending, startTransition] = React.useTransition();
  const run = () =>
    startTransition(async () => {
      const result = await action({ id, status }).catch(() => null);
      if (result?.ok) toast.success(t('statusChanged', { status: label }));
      else fail(result);
    });
  if (icon === 'archive')
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        disabled={disabled || pending}
        onClick={run}
      >
        <Archive aria-hidden />
      </Button>
    );
  return (
    <Button variant={variant} disabled={disabled || pending} onClick={run}>
      {label}
    </Button>
  );
}

/** "Mark as unread" / "Mark as read" (the envelope in the detail header). */
export function ReadToggle({ id, unread, action }: { id: string; unread: boolean; action: ReadAction }) {
  const t = useTranslations('admin.inbox.detail');
  const fail = useFailure();
  const [pending, startTransition] = React.useTransition();
  const label = unread ? t('markRead') : t('markUnread');
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action({ id, read: unread }).catch(() => null);
          if (!result?.ok) fail(result);
        })
      }
    >
      {unread ? <MailOpen aria-hidden /> : <Mail aria-hidden />}
    </Button>
  );
}

/** Opening an unread item marks it read (it stays "new" until someone handles it). */
export function MarkReadOnOpen({ id, unread, action }: { id: string; unread: boolean; action: ReadAction }) {
  React.useEffect(() => {
    if (unread) void action({ id, read: true });
    // Only when another item is opened, not when the read mark changes later (that is the toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}

/** "Mark all as read" in the toolbar. */
export function MarkAllReadButton({
  action,
  disabled,
}: {
  action: () => Promise<ActionResult<{ changed: number }>>;
  disabled?: boolean;
}) {
  const t = useTranslations('admin.inbox');
  const fail = useFailure();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="ml-auto"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action().catch(() => null);
          if (result?.ok) toast.success(t('toasts.allRead', { count: result.data.changed }));
          else fail(result);
        })
      }
    >
      <CheckCheck aria-hidden />
      {t('markAllRead')}
    </Button>
  );
}
