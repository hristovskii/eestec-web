import * as React from 'react';

import { cn } from '@/shared/lib/cn';

// Form field look from the canvas: 48 px, #8c8c8c border, red border + ring on focus,
// 2 px red border when invalid (aria-invalid), grey when disabled.
export const fieldControlClasses = cn(
  'w-full min-w-0 rounded-sm border border-line-input bg-white text-body text-ink',
  'transition-[border-color,box-shadow] outline-none placeholder:text-muted-ink',
  'focus-visible:border-brand focus-visible:shadow-[var(--focus-ring)]',
  'aria-invalid:border-2 aria-invalid:border-brand',
  'disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-surface disabled:text-muted-ink',
);

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldControlClasses, 'h-[var(--control-h,48px)] px-3.5', className)}
      {...props}
    />
  );
}

export { Input };
