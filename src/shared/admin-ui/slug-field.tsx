'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { FieldError } from '@/shared/ui/form/form-field';

/**
 * "Page address" (AdminEventEdit): the fixed part of the URL, then the slug. The feature makes
 * the slug from the title until someone edits it by hand.
 */
export function SlugField({
  id,
  label,
  prefix,
  value,
  onChange,
  error,
  help,
  required,
}: {
  id: string;
  label: string;
  /** "eestec.mk/upcoming/" */
  prefix: string;
  value: string;
  onChange: (slug: string) => void;
  error?: string;
  help?: React.ReactNode;
  required?: boolean;
}) {
  const t = useTranslations('admin.ui.slug');
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-small font-medium text-ink">
        {label}
        {required && (
          <span className="text-brand-dark" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      <div
        className={cn(
          'flex h-(--control-h,48px) items-stretch overflow-hidden rounded-sm border bg-white',
          'has-[input:focus]:border-brand has-[input:focus]:ring-3 has-[input:focus]:ring-brand/25',
          error ? 'border-2 border-brand' : 'border-line-input',
        )}
      >
        <span
          aria-hidden
          className="flex max-w-[55%] items-center truncate border-r border-line-strong bg-surface px-3 text-small whitespace-nowrap text-muted-ink"
        >
          {prefix}
        </span>
        <input
          id={id}
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={[error && errorId, helpId].filter(Boolean).join(' ')}
          // Typing keeps it a valid address: lowercase, spaces become hyphens.
          onChange={(event) => onChange(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
          className="min-w-0 flex-1 px-3 text-small outline-none"
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <span id={helpId} className="mt-1.5 text-small text-muted-ink">
        <span className="sr-only">
          {prefix}
          {value}.{' '}
        </span>
        {help ?? t('help')}
      </span>
    </div>
  );
}
