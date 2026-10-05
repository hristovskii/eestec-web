import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/** Props a control needs to be wired to its label, help and error. */
export type ControlProps = {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
  required?: boolean;
};

type FormFieldProps = {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  /** Shows "· optional" after the label (forms where most fields are required). */
  optional?: boolean;
  help?: React.ReactNode;
  error?: string;
  /** e.g. "112 / 1,500", shown right-aligned in the help row. */
  counter?: React.ReactNode;
  className?: string;
  children: (control: ControlProps) => React.ReactNode;
};

/**
 * One field style everywhere: label above, help text, error with icon + text (never colour alone),
 * red focus ring on the control (Main › Form fields).
 */
export function FormField({
  id,
  label,
  required,
  optional,
  help,
  error,
  counter,
  className,
  children,
}: FormFieldProps) {
  const t = useTranslations('ui.form');
  const helpId = help || counter ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={id} className="mb-1.5 block text-small font-medium text-ink">
        {label}
        {required && (
          <span className="text-brand-dark" aria-hidden>
            {' '}
            *
          </span>
        )}
        {optional && <span className="font-normal text-muted-ink"> · {t('optional')}</span>}
      </label>
      {children({
        id,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {(help || counter) && (
        <span id={helpId} className="mt-1.5 flex items-start justify-between gap-3 text-small text-muted-ink">
          <span>{help}</span>
          {counter && <span className="shrink-0 tabular-nums">{counter}</span>}
        </span>
      )}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <span id={id} className="mt-1.5 flex items-center gap-1.5 text-small font-medium text-brand-dark">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** Wrapper card for public forms: padding 36 (20 mobile), radius 16, border, soft shadow. */
export function FormCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border border-line bg-white p-5 shadow-form sm:p-9', className)}
      {...props}
    />
  );
}
