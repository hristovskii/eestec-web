import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/** Max 1200 px content, 24 px side padding (16 px under 640). */
export function Container({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-[calc(1200px+48px)] px-4 sm:px-6', className)} {...props} />
  );
}

type SectionProps = React.ComponentProps<'section'> & {
  /** Alternate white / grey between sections. */
  tone?: 'white' | 'grey';
};

/** Page section with the 96 px (desktop) / 64 px (mobile) rhythm. */
export function Section({ tone = 'white', className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn('py-16 lg:py-24', tone === 'grey' ? 'bg-surface' : 'bg-white', className)}
      {...props}
    >
      <Container>{children}</Container>
    </section>
  );
}
