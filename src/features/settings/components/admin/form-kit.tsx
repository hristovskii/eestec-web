'use client';

import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Switch } from '@/shared/ui/primitives/switch';

import type { SettingsInput } from '../../types';

/** What every Settings section gets from the form. */
export type SectionProps = {
  values: SettingsInput;
  /** Change the values (the draft is a copy; mutate it). */
  update: (recipe: (draft: SettingsInput) => void) => void;
  /** Translated error of a field path ("boardRoles.2.email"), if any. */
  error: (path: string) => string | undefined;
};

/** Field ids follow the value path, so the error summary can link to them. */
export const fieldId = (path: string) => `s-${path.replace(/\.(mk|en)$/, '').replaceAll('.', '-')}`;

/** A white panel with a title row (AdminSettings `.panel` + `.card-h`). */
export function SettingsPanel({
  id,
  title,
  aside,
  children,
  flush,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  /** No body padding (tables). */
  flush?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 overflow-hidden rounded-md border border-line bg-white lg:scroll-mt-40"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-divider px-4 py-4 md:px-5">
        <h2 id={`${id}-title`} className="text-[16px] font-bold">
          {title}
        </h2>
        {aside && <span className="text-[13px] text-muted-ink">{aside}</span>}
      </div>
      <div className={cn(!flush && 'flex flex-col gap-4.5 p-4 md:p-5')}>{children}</div>
    </section>
  );
}

/** A switch with its label on the left, the whole row clickable (AdminSettings `.sw`). */
export function SwitchRow({
  id,
  label,
  checked,
  onChange,
  className,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <label htmlFor={id} className="cursor-pointer text-small">
        {label}
      </label>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
