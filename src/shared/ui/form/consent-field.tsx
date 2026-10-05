import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { Checkbox } from './choice';
import { FieldError } from './form-field';

type ConsentFieldProps = Omit<React.ComponentProps<'input'>, 'type' | 'children'> & {
  id: string;
  children: React.ReactNode;
  error?: string;
};

/** Consent checkbox, required on every public form (decided rule). Grey box; pink + red border on error. */
export function ConsentField({ id, children, error, className, ...props }: ConsentFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-md px-4 py-3.5 text-small',
          error ? 'border-2 border-brand bg-brand-tint' : 'bg-surface',
        )}
      >
        <span className="flex h-[21px] items-center">
          <Checkbox id={id} aria-invalid={error ? true : undefined} aria-describedby={errorId} {...props} />
        </span>
        <span>{children}</span>
      </label>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
