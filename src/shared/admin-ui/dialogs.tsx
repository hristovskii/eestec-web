'use client';

import { CircleAlert, LoaderCircle, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';
import { Input } from '@/shared/ui/primitives/input';
import { Switch } from '@/shared/ui/primitives/switch';
import { Textarea } from '@/shared/ui/primitives/textarea';

// Admin dialogs (AdminDialogs): centred over a dark scrim, focus moves in, Esc or Cancel closes,
// and the dangerous action is never the default button (focus starts elsewhere).

type AdminDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** danger: red bin (deletes); info: grey "!" (leave without saving). */
  icon?: 'danger' | 'info';
  /** alertdialog: a decision is required (delete, leave); dialog: a form (reject, invite). */
  role?: 'dialog' | 'alertdialog';
  /** Show the × button (alert dialogs without it close with Esc or Cancel). */
  closable?: boolean;
  /** Element that gets focus when the dialog opens (never the dangerous action). */
  initialFocus?: React.RefObject<HTMLElement | null>;
  footer: React.ReactNode;
  footerClassName?: string;
  children?: React.ReactNode;
};

/** Layout shared by every admin dialog: icon, title, text, × · body · buttons on the right. */
export function AdminDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  role = 'dialog',
  closable = true,
  initialFocus,
  footer,
  footerClassName,
  children,
}: AdminDialogProps) {
  const t = useTranslations('admin.ui.dialogs');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        role={role}
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          if (!initialFocus?.current) return;
          event.preventDefault();
          initialFocus.current.focus();
        }}
        className="flex max-w-[480px] flex-col gap-0 p-0 text-small sm:p-0"
      >
        <div className="flex items-start gap-3.5 px-5.5 pt-5.5">
          {icon && (
            <span
              aria-hidden
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                icon === 'danger' ? 'bg-brand-tint text-brand-dark' : 'bg-surface text-ink',
              )}
            >
              {icon === 'danger' ? <Trash2 className="size-5" /> : <CircleAlert className="size-5" />}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogTitle className="text-[18px] leading-[1.35] font-bold">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-small text-muted-ink">{description}</DialogDescription>
            ) : (
              // Radix wants a description; an empty one keeps screen readers quiet.
              <DialogDescription className="sr-only" />
            )}
          </div>
          {closable && (
            <DialogClose
              aria-label={t('close')}
              className="-mt-1 -mr-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-ink hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              <X className="size-4" aria-hidden />
            </DialogClose>
          )}
        </div>
        {children && (
          <div className={cn('flex flex-col gap-3.5 px-5.5 pt-4', icon && 'sm:pl-[76px]')}>{children}</div>
        )}
        <div
          className={cn(
            'flex flex-col-reverse gap-2 px-5.5 pt-5 pb-5.5 sm:flex-row sm:justify-end',
            footerClassName,
          )}
        >
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Pending({ label }: { label: string }) {
  return (
    <>
      <LoaderCircle className="animate-spin" aria-hidden />
      {label}
    </>
  );
}

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. Delete “Workshop: AI at the Edge”? */
  title: React.ReactNode;
  /** What else goes with it, and "This can't be undone." */
  description: React.ReactNode;
  /** e.g. "Delete event". */
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  /** The word to type; DELETE by default. */
  confirmWord?: string;
  /** Extra content under the input, e.g. "Export the 38 applications first (CSV)". */
  children?: React.ReactNode;
};

