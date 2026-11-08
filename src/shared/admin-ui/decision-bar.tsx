import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * The bar with Reject and Approve under a preview (AdminApprovals, MobileDecisionBar). On phones it
 * stays at the bottom of the screen while the preview scrolls, so the decision is always in reach.
 */
export function DecisionBar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border-t border-divider bg-white px-4 py-3 lg:px-6',
        'max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:shadow-[0_-4px_12px_rgba(0,0,0,0.06)]',
        className,
      )}
      {...props}
    />
  );
}
