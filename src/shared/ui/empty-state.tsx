import { SearchX } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

type EmptyStateProps = {
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** Active filters as RemovableTags. */
  tags?: React.ReactNode;
  actions?: React.ReactNode;
  /** compact: dashed grey box (Main › Cards); page: centred white panel on list pages. */
  variant?: 'compact' | 'page';
  className?: string;
};

/** Every list has a designed empty state (decided rule). */
export function EmptyState({
  title,
  children,
  icon,
  tags,
  actions,
  variant = 'page',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        variant === 'compact'
          ? 'items-start rounded-md border border-dashed border-line-strong bg-surface px-6 py-7'
          : 'items-center rounded-lg border border-line bg-white px-6 py-12 text-center sm:py-16',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'text-brand',
          variant === 'page' && 'mb-1 flex size-16 items-center justify-center rounded-full bg-brand-tint',
        )}
      >
        {icon ?? <SearchX className="size-7" />}
      </span>
      {tags && <div className="flex flex-wrap justify-center gap-2">{tags}</div>}
      {title && <h2 className="type-h3">{title}</h2>}
      {children && (
        <div className={cn('text-body', variant === 'page' && 'max-w-[560px] text-muted-ink')}>
          {children}
        </div>
      )}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