/** Delete with "Type DELETE to confirm": the button stays disabled until the word matches. */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  confirmWord = 'DELETE',
  children,
}: ConfirmDeleteDialogProps) {
  const t = useTranslations('admin.ui.dialogs');
  const [typed, setTyped] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();

  const change = (next: boolean) => {
    if (pending) return;
    if (!next) setTyped('');
    onOpenChange(next);
  };
  const confirm = (event: React.FormEvent) => {
    event.preventDefault();
    if (typed.trim() !== confirmWord) return;
    startTransition(async () => {
      await onConfirm();
      setTyped('');
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={change}
      role="alertdialog"
      icon="danger"
      title={title}
      description={description}
      initialFocus={inputRef}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => change(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form={id}
            variant="danger"
            size="sm"
            disabled={typed.trim() !== confirmWord || pending}
            aria-busy={pending || undefined}
          >
            {pending ? <Pending label={t('deleting')} /> : confirmLabel}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={confirm} className="flex flex-col gap-3.5">
        <FormField
          id={`${id}-word`}
          label={t.rich('typeToConfirm', {
            word: confirmWord,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        >
          {(control) => (
            <Input
              {...control}
              ref={inputRef}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="text-small"
            />
          )}
        </FormField>
        {children}
      </form>
    </AdminDialog>
  );
}

export type RejectInput = { presets: string[]; reason: string; notify: boolean };

type RejectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Reject this Memory?" */
  title: React.ReactNode;
  /** What is being rejected: “Seven days, 28 nationalities…” by Marija Stojanovska. */
  description?: React.ReactNode;
  /** Quick reasons, shown as toggle chips. */
  presets: string[];
  onReject: (input: RejectInput) => void | Promise<void>;
};

/** Reject with quick reasons, an optional text and "E-mail the reason to the author" (on). */
export function RejectDialog({
  open,
  onOpenChange,
  title,
  description,
  presets,
  onReject,
}: RejectDialogProps) {
  const t = useTranslations('admin.ui.dialogs');
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [reason, setReason] = React.useState('');
  const [notify, setNotify] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const id = React.useId();

  const reset = () => {
    setChosen([]);
    setReason('');
    setNotify(true);
  };
  const change = (next: boolean) => {
    if (pending) return;
    if (!next) reset();
    onOpenChange(next);
  };
  const toggle = (preset: string) =>
    setChosen((list) => (list.includes(preset) ? list.filter((p) => p !== preset) : [...list, preset]));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      await onReject({ presets: chosen, reason: reason.trim(), notify });
      reset();
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={change}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => change(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form={id}
            variant="danger"
            size="sm"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? <Pending label={t('rejecting')} /> : t('reject')}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} className="flex flex-col gap-3.5">
        <div role="group" aria-label={t('presets')} className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const on = chosen.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(preset)}
                className={cn(
                  'inline-flex h-[30px] cursor-pointer items-center rounded-full border px-3 text-[13px] font-medium',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  on
                    ? 'border-2 border-brand bg-brand-tint px-[11px] text-brand-dark'
                    : 'border-line-input bg-white text-ink hover:border-ink',
                )}
              >
                {preset}
              </button>
            );
          })}
        </div>
        <FormField id={`${id}-reason`} label={t('reason')} optional>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-0 text-small"
            />
          )}
        </FormField>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${id}-notify`} className="cursor-pointer">
            {t('emailReason')}
          </label>
          <Switch id={`${id}-notify`} size="sm" checked={notify} onCheckedChange={setNotify} />
        </div>
      </form>
    </AdminDialog>
  );
}

type UnsavedChangesDialogProps = {
  open: boolean;
  /** "Stay on page" and Esc. */
  onStay: () => void;
  onDiscard: () => void;
  /** Save as draft, then leave. Hidden when the screen has no draft (e.g. settings). */
  onSaveAndLeave?: () => void | Promise<void>;
  /** e.g. “Workshop: AI at the Edge”. */
  itemTitle?: string;
};

/** Leaving an edit screen with unsaved changes (see useUnsavedChanges). Focus starts on "Stay". */
export function UnsavedChangesDialog({
  open,
  onStay,
  onDiscard,
  onSaveAndLeave,
  itemTitle,
}: UnsavedChangesDialogProps) {
  const t = useTranslations('admin.ui.dialogs');
  const stayRef = React.useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onStay()}
      role="alertdialog"
      icon="info"
      closable={false}
      title={t('leaveTitle')}
      description={itemTitle ? t('leaveText', { title: itemTitle }) : t('leaveTextUntitled')}
      initialFocus={stayRef}
      footerClassName="sm:justify-between"
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            className="text-brand-dark"
            onClick={onDiscard}
            disabled={pending}
          >
            {t('discardChanges')}
          </Button>
          <span className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button ref={stayRef} variant="quiet" size="sm" onClick={onStay} disabled={pending}>
              {t('stay')}
            </Button>
            {onSaveAndLeave && (
              <Button
                size="sm"
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={() => startTransition(async () => onSaveAndLeave())}
              >
                {t('saveAndLeave')}
              </Button>
            )}
          </span>
        </>
      }
    />
  );
}
