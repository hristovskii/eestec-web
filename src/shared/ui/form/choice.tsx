import * as React from 'react';

import { cn } from '@/shared/lib/cn';

// Native checkbox and radio, 20 px with the red accent (Main › Form fields).
// Native inputs: keyboard and screen-reader support for free, and they submit with the form.
const controlClass =
  'size-5 shrink-0 cursor-pointer accent-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand';

export function Checkbox({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return <input type="checkbox" className={cn(controlClass, className)} {...props} />;
}

export function Radio({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return <input type="radio" className={cn(controlClass, className)} {...props} />;
}

/** A checkbox or radio with its label on the right. */
export function ChoiceLabel({
  control,
  children,
  className,
}: {
  control: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-small', className)}>
      <span className="flex h-[21px] items-center">{control}</span>
      <span>{children}</span>
    </label>
  );
}
