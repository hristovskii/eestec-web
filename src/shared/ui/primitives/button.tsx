import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

// Buttons from the canvas Main frame: 48 px (lg), 40 px (sm), 52 px (xl: form submit, ApplyBox).
// Inside the admin (data-density="compact") every size becomes 36 px through --btn-h.
const buttonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-transparent',
    'leading-none font-medium whitespace-nowrap no-underline transition-colors',
    'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand',
    'disabled:cursor-not-allowed aria-disabled:pointer-events-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        primary:
          'border-brand bg-brand text-white hover:border-brand-dark hover:bg-brand-dark disabled:border-line disabled:bg-line disabled:text-muted-ink',
        // Text is #b81f24, not #e52a30: red text under 24 px must use the dark red (CLAUDE.md).
        secondary:
          'border-brand bg-white text-brand-dark hover:border-brand-dark hover:bg-brand-tint hover:text-brand-dark disabled:border-line-strong disabled:bg-white disabled:text-muted-ink',
        /** On red surfaces (hero, CTA bands). */
        inverse:
          'border-white bg-white text-brand-dark hover:border-surface hover:bg-surface hover:text-brand-dark focus-visible:outline-white',
        /** On red surfaces. */
        outlineWhite: 'border-white bg-transparent text-white hover:bg-white/15 focus-visible:outline-white',
        /** Neutral action (header menu, filters sheet). */
        quiet:
          'border border-line-strong bg-white text-ink hover:border-ink disabled:border-line disabled:bg-surface disabled:text-muted-ink',
        /** Admin delete confirmations. */
        danger: 'border-brand-dark bg-brand-dark text-white hover:border-ink hover:bg-ink',
        /** Admin bulk / row delete before the confirmation (AdminEvents). */
        dangerOutline:
          'border border-brand bg-white text-brand-dark hover:border-brand-dark hover:bg-brand-tint disabled:border-line disabled:text-muted-ink',
        ghost: 'bg-transparent text-ink hover:bg-surface disabled:bg-surface disabled:text-muted-ink',
      },
      size: {
        xl: 'h-[var(--control-h,52px)] px-8 text-body',
        lg: 'h-[var(--control-h,48px)] px-6 text-body',
        sm: 'h-[var(--control-h,40px)] px-4 text-small',
        icon: 'size-11 p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'lg' },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Link) with button styles. */
    asChild?: boolean;
  };

function Button({ className, variant, size, block, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  );
}

export { Button, buttonVariants, type ButtonProps };
