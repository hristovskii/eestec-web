'use client';

import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Switch } from '@/shared/ui/primitives/switch';

// Edit screens (AdminEventEdit, AdminSettings): white panels with a title row, a main column and
// a sticky aside, and switches labelled on the left.

/** A white panel with a title row (`.panel` + `.card-h`); `aside` is the grey note on the right. */
export function FormSection({
  id,
  title,
  aside,
  children,
  flush,
  tone,
  className,
}: {
  id: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  /** No body padding (tables). */
  flush?: boolean;
  /** danger: the red-bordered "Delete event" panel. */
  tone?: 'danger';
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        'scroll-mt-20 overflow-hidden rounded-md border bg-white lg:scroll-mt-40',
        tone === 'danger' ? 'border-brand/35' : 'border-line',
        className,
      )}
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

/** A switch with its label on the left, the whole row clickable (`.sw`). */
export function SwitchRow({
  id,
  label,
  checked,
  onChange,
  disabled,
  className,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <label htmlFor={id} className="cursor-pointer text-small">
        {label}
      </label>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/**
 * Main column + 340 px aside from 1024 px; one column (aside first) on smaller screens. The canvas
 * aside is sticky, but ours (with Applications open) is taller than a laptop screen, so it scrolls.
 */
export function EditFormLayout({ main, aside }: { main: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">{main}</div>
      <aside className="order-1 flex flex-col gap-5 lg:order-2">{aside}</aside>
    </div>
  );
}
